import { fetchWithTimeout } from './with-timeout.ts';
import type { OnboardingSignal } from './onboarding-dossier.ts';

interface RawCompanySignal {
  title: string;
  url: string;
  excerpt: string;
  publishedAt: string | null;
  source: string;
}

function clean(value: unknown, max: number): string {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function hostOf(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function isoDate(value: unknown): string | null {
  const parsed = Date.parse(String(value ?? ''));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function tokens(value: string): Set<string> {
  return new Set(value.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((word) => word.length > 3));
}

function similarity(left: string, right: string): number {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / Math.min(a.size, b.size);
}

function companyNeedles(companyName: string, domain: string | null): string[] {
  const domainWord = (domain ?? '').split('.')[0]?.replace(/[^a-z0-9]/gi, ' ').trim();
  return [companyName, domainWord]
    .map((value) => value.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((value) => value.length >= 4);
}

function isCompanyMatch(signal: RawCompanySignal, companyName: string, domain: string | null): boolean {
  const host = hostOf(signal.url);
  if (domain && (host === domain || host.endsWith(`.${domain}`))) return true;
  const haystack = `${signal.title} ${signal.excerpt} ${host}`.toLowerCase().replace(/[^a-z0-9]/g, ' ');
  return companyNeedles(companyName, domain).some((needle) => haystack.includes(needle));
}

async function tavilySignals(apiKey: string, query: string): Promise<RawCompanySignal[]> {
  const response = await fetchWithTimeout('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      topic: 'news',
      days: 45,
      max_results: 8,
      include_answer: false,
    }),
    provider: 'tavily-company-signals',
    timeoutMs: 6500,
    retry: false,
  });
  if (!response.ok) return [];
  const body = await response.json().catch(() => null) as { results?: Array<Record<string, unknown>> } | null;
  return (body?.results ?? []).flatMap((item): RawCompanySignal[] => {
    const title = clean(item.title, 180);
    const url = clean(item.url, 1000);
    const source = hostOf(url);
    if (!title || !url.startsWith('https://') || !source) return [];
    return [{
      title,
      url,
      source,
      excerpt: clean(item.content, 320),
      publishedAt: isoDate(item.published_date),
    }];
  });
}

async function braveSignals(apiKey: string, query: string): Promise<RawCompanySignal[]> {
  const params = new URLSearchParams({
    q: query,
    freshness: 'pm',
    count: '8',
    search_lang: 'en',
  });
  const response = await fetchWithTimeout(`https://api.search.brave.com/res/v1/news/search?${params}`, {
    headers: { 'Accept-Encoding': 'gzip', 'X-Subscription-Token': apiKey },
    provider: 'brave-company-signals',
    timeoutMs: 6500,
    retry: false,
  });
  if (!response.ok) return [];
  const body = await response.json().catch(() => null) as { results?: Array<Record<string, unknown>> } | null;
  return (body?.results ?? []).flatMap((item): RawCompanySignal[] => {
    const title = clean(item.title, 180);
    const url = clean(item.url, 1000);
    const source = clean((item.meta_url as { hostname?: unknown } | undefined)?.hostname, 100) || hostOf(url);
    if (!title || !url.startsWith('https://') || !source) return [];
    return [{
      title,
      url,
      source,
      excerpt: clean(item.description, 320),
      publishedAt: isoDate(item.page_age ?? item.age),
    }];
  });
}

export async function gatherCompanySignals(input: {
  companyName: string;
  domain: string | null;
  tavilyKey?: string | null;
  braveKey?: string | null;
}): Promise<{ signals: OnboardingSignal[]; providers: string[] }> {
  const query = `"${input.companyName}" ${input.domain ?? ''} company news announcement launch funding hiring`.trim();
  const tasks: Array<Promise<{ provider: string; items: RawCompanySignal[] }>> = [];
  if (input.tavilyKey) tasks.push(tavilySignals(input.tavilyKey, query).then((items) => ({ provider: 'tavily', items })));
  if (input.braveKey) tasks.push(braveSignals(input.braveKey, query).then((items) => ({ provider: 'brave', items })));
  const settled = await Promise.allSettled(tasks);
  const providers: string[] = [];
  const candidates: RawCompanySignal[] = [];
  for (const result of settled) {
    if (result.status !== 'fulfilled' || result.value.items.length === 0) continue;
    providers.push(result.value.provider);
    candidates.push(...result.value.items.filter((item) => isCompanyMatch(item, input.companyName, input.domain)));
  }

  const clusters: RawCompanySignal[][] = [];
  for (const candidate of candidates) {
    const cluster = clusters.find((items) => items.some((item) => similarity(item.title, candidate.title) >= 0.52));
    if (cluster) cluster.push(candidate);
    else clusters.push([candidate]);
  }

  const signals = clusters
    .map((cluster): OnboardingSignal => {
      const representative = [...cluster].sort((a, b) => Number(Boolean(b.publishedAt)) - Number(Boolean(a.publishedAt)))[0];
      const independentSources = new Set(cluster.map((item) => item.source)).size;
      return {
        ...representative,
        sourceCount: Math.max(1, independentSources),
        verified: independentSources >= 2,
      };
    })
    .sort((a, b) => {
      if (a.verified !== b.verified) return Number(b.verified) - Number(a.verified);
      return Date.parse(b.publishedAt ?? '') - Date.parse(a.publishedAt ?? '');
    })
    .slice(0, 3);

  return { signals, providers };
}
