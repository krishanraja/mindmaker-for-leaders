export interface OnboardingSignal {
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
  excerpt: string;
  sourceCount: number;
  verified: boolean;
}

export interface OnboardingDossier {
  status: 'pending' | 'ready' | 'thin' | 'failed';
  person: {
    name: string | null;
    role: string | null;
    linkedinUrl: string | null;
  };
  company: {
    name: string | null;
    domain: string | null;
    summary: string | null;
    logoUrl: string | null;
  };
  signals: OnboardingSignal[];
  strength: {
    providerCount: number;
    signalCount: number;
    verifiedSignalCount: number;
    newestSignalAt: string | null;
  };
}

interface DossierRow {
  enrichment_status?: string | null;
  enrichment_name?: string | null;
  enrichment_role?: string | null;
  enrichment_company?: string | null;
  enrichment_company_blurb?: string | null;
  resolved_linkedin_url?: string | null;
  company_domain?: string | null;
  company_context?: unknown;
  enrichment_signals?: unknown;
  providers_hit?: unknown;
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim().slice(0, max);
  return cleaned || null;
}

function safeUrl(value: unknown): string | null {
  const cleaned = cleanText(value, 1000);
  if (!cleaned) return null;
  try {
    const url = new URL(cleaned);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function dossierFromRow(row: DossierRow | null | undefined): OnboardingDossier {
  const rawSignals = Array.isArray(row?.enrichment_signals) ? row.enrichment_signals : [];
  const signals = rawSignals.flatMap((item): OnboardingSignal[] => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as Record<string, unknown>;
    const title = cleanText(candidate.title, 180);
    const url = safeUrl(candidate.url);
    const source = cleanText(candidate.source, 100);
    if (!title || !url || !source) return [];
    const published = cleanText(candidate.publishedAt, 80);
    const publishedAt = published && Number.isFinite(Date.parse(published))
      ? new Date(published).toISOString()
      : null;
    return [{
      title,
      url,
      source,
      publishedAt,
      excerpt: cleanText(candidate.excerpt, 320) ?? '',
      sourceCount: Math.max(1, Math.min(20, Math.round(Number(candidate.sourceCount) || 1))),
      verified: candidate.verified === true,
    }];
  }).slice(0, 3);
  const context = row?.company_context && typeof row.company_context === 'object'
    ? row.company_context as Record<string, unknown>
    : {};
  const providers = Array.isArray(row?.providers_hit) ? row.providers_hit : [];
  const newestSignalAt = signals
    .map((signal) => signal.publishedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
  const rawStatus = row?.enrichment_status;
  const status: OnboardingDossier['status'] = rawStatus === 'pending'
    ? 'pending'
    : rawStatus === 'failed'
      ? 'failed'
      : rawStatus === 'ready'
        ? 'ready'
        : 'thin';

  return {
    status,
    person: {
      name: cleanText(row?.enrichment_name, 160),
      role: cleanText(row?.enrichment_role, 180),
      linkedinUrl: safeUrl(row?.resolved_linkedin_url),
    },
    company: {
      name: cleanText(row?.enrichment_company, 180),
      domain: cleanText(row?.company_domain, 255),
      summary: cleanText(row?.enrichment_company_blurb, 520),
      logoUrl: safeUrl(context.logoUrl),
    },
    signals,
    strength: {
      providerCount: providers.length,
      signalCount: signals.length,
      verifiedSignalCount: signals.filter((signal) => signal.verified).length,
      newestSignalAt,
    },
  };
}
