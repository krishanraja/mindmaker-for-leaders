import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fetchWithTimeout } from '../_shared/with-timeout.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';
import { gatherCompanySignals } from '../_shared/company-signals.ts';
import { dossierFromRow } from '../_shared/onboarding-dossier.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINKEDIN_RE = /^https:\/\/(?:[a-z]{2,3}\.)?(?:www\.)?linkedin\.com\/in\/[a-z0-9_%-]+\/?(?:\?.*)?$/i;
const FREE_DOMAINS = new Set(['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'proton.me', 'protonmail.com']);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function fetchJson(url: string, headers: Record<string, string>, provider: string) {
  const response = await fetchWithTimeout(url, { headers, provider, timeoutMs: 6500 });
  if (!response.ok) return null;
  return await response.json().catch(() => null);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id ?? '').trim();
    const kind = body?.kind === 'linkedin' ? 'linkedin' : 'email';
    const email = String(body?.email ?? '').trim().toLowerCase().slice(0, 320);
    const linkedinInput = String(body?.linkedin ?? '').trim().slice(0, 1000);
    if (!id || (kind === 'email' ? !EMAIL_RE.test(email) : !LINKEDIN_RE.test(linkedinInput))) {
      return json({ error: 'Invalid enrichment request' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );
    const rate = await checkRateLimit(
      { identifier: 'onboarding-enrichment', maxRequests: 3, windowMs: 60 * 60 * 1000 },
      id,
      admin,
    );
    if (!rate.allowed) return json({ ok: true, status: 'recent' });

    await admin.from('cannes_responses').update({
      ...(kind === 'email' ? { email, email_captured_at: new Date().toISOString() } : {}),
      enrichment_kind: kind,
      enrichment_status: 'pending',
      enrichment_started_at: new Date().toISOString(),
      enrichment_raw_input: kind === 'email'
        ? { kind, domain: email.split('@')[1] }
        : { kind, linkedin: linkedinInput },
    }).eq('id', id);

    const domainFromEmail = kind === 'email' ? email.split('@')[1] ?? '' : '';
    const businessDomain = FREE_DOMAINS.has(domainFromEmail) ? null : domainFromEmail;
    const providers: string[] = [];
    let name: string | null = null;
    let role: string | null = null;
    let company: string | null = null;
    let companyDomain: string | null = businessDomain;
    let linkedinUrl: string | null = null;
    let companyBlurb: string | null = null;
    let logoUrl: string | null = null;
    let brandColors: string[] = [];

    const pdlKey = Deno.env.get('PEOPLE_DATA_LABS_API_KEY');
    if (pdlKey) {
      try {
        const pdl = await fetchJson(
          `https://api.peopledatalabs.com/v5/person/enrich?${kind === 'email' ? `email=${encodeURIComponent(email)}` : `profile=${encodeURIComponent(linkedinInput)}`}&min_likelihood=6&titlecase=true`,
          { 'X-Api-Key': pdlKey, accept: 'application/json' },
          'pdl',
        );
        const person = pdl?.status === 200 ? pdl.data : null;
        if (person) {
          providers.push('pdl');
          name = person.full_name ?? null;
          role = person.job_title ?? null;
          company = person.job_company_name ?? null;
          linkedinUrl = person.linkedin_url ?? null;
          const website = String(person.job_company_website ?? '').replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
          companyDomain = website || companyDomain;
        }
      } catch {
        // Missing enrichment is not a failed onboarding.
      }
    }

    const brandfetchKey = Deno.env.get('BRANDFETCH_API_KEY');
    if (brandfetchKey && companyDomain) {
      try {
        const brand = await fetchJson(
          `https://api.brandfetch.io/v2/brands/${encodeURIComponent(companyDomain)}`,
          { Authorization: `Bearer ${brandfetchKey}`, accept: 'application/json' },
          'brandfetch',
        );
        if (brand) {
          providers.push('brandfetch');
          company = company || brand.name || null;
          companyBlurb = brand.longDescription || brand.description || null;
          logoUrl = brand.logos?.[0]?.formats?.find((format: { src?: string }) => format?.src)?.src ?? null;
          brandColors = (brand.colors ?? []).map((color: { hex?: string }) => color?.hex).filter(Boolean).slice(0, 4);
        }
      } catch {
        // Company colour is useful, never load-bearing.
      }
    }

    const signalResult = company
      ? await gatherCompanySignals({
          companyName: company,
          domain: companyDomain,
          tavilyKey: Deno.env.get('TAVILY_API_KEY'),
          braveKey: Deno.env.get('BRAVE_SEARCH_API'),
        }).catch(() => ({ signals: [], providers: [] }))
      : { signals: [], providers: [] };
    providers.push(...signalResult.providers.filter((provider) => !providers.includes(provider)));

    const ready = Boolean(name || role || company || companyBlurb || signalResult.signals.length);
    const update = {
      enrichment_status: ready ? 'ready' : 'thin',
      enrichment_name: name,
      enrichment_role: role,
      enrichment_company: company,
      enrichment_company_blurb: companyBlurb,
      resolved_linkedin_url: linkedinUrl,
      resolution_confidence: providers.includes('pdl') ? 'high' : ready ? 'medium' : 'low',
      resolution_provenance: { identity: providers.includes('pdl') ? 'pdl' : null, company: providers.includes('brandfetch') ? 'brandfetch' : providers.includes('pdl') ? 'pdl' : businessDomain ? 'email_domain' : null },
      providers_hit: providers,
      company_domain: companyDomain,
      company_context: { logoUrl, brandColors },
      enrichment_signals: signalResult.signals,
      enrichment_completed_at: new Date().toISOString(),
    };
    await admin.from('cannes_responses').update(update).eq('id', id);
    return json({ ok: true, status: ready ? 'ready' : 'thin', dossier: dossierFromRow(update) });
  } catch {
    return json({ ok: false, status: 'failed' }, 200);
  }
});
