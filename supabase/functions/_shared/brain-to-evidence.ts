/**
 * brain-to-evidence: turn what CTRL already holds about a leader into stage-1
 * candidates for the harness chain.
 *
 * WHY THIS IS NOT AN LLM PASS
 *
 * ingest-evidence exists to mine raw prose, so it needs a model to find the
 * claims inside it. A user_memory row is not raw prose. It has already been
 * extracted, categorised, scored for importance and, for some rows, confirmed
 * by the leader. Running a second model over it would add a fabrication surface
 * and nothing else, so this composes the source document and computes every
 * offset arithmetically. The quote for fact N is source.slice(start, end) by
 * construction rather than by hope, which is the same guarantee CH-13 asks for,
 * obtained for free.
 *
 * WHAT THIS IS NOT ALLOWED TO DO
 *
 * A held fact is a CANDIDATE, never a rule. ctrl-intake's first rule is that a
 * transcript produces candidates and only grading produces rules, and a fact
 * mined from memory is exactly a transcript's output wearing a nicer shape. So
 * every row here is situated = true, carries the situation it came from, and
 * every construct is status 'candidate' with NO contrast_pole. The sort makes
 * the second pole. Nothing in this file may write a standing row; the schema
 * would refuse it anyway (standing_requires_promotion), and that is deliberate.
 *
 * The FK evidence.memory_fact_id has existed since the spine migration with no
 * writer. This is the writer. It is what lets a rule in a built skill be traced
 * back to the fact in the brain that suggested it.
 */

/** A user_memory row, narrowed to the columns this module reads. */
export interface BrainFact {
  id: string;
  fact_label: string | null;
  fact_value: string | null;
  fact_category: string | null;
  fact_subtype?: string | null;
  importance?: number | null;
  confidence_score?: number | null;
  verification_status?: string | null;
  source_type?: string | null;
  created_at?: string | null;
}

/** A decision the leader actually put through the engine. */
export interface BrainDecision {
  id: string;
  statement: string | null;
  created_at?: string | null;
}

export interface ComposedEvidence {
  /** Index into the composed body. quote === body.slice(quoteStart, quoteEnd). */
  quoteStart: number;
  quoteEnd: number;
  quote: string;
  /** Where this came from, in words, for the situation column. */
  situation: string;
  /** Set for facts; null for decisions, which are not user_memory rows. */
  memoryFactId: string | null;
  /** The construct this evidence is a candidate for. */
  emergentPole: string;
}

export interface ComposedSource {
  /** Stored byte-exact in evidence_sources.body; every offset indexes this. */
  body: string;
  label: string;
  items: ComposedEvidence[];
}

/** Rows below this confidence are too weak to be worth grading time. */
const MIN_CONFIDENCE = 0.4;
/** ingest-evidence caps a source at 60k because offsets index the stored string. */
export const MAX_SOURCE_CHARS = 60000;

/**
 * How a fact's category reads as a candidate dimension. These are the leader's
 * own axes, not ours: the pole is the fact's label, which came from their own
 * words via extract-user-context. We never invent the axis, per ctrl-intake
 * rule 2 ("never supply the dimension").
 */
function situationFor(fact: BrainFact): string {
  const how =
    fact.verification_status === 'verified' || fact.verification_status === 'corrected'
      ? 'confirmed by them'
      : 'inferred from something they said';
  const where = fact.source_type ? ` via ${fact.source_type}` : '';
  return `held in their memory as a ${fact.fact_category ?? 'fact'}, ${how}${where}`;
}

function usable(fact: BrainFact): boolean {
  if (!fact.fact_value || !fact.fact_value.trim()) return false;
  // A rejected or disputed fact is one the leader has already ruled out. Mining
  // it back in would re-introduce exactly what the correction loop removed.
  if (fact.verification_status === 'rejected' || fact.verification_status === 'disputed') return false;
  if (typeof fact.confidence_score === 'number' && fact.confidence_score < MIN_CONFIDENCE) return false;
  return true;
}

/** Strongest first, so a truncated source keeps the facts that matter most. */
function byWeight(a: BrainFact, b: BrainFact): number {
  const ai = a.importance ?? 5;
  const bi = b.importance ?? 5;
  if (ai !== bi) return bi - ai;
  return (b.confidence_score ?? 0) - (a.confidence_score ?? 0);
}

/**
 * Compose one source document from the leader's held facts and weighed
 * decisions, with an exact offset for every quote.
 *
 * The body is human-readable on purpose. It is stored and can be shown back to
 * the leader, and a source they cannot read is a source they cannot dispute.
 */
export function composeBrainSource(
  facts: BrainFact[],
  decisions: BrainDecision[] = [],
  opts: { maxChars?: number } = {},
): ComposedSource {
  const maxChars = opts.maxChars ?? MAX_SOURCE_CHARS;
  const items: ComposedEvidence[] = [];
  let body = '';

  const append = (heading: string, quote: string, meta: Omit<ComposedEvidence, 'quoteStart' | 'quoteEnd' | 'quote'>) => {
    const prefix = `${heading}\n`;
    const block = `${prefix}${quote}\n\n`;
    if (body.length + block.length > maxChars) return false;
    const quoteStart = body.length + prefix.length;
    body += block;
    items.push({ ...meta, quote, quoteStart, quoteEnd: quoteStart + quote.length });
    return true;
  };

  for (const fact of [...facts].filter(usable).sort(byWeight)) {
    const label = (fact.fact_label ?? fact.fact_category ?? 'About them').trim();
    const value = (fact.fact_value ?? '').trim();
    const ok = append(`## ${label}`, value, {
      situation: situationFor(fact),
      memoryFactId: fact.id,
      emergentPole: label,
    });
    if (!ok) break;
  }

  for (const d of decisions) {
    const statement = (d.statement ?? '').trim();
    if (!statement) continue;
    const ok = append('## A decision they weighed', statement, {
      situation: 'a decision they put through the engine themselves',
      memoryFactId: null,
      emergentPole: 'What they choose to weigh',
    });
    if (!ok) break;
  }

  return { body, label: 'Your brain, as CTRL holds it', items };
}

/**
 * Every offset in a composed source resolves to its own quote. Cheap enough to
 * run before writing, and it turns a silent provenance corruption into a loud
 * refusal.
 */
export function verifyOffsets(source: ComposedSource): { ok: boolean; broken: number[] } {
  const broken: number[] = [];
  source.items.forEach((item, i) => {
    if (source.body.slice(item.quoteStart, item.quoteEnd) !== item.quote) broken.push(i);
  });
  return { ok: broken.length === 0, broken };
}

/** One construct per distinct pole, carrying the evidence that suggested it. */
export function groupIntoConstructs(
  items: Array<ComposedEvidence & { evidenceId: string }>,
): Array<{ emergentPole: string; evidenceIds: string[] }> {
  const byPole = new Map<string, string[]>();
  for (const item of items) {
    const list = byPole.get(item.emergentPole) ?? [];
    list.push(item.evidenceId);
    byPole.set(item.emergentPole, list);
  }
  return [...byPole.entries()].map(([emergentPole, evidenceIds]) => ({ emergentPole, evidenceIds }));
}
