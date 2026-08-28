export const VIDEO_RADAR_SCHEMA_VERSION = 1 as const;

export interface CachedHeadline {
  id: string;
  headline: string;
  say: string | null;
  pov?: string | null;
  source: string | null;
  sourceCount: number;
  url: string;
  category: string;
  score: number;
}

export interface CachedTrend {
  id: string;
  detected_on: string;
  category: string;
  title: string;
  summary: string;
  implication: string;
  evidence: Array<{ headline?: string; source?: string; url?: string; date?: string }>;
  source_count: number;
  momentum: number;
}

export interface VideoRadarCandidate {
  id: string;
  title: string;
  summary: string;
  source_kind: "public_signal";
  sensitivity: "public";
  occurred_at: string;
  source_urls: string[];
  corroboration: number;
  evidence_status: "public_grounded";
  category: string;
  source_ref_hash: string;
  provider_score?: number;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isoDate(value: string): string {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date(0).toISOString();
}

export async function headlineToRadar(card: CachedHeadline, briefingDate: string): Promise<VideoRadarCandidate | null> {
  if (!validUrl(card.url) || !card.headline.trim()) return null;
  const reference = await sha256(`headline:${card.id}:${card.url}`);
  return {
    id: `mm:${reference.slice(0, 24)}`,
    title: card.headline.trim(),
    summary: (card.say || card.pov || card.headline).trim(),
    source_kind: "public_signal",
    sensitivity: "public",
    occurred_at: isoDate(briefingDate),
    source_urls: [card.url],
    corroboration: Math.max(1, Math.round(card.sourceCount || 1)),
    evidence_status: "public_grounded",
    category: card.category || "ai_native",
    source_ref_hash: reference,
    provider_score: Number.isFinite(card.score) ? card.score : 0,
  };
}

export async function trendToRadar(trend: CachedTrend): Promise<VideoRadarCandidate | null> {
  const urls = [...new Set((trend.evidence || []).map((item) => item.url).filter(validUrl))];
  if (!trend.title.trim() || urls.length === 0) return null;
  const reference = await sha256(`trend:${trend.id}:${urls.join("|")}`);
  const dates = (trend.evidence || []).map((item) => item.date).filter((date): date is string => Boolean(date)).map(Date.parse).filter(Number.isFinite);
  const occurredAt = dates.length ? new Date(Math.max(...dates)).toISOString() : isoDate(trend.detected_on);
  return {
    id: `mm-trend:${reference.slice(0, 24)}`,
    title: trend.title.trim(),
    summary: `${trend.summary.trim()} ${trend.implication.trim()}`.trim(),
    source_kind: "public_signal",
    sensitivity: "public",
    occurred_at: occurredAt,
    source_urls: urls,
    corroboration: Math.max(urls.length, Math.round(trend.source_count || 0)),
    evidence_status: "public_grounded",
    category: trend.category || "structural_shift",
    source_ref_hash: reference,
    provider_score: Number.isFinite(trend.momentum) ? trend.momentum : 0,
  };
}

export async function buildVideoRadarCandidates(headlines: CachedHeadline[], briefingDate: string, trends: CachedTrend[], limit: number): Promise<VideoRadarCandidate[]> {
  const mapped = await Promise.all([
    ...headlines.map((headline) => headlineToRadar(headline, briefingDate)),
    ...trends.map(trendToRadar),
  ]);
  return mapped
    .filter((candidate): candidate is VideoRadarCandidate => candidate !== null)
    .sort((a, b) => (b.provider_score || 0) - (a.provider_score || 0))
    .slice(0, limit);
}
