/** Pure, deterministic gates for generated Blind Spot observations. */

export type BlindSpotSourceKind =
  | 'memory'
  | 'decision'
  | 'decision_case'
  | 'mission'
  | 'check_in';

export interface BlindSpotSource {
  sourceId: string;
  sourceKind: BlindSpotSourceKind;
  label: string;
  excerpt: string;
  observedAt: string;
  updatedAt: string;
  eligibleAsIntention: boolean;
  eligibleAsRecurrence: boolean;
}

export interface BlindSpotAnchor {
  sourceId: string;
  sourceKind: BlindSpotSourceKind;
  label: string;
  excerpt: string;
  observedAt: string;
  role: 'intention' | 'recurrence';
}

export interface BlindSpotCandidateV2 {
  kind: 'pattern' | 'tension';
  headline: string;
  explanation: string;
  evidenceStrength: {
    signalCount: number;
    sourceTypeCount: number;
    windowDays: number | null;
  };
  intention: BlindSpotAnchor | null;
  recurrence: BlindSpotAnchor[];
  question: string;
  experiment: {
    title: string;
    instruction: string;
    checkInPrompt: string;
    durationMinutes: number;
  } | null;
}

export interface PatternQualification {
  qualifies: boolean;
  reason:
    | 'qualified'
    | 'missing_intention'
    | 'insufficient_recurrence'
    | 'stale_source'
    | 'insufficient_independence';
  signalCount: number;
  sourceTypeCount: number;
  windowDays: number | null;
}

export const BLIND_SPOT_MAX_SOURCE_AGE_DAYS = 180;
export const BLIND_SPOT_MIN_SEPARATION_DAYS = 7;

const STOP_WORDS = new Set([
  'about', 'after', 'again', 'against', 'being', 'company', 'could', 'every',
  'first', 'their', 'there', 'these', 'thing', 'those', 'through', 'under',
  'until', 'where', 'which', 'while', 'would', 'yourself',
]);

function stem(word: string): string {
  if (word.length > 7 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 6 && word.endsWith('ed')) return word.slice(0, -2);
  if (word.length > 6 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 5 && word.endsWith('s')) return word.slice(0, -1);
  return word;
}

export function significantWords(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map(stem)
      .filter((word) => word.length >= 5 && !STOP_WORDS.has(word)),
  );
}

export function cleanBlindSpotText(value: unknown, maxLength: number): string {
  return String(value ?? '')
    .replace(/[\u2013\u2014]/g, ', ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function headlineWithinBudget(value: string, maxWords = 8): boolean {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.length <= maxWords && value.length <= 96;
}

function daysBetween(left: string, right: string): number | null {
  const leftMs = Date.parse(left);
  const rightMs = Date.parse(right);
  if (!Number.isFinite(leftMs) || !Number.isFinite(rightMs)) return null;
  return Math.floor(Math.abs(rightMs - leftMs) / 86_400_000);
}

export function isFreshBlindSpotSource(
  source: BlindSpotSource,
  now = new Date(),
  maxAgeDays = BLIND_SPOT_MAX_SOURCE_AGE_DAYS,
): boolean {
  const observedMs = Date.parse(source.observedAt);
  if (!Number.isFinite(observedMs) || observedMs > now.getTime() + 86_400_000) return false;
  return now.getTime() - observedMs <= maxAgeDays * 86_400_000;
}

export function qualifyBlindSpotPattern(
  intention: BlindSpotSource | null,
  recurrence: BlindSpotSource[],
  now = new Date(),
): PatternQualification {
  const distinctRecurrence = [...new Map(
    recurrence
      .filter((source) => source.eligibleAsRecurrence)
      .map((source) => [`${source.sourceKind}:${source.sourceId}`, source]),
  ).values()];
  const allSources = [...(intention ? [intention] : []), ...distinctRecurrence];
  const sourceKinds = new Set(distinctRecurrence.map((source) => source.sourceKind));
  const observedTimes = allSources
    .map((source) => Date.parse(source.observedAt))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const windowDays = observedTimes.length >= 2
    ? Math.floor((observedTimes[observedTimes.length - 1] - observedTimes[0]) / 86_400_000)
    : null;
  const strength = {
    signalCount: allSources.length,
    sourceTypeCount: new Set(allSources.map((source) => source.sourceKind)).size,
    windowDays,
  };

  if (!intention?.eligibleAsIntention) return { qualifies: false, reason: 'missing_intention', ...strength };
  if (distinctRecurrence.length < 2) return { qualifies: false, reason: 'insufficient_recurrence', ...strength };
  if (allSources.some((source) => !isFreshBlindSpotSource(source, now))) {
    return { qualifies: false, reason: 'stale_source', ...strength };
  }

  const recurrenceDates = distinctRecurrence.map((source) => source.observedAt);
  const separated = recurrenceDates.some((left, index) => (
    recurrenceDates.slice(index + 1).some((right) => (daysBetween(left, right) ?? 0) >= BLIND_SPOT_MIN_SEPARATION_DAYS)
  ));
  if (sourceKinds.size < 2 && !separated) {
    return { qualifies: false, reason: 'insufficient_independence', ...strength };
  }

  return { qualifies: true, reason: 'qualified', ...strength };
}

export function selectSourcesById(
  sources: BlindSpotSource[],
  intentionSourceId: unknown,
  recurrenceSourceIds: unknown,
): { intention: BlindSpotSource | null; recurrence: BlindSpotSource[] } {
  const sourceMap = new Map(sources.map((source) => [source.sourceId, source]));
  const intentionId = cleanBlindSpotText(intentionSourceId, 80);
  const intention = sourceMap.get(intentionId) ?? null;
  const recurrence = (Array.isArray(recurrenceSourceIds) ? recurrenceSourceIds : [])
    .map((value) => sourceMap.get(cleanBlindSpotText(value, 80)))
    .filter((source): source is BlindSpotSource => Boolean(source))
    .filter((source, index, array) => array.findIndex((item) => item.sourceId === source.sourceId) === index)
    .slice(0, 4);
  return { intention, recurrence };
}

function sourceToAnchor(source: BlindSpotSource, role: BlindSpotAnchor['role']): BlindSpotAnchor {
  return {
    sourceId: source.sourceId,
    sourceKind: source.sourceKind,
    label: cleanBlindSpotText(source.label, 80),
    excerpt: cleanBlindSpotText(source.excerpt, 180),
    observedAt: source.observedAt,
    role,
  };
}

export function buildBlindSpotCandidate(
  model: Record<string, unknown>,
  sources: BlindSpotSource[],
  now = new Date(),
): BlindSpotCandidateV2 {
  const selected = selectSourcesById(
    sources,
    model.intention_source_id,
    model.recurrence_source_ids,
  );
  const fallbackIntention = sources.find((source) => source.eligibleAsIntention) ?? null;
  const intention = selected.intention?.eligibleAsIntention ? selected.intention : fallbackIntention;
  const recurrence = selected.recurrence.filter((source) => source.eligibleAsRecurrence);
  const qualification = qualifyBlindSpotPattern(intention, recurrence, now);
  const requestedHeadline = cleanBlindSpotText(model.headline, 96);
  const headline = headlineWithinBudget(requestedHeadline)
    ? requestedHeadline
    : qualification.qualifies
      ? 'Your intention and follow-through are drifting.'
      : 'There is a tension worth checking.';
  const explanation = cleanBlindSpotText(
    model.explanation,
    240,
  ) || (qualification.qualifies
    ? 'What you said matters and what keeps recurring are pulling in different directions.'
    : 'The evidence is not repeated enough to call this a pattern yet.');
  const question = cleanBlindSpotText(model.question, 240)
    || 'What context would change how I should read this?';

  const experimentTitle = cleanBlindSpotText(model.experiment_title, 80);
  const experimentInstruction = cleanBlindSpotText(model.experiment_instruction, 240);
  const checkInPrompt = cleanBlindSpotText(model.experiment_check_in_prompt, 180);
  const requestedDuration = Math.round(Number(model.experiment_duration_minutes));
  const experiment = qualification.qualifies && experimentTitle && experimentInstruction && checkInPrompt
    ? {
        title: experimentTitle,
        instruction: experimentInstruction,
        checkInPrompt,
        durationMinutes: Math.min(15, Math.max(5, Number.isFinite(requestedDuration) ? requestedDuration : 15)),
      }
    : null;

  return {
    kind: qualification.qualifies && experiment ? 'pattern' : 'tension',
    headline,
    explanation,
    evidenceStrength: {
      signalCount: qualification.signalCount,
      sourceTypeCount: qualification.sourceTypeCount,
      windowDays: qualification.windowDays,
    },
    intention: intention ? sourceToAnchor(intention, 'intention') : null,
    recurrence: recurrence.map((source) => sourceToAnchor(source, 'recurrence')),
    question,
    experiment: qualification.qualifies ? experiment : null,
  };
}

export function canonicalCandidatePayload(
  candidate: BlindSpotCandidateV2,
  anchorFingerprint: string,
): string {
  return JSON.stringify({
    anchorFingerprint,
    kind: candidate.kind,
    headline: candidate.headline,
    explanation: candidate.explanation,
    evidenceStrength: candidate.evidenceStrength,
    intention: candidate.intention,
    recurrence: candidate.recurrence,
    question: candidate.question,
    experiment: candidate.experiment,
  });
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function fingerprintBlindSpotSources(sources: BlindSpotSource[]): Promise<string> {
  const canonical = sources
    .map((source) => ({
      sourceId: source.sourceId,
      sourceKind: source.sourceKind,
      updatedAt: source.updatedAt,
      excerpt: source.excerpt,
    }))
    .sort((left, right) => `${left.sourceKind}:${left.sourceId}`.localeCompare(`${right.sourceKind}:${right.sourceId}`));
  return sha256(JSON.stringify(canonical));
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function signBlindSpotCandidate(
  candidate: BlindSpotCandidateV2,
  anchorFingerprint: string,
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(canonicalCandidatePayload(candidate, anchorFingerprint)),
  );
  return base64Url(new Uint8Array(signature));
}

export async function verifyBlindSpotCandidateSignature(
  candidate: BlindSpotCandidateV2,
  anchorFingerprint: string,
  secret: string,
  signature: string,
): Promise<boolean> {
  const expected = await signBlindSpotCandidate(candidate, anchorFingerprint, secret);
  if (expected.length !== signature.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  }
  return difference === 0;
}
