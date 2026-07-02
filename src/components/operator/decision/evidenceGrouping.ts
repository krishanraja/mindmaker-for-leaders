/**
 * evidenceGrouping - turn a flat stance section (30-40 sources) into a small set of NESTED
 * categories so the evidence drawer reads as a few tappable headings instead of one long scroll.
 *
 * Hybrid, honest by construction:
 *  - Forward-looking: the decision-engine adjudicator now stamps a short `theme` on each evidence
 *    row (verify.ts), so like sources already carry a real, LLM-assigned category. We group by that.
 *  - Works on everything now: rows with no theme (decisions run before the change, and the
 *    research-mode gathers that never pass the adjudicator) are clustered client-side by
 *    significant-token overlap (the same Jaccard idea as the Home news clusterer), with a label
 *    derived from their most frequent content words.
 *
 * Pure + deterministic so it is unit-testable and the drawer render stays a thin consumer.
 */

import type { DecisionEvidence } from '@/hooks/useDecisionEngine';
import { cleanEvidenceText } from './decisionParts';

export interface EvidenceGroup {
  /** '' for a single flat passthrough group (the caller renders it without a sub-header). */
  label: string;
  rows: DecisionEvidence[];
}

// Below this many rows a stance section is short enough to stay flat - nesting would only add chrome.
export const MIN_TO_GROUP = 6;
// Two sources are "the same kind of point" at or above this title-token similarity.
export const CLUSTER_THRESHOLD = 0.5;

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'for', 'to', 'of', 'in', 'on', 'at',
  'by', 'with', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'it',
  'its', 'this', 'that', 'these', 'those', 'new', 'now', 'how', 'why', 'what',
  'who', 'will', 'can', 'could', 'should', 'would', 'has', 'have', 'had', 'you',
  'your', 'we', 'our', 'they', 'their', 'than', 'into', 'over', 'per', 'more',
  'less', 'about', 'which', 'when', 'costs', 'cost', 'model', 'models', 'source',
]);

function scoreOf(e: DecisionEvidence): number {
  return typeof e.evidence_score === 'number' ? e.evidence_score : 0;
}

function evidenceText(e: DecisionEvidence): string {
  return cleanEvidenceText(e.key_point) || cleanEvidenceText(e.excerpt) || cleanEvidenceText(e.source_title) || '';
}

function tokens(text: string): Set<string> {
  const toks = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  return new Set(toks);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** A short Title Case label from a group's most frequent significant tokens. */
function deriveLabel(rows: DecisionEvidence[]): string {
  const freq = new Map<string, number>();
  for (const r of rows) for (const t of tokens(evidenceText(r))) freq.set(t, (freq.get(t) ?? 0) + 1);
  const top = [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 2)
    .map(([t]) => t.charAt(0).toUpperCase() + t.slice(1));
  return top.length ? top.join(' ') : 'Related sources';
}

/** Greedy token clustering for un-themed rows; orphans (singletons) collapse into one bucket. */
function clusterUnthemed(rows: DecisionEvidence[]): EvidenceGroup[] {
  const ranked = [...rows].sort((a, b) => scoreOf(b) - scoreOf(a));
  const clusters: { toks: Set<string>; rows: DecisionEvidence[] }[] = [];
  for (const e of ranked) {
    const toks = tokens(evidenceText(e));
    let placed = false;
    for (const c of clusters) {
      if (jaccard(toks, c.toks) >= CLUSTER_THRESHOLD) {
        c.rows.push(e);
        for (const t of toks) c.toks.add(t);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push({ toks, rows: [e] });
  }
  const out: EvidenceGroup[] = [];
  const orphans: DecisionEvidence[] = [];
  for (const c of clusters) {
    if (c.rows.length >= 2) out.push({ label: deriveLabel(c.rows), rows: c.rows });
    else orphans.push(c.rows[0]);
  }
  if (orphans.length) out.push({ label: orphans.length === 1 ? 'Other source' : 'Other sources', rows: orphans });
  return out;
}

/**
 * Group one stance section's evidence into nested categories. Returns a SINGLE group with an empty
 * label when the section is short enough to stay flat or does not consolidate into >1 category -
 * the caller treats a one-group result as "render flat".
 */
export function groupEvidence(rows: DecisionEvidence[]): EvidenceGroup[] {
  const sorted = [...rows].sort((a, b) => scoreOf(b) - scoreOf(a));
  const flat: EvidenceGroup[] = [{ label: '', rows: sorted }];
  if (sorted.length <= MIN_TO_GROUP) return flat;

  const themed = sorted.filter((e) => (e.theme ?? '').trim());
  const unthemed = sorted.filter((e) => !(e.theme ?? '').trim());

  const groups: EvidenceGroup[] = [];
  // Trust the adjudicator's labels: group themed rows by exact (case-insensitive) theme.
  const byTheme = new Map<string, EvidenceGroup>();
  for (const e of themed) {
    const label = (e.theme as string).trim();
    const key = label.toLowerCase();
    const g = byTheme.get(key) ?? { label, rows: [] };
    g.rows.push(e);
    byTheme.set(key, g);
  }
  for (const g of byTheme.values()) groups.push(g);
  // Cluster the rest (old rows / research gathers) client-side.
  if (unthemed.length) groups.push(...clusterUnthemed(unthemed));

  groups.forEach((g) => g.rows.sort((a, b) => scoreOf(b) - scoreOf(a)));
  groups.sort((a, b) => scoreOf(b.rows[0]) - scoreOf(a.rows[0]));

  return groups.length > 1 ? groups : flat;
}
