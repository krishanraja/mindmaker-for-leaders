/**
 * The provenance context for one skill generation: what the model is allowed to
 * cite, what those citations resolve to, and what gets written down afterwards.
 *
 * Phase 3b turns prov.everyRuleCited / prov.pointerResolves /
 * prov.noSituatedGeneralisation from advisory into blocking in this function.
 * A blocking gate is only honest if the thing it demands is available, so this
 * module's first job is to make it available: load the compiled criteria, load
 * the evidence behind them, and offer the leader's own transcript as citable
 * spans so a leader who has never run the sort still has something real to point
 * at other than the word AWAITING.
 *
 * Every id handed to the model maps back to a row. Nothing is advertised that
 * cannot be resolved: an id offered but never persisted would turn a miss into a
 * pass, which is the one outcome worse than the miss.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  shortIdsFor,
  splitCitableSpans,
  spanVerifies,
  type CitableSpan,
} from "../_shared/citable-spans.ts";
import {
  claimHash,
  resolvePointerId,
  type ClaimResolution,
  type LocatedClaim,
  type ProvenanceOptions,
} from "../_shared/provenance-checks.ts";
import type { PackageCriterion, PackageExemplar, PackageHoldoutItem } from "../_shared/skill-package.ts";
import type { PromptCriterion, PromptEvidence } from "./prompt.ts";

/** Stored evidence rows offered for citation. Enough to choose from, not a dump. */
const MAX_STORED_EVIDENCE = 30;
/** Transcript spans offered for citation. */
const MAX_TRANSCRIPT_SPANS = 20;
/** Their own graded work shipped as exemplars. */
const MAX_EXEMPLARS = 6;

interface CriterionRow {
  id: string;
  name: string;
  check_text: string;
  observable: string | null;
  weight: string;
  surface: string;
  holds_example: string | null;
  breaks_example: string | null;
  disc_verdict: string;
  n_rejected: number | null;
  n_rejected_failing: number | null;
  n_accepted: number | null;
  n_accepted_failing: number | null;
  construct_id: string | null;
}

interface EvidenceRow {
  id: string;
  quote: string | null;
  situated: boolean | null;
  situation: string | null;
  source_label: string | null;
  occurred_at: string | null;
  memory_fact_id: string | null;
}

/** A transcript span that has been offered an id but not yet written down. */
interface PendingSpan {
  uuid: string;
  shortId: string;
  span: CitableSpan;
}

export interface PointerTargets {
  /** Rendered for the prompt. */
  promptCriteria: PromptCriterion[];
  promptEvidence: PromptEvidence[];
  /** Rendered into the package's rubric leaves. */
  packageCriteria: PackageCriterion[];
  /** What the gate resolves pointers against. Short ids, matched exactly. */
  options: ProvenanceOptions;
  /** short id -> criteria.id. */
  criterionUuidByShort: Map<string, string>;
  /** short id -> evidence.id, for rows that exist right now. */
  evidenceUuidByShort: Map<string, string>;
  /** short id -> evidence.memory_fact_id, for the lineage edges. */
  memoryFactByShort: Map<string, string>;
  /** Transcript spans offered but not yet persisted, keyed by short id. */
  pendingSpans: Map<string, PendingSpan>;
  /** The surface the criteria were compiled for, when there is one. */
  surface: string | null;
  /** Whether anything at all is citable. Drives blocking vs advisory. */
  hasTargets: boolean;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Everything this leader can cite, with the short ids the body will use.
 *
 * Best effort by design: a failed read leaves the sets empty, the caller keeps
 * the checks advisory, and the package ships with an honest skip rather than a
 * gate nobody can satisfy because a query timed out.
 */
export async function loadPointerTargets(
  admin: SupabaseClient,
  userId: string,
  transcript: string,
  newUuid: () => string = () => crypto.randomUUID(),
): Promise<PointerTargets> {
  let criteriaRows: CriterionRow[] = [];
  let evidenceRows: EvidenceRow[] = [];

  const { data: criteriaData } = await admin
    .from("criteria")
    .select(
      "id, name, check_text, observable, weight, surface, holds_example, breaks_example, " +
        "disc_verdict, n_rejected, n_rejected_failing, n_accepted, n_accepted_failing, construct_id",
    )
    .eq("user_id", userId)
    .eq("is_current", true)
    .eq("disc_verdict", "keep");
  criteriaRows = (criteriaData ?? []) as CriterionRow[];

  // The evidence those criteria rest on, first. criteria -> constructs ->
  // evidence_ids is the real path; a criterion carries no evidence array of its
  // own, and inventing one here would be a second source of truth.
  const constructIds = criteriaRows
    .map((row) => row.construct_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  let referencedEvidenceIds: string[] = [];
  if (constructIds.length > 0) {
    const { data: constructData } = await admin
      .from("constructs")
      .select("id, evidence_ids")
      .in("id", constructIds);
    for (const row of (constructData ?? []) as Array<{ evidence_ids: string[] | null }>) {
      for (const id of row.evidence_ids ?? []) referencedEvidenceIds.push(id);
    }
    referencedEvidenceIds = Array.from(new Set(referencedEvidenceIds));
  }

  const { data: evidenceData } = await admin
    .from("evidence")
    .select("id, quote, situated, situation, source_label, occurred_at, memory_fact_id")
    .eq("user_id", userId)
    .is("redacted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  const allEvidence = (evidenceData ?? []) as EvidenceRow[];

  // Referenced evidence leads, then the rest, capped. A rule is most useful when
  // it points at the thing a criterion was compiled from.
  const referenced = new Set(referencedEvidenceIds);
  evidenceRows = [
    ...allEvidence.filter((row) => referenced.has(row.id)),
    ...allEvidence.filter((row) => !referenced.has(row.id)),
  ]
    .filter((row) => text(row.quote).length >= 4)
    .slice(0, MAX_STORED_EVIDENCE);

  // The leader's own words from this request. A skill built from a description
  // nobody graded still has provenance: the sentence they said it in.
  const spans = splitCitableSpans(transcript, { limit: MAX_TRANSCRIPT_SPANS })
    .filter((span) => spanVerifies(transcript, span));
  const spanUuids = spans.map(() => newUuid());

  const evidenceShort = shortIdsFor([...evidenceRows.map((r) => r.id), ...spanUuids]);
  const criterionShort = new Map<string, string>();
  criteriaRows.forEach((row, i) => criterionShort.set(row.id, String(i + 1)));

  const promptCriteria: PromptCriterion[] = criteriaRows.map((row) => ({
    shortId: `C${criterionShort.get(row.id)}`,
    name: row.name,
    checkText: row.check_text,
    observable: row.observable,
    holdsExample: row.holds_example,
    breaksExample: row.breaks_example,
  }));

  const packageCriteria: PackageCriterion[] = criteriaRows.map((row) => ({
    shortId: `C${criterionShort.get(row.id)}`,
    name: row.name,
    check_text: row.check_text,
    observable: row.observable,
    weight: (["essential", "important", "optional", "pitfall"].includes(row.weight)
      ? row.weight
      : "important") as PackageCriterion["weight"],
    surface: row.surface,
    holds_example: row.holds_example,
    breaks_example: row.breaks_example,
    disc_verdict: row.disc_verdict,
    n_rejected: row.n_rejected,
    n_rejected_failing: row.n_rejected_failing,
    n_accepted: row.n_accepted,
    n_accepted_failing: row.n_accepted_failing,
  }));

  const promptEvidence: PromptEvidence[] = [];
  const evidenceUuidByShort = new Map<string, string>();
  const memoryFactByShort = new Map<string, string>();
  const situatedShort: string[] = [];

  for (const row of evidenceRows) {
    const short = evidenceShort.get(row.id)!;
    evidenceUuidByShort.set(short, row.id);
    if (row.memory_fact_id) memoryFactByShort.set(short, row.memory_fact_id);
    if (row.situated !== false) situatedShort.push(short);
    promptEvidence.push({
      shortId: `E${short}`,
      quote: text(row.quote),
      situated: row.situated !== false,
      situation: row.situation,
      sourceLabel: row.source_label,
      occurredAt: row.occurred_at ? String(row.occurred_at).slice(0, 10) : null,
    });
  }

  const pendingSpans = new Map<string, PendingSpan>();
  spans.forEach((span, i) => {
    const uuid = spanUuids[i];
    const short = evidenceShort.get(uuid)!;
    pendingSpans.set(short, { uuid, shortId: short, span });
    // Situated, always. It was said while describing one workflow, so a rule
    // resting on it has to name that workflow and cannot be written as a
    // standing rule about everything they produce.
    situatedShort.push(short);
    promptEvidence.push({
      shortId: `E${short}`,
      quote: span.text,
      situated: true,
      situation: "said while describing this workflow",
      sourceLabel: "this build's transcript",
      occurredAt: null,
    });
  });

  const knownEvidenceIds = [
    ...Array.from(evidenceUuidByShort.keys()),
    ...Array.from(pendingSpans.keys()),
  ];
  const knownCriterionIds = Array.from(criterionShort.values());

  return {
    promptCriteria,
    promptEvidence,
    packageCriteria,
    options: {
      knownCriterionIds,
      knownEvidenceIds,
      situatedEvidenceIds: situatedShort,
      evidenceQuotes: [
        ...evidenceRows.map((row) => text(row.quote)),
        ...spans.map((span) => span.text),
      ].filter((quote) => quote.length >= 4),
    },
    criterionUuidByShort: new Map(
      Array.from(criterionShort.entries()).map(([uuid, short]) => [short, uuid]),
    ),
    evidenceUuidByShort,
    memoryFactByShort,
    pendingSpans,
    surface: criteriaRows[0]?.surface ?? null,
    hasTargets: knownCriterionIds.length > 0 || knownEvidenceIds.length > 0,
  };
}

/**
 * Write the transcript spans the generated package actually cited, and only
 * those.
 *
 * Called BEFORE the gate runs, so that by the time prov.pointerResolves reads
 * the id sets, every id in them is a live row. A span whose insert fails is
 * dropped from the citable set instead, which fails the pointer honestly rather
 * than shipping a package whose pointers dangle.
 */
export async function persistCitedSpans(
  admin: SupabaseClient,
  userId: string,
  transcript: string,
  skillName: string,
  targets: PointerTargets,
  citedShortIds: Set<string>,
): Promise<{ persisted: string[]; dropped: string[] }> {
  const wanted = Array.from(targets.pendingSpans.values()).filter((p) =>
    citedShortIds.has(p.shortId)
  );
  if (wanted.length === 0) return { persisted: [], dropped: [] };

  const persisted: string[] = [];
  const dropped: string[] = [];

  try {
    const { data: sourceRow, error: sourceErr } = await admin
      .from("evidence_sources")
      .insert({
        user_id: userId,
        kind: "transcript",
        label: `Skill build: ${skillName}`,
        // Not truncated on purpose: the stored body is what the offsets index
        // into, so a shortened copy would break every quote it holds.
        body: transcript,
      })
      .select("id")
      .single();
    if (sourceErr || !sourceRow?.id) throw sourceErr ?? new Error("no source id");

    const rows = wanted.map((p) => ({
      id: p.uuid,
      user_id: userId,
      kind: "utterance",
      body: p.span.text,
      quote: p.span.text,
      source_id: sourceRow.id,
      quote_start: p.span.start,
      quote_end: p.span.end,
      source_label: `Skill build: ${skillName}`,
      situated: true,
      situation: "said while describing this workflow",
      speaker_is_owner: true,
    }));

    const { error: insertErr } = await admin.from("evidence").insert(rows);
    if (insertErr) throw insertErr;
    for (const p of wanted) {
      persisted.push(p.shortId);
      targets.evidenceUuidByShort.set(p.shortId, p.uuid);
      targets.pendingSpans.delete(p.shortId);
    }
  } catch {
    for (const p of wanted) {
      dropped.push(p.shortId);
      targets.pendingSpans.delete(p.shortId);
    }
    // The ids stop being citable. The gate then reports the pointer as
    // unresolved, which is the truth.
    const drop = new Set(dropped);
    targets.options.knownEvidenceIds = (targets.options.knownEvidenceIds ?? []).filter(
      (id) => !drop.has(id),
    );
    targets.options.situatedEvidenceIds = (targets.options.situatedEvidenceIds ?? []).filter(
      (id) => !drop.has(id),
    );
  }

  return { persisted, dropped };
}

/** Every evidence pointer a set of claims cites, as short ids. */
export function citedEvidenceShortIds(claims: LocatedClaim[]): Set<string> {
  const out = new Set<string>();
  for (const claim of claims) {
    if (claim.pointer?.kind === "evidence") out.add(claim.pointer.id.toLowerCase());
  }
  return out;
}

export interface ProvenanceLedgerInput {
  userId: string;
  artifactId: string;
  pass: number;
  claims: LocatedClaim[];
  notEstablished: LocatedClaim[];
  targets: PointerTargets;
}

/**
 * One skill_provenance row per claim per pass.
 *
 * This is the record that makes "where did this rule come from" answerable in
 * six months by reading a table rather than by re-running a model. pass
 * increments per regeneration attempt, so a rule that was unresolved on pass 1
 * and cited on pass 2 leaves both facts behind rather than only the flattering
 * one.
 */
export function buildProvenanceRows(
  input: ProvenanceLedgerInput,
): Array<Record<string, unknown>> {
  const { targets } = input;
  const rows: Array<Record<string, unknown>> = [];

  for (const claim of input.claims) {
    let resolution: ClaimResolution = "unresolved";
    let evidenceId: string | null = null;
    let criterionId: string | null = null;

    const pointer = claim.pointer;
    if (pointer) {
      const known = pointer.kind === "criterion"
        ? targets.options.knownCriterionIds
        : targets.options.knownEvidenceIds;
      const short = resolvePointerId(pointer, known);
      if (short) {
        resolution = "cited";
        if (pointer.kind === "criterion") {
          criterionId = targets.criterionUuidByShort.get(short) ?? null;
        } else {
          evidenceId = targets.evidenceUuidByShort.get(short) ?? null;
        }
      }
    }

    rows.push({
      user_id: input.userId,
      artifact_id: input.artifactId,
      pass: input.pass,
      claim_hash: claimHash(claim.text),
      claim_text: claim.text.slice(0, 2000),
      section: claim.section || claim.path || "(unsectioned)",
      evidence_id: evidenceId,
      criterion_id: criterionId,
      resolution,
    });
  }

  for (const line of input.notEstablished) {
    rows.push({
      user_id: input.userId,
      artifact_id: input.artifactId,
      pass: input.pass,
      claim_hash: claimHash(line.text),
      claim_text: line.text.slice(0, 2000),
      section: line.section || line.path || "(unsectioned)",
      evidence_id: null,
      criterion_id: null,
      resolution: "marked_awaiting",
    });
  }

  return rows;
}

/**
 * The lineage edges: artifact -> memory fact, edge_type derived_from.
 *
 * memory_links has existed since the brain work and nothing has ever written a
 * row to it from this side of the product. These are the first: a generated
 * skill now records which of the leader's remembered facts it was actually
 * built out of, so the DAG can be walked backwards from an artefact instead of
 * only forwards from a decision.
 */
export function buildMemoryLinkRows(
  userId: string,
  artifactId: string,
  memoryFactIds: string[],
): Array<Record<string, unknown>> {
  return Array.from(new Set(memoryFactIds.filter(Boolean))).map((factId) => ({
    user_id: userId,
    from_type: "artifact",
    from_id: artifactId,
    to_type: "memory",
    to_id: factId,
    edge_type: "derived_from",
    weight: 1.0,
  }));
}

/** The memory facts behind the evidence a set of claims cited. */
export function citedMemoryFactIds(claims: LocatedClaim[], targets: PointerTargets): string[] {
  const out: string[] = [];
  for (const short of citedEvidenceShortIds(claims)) {
    const resolved = resolvePointerId(
      { kind: "evidence", id: short },
      targets.options.knownEvidenceIds,
    );
    if (!resolved) continue;
    const factId = targets.memoryFactByShort.get(resolved);
    if (factId) out.push(factId);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Their own graded work
// ---------------------------------------------------------------------------

export interface GradedWork {
  exemplars: PackageExemplar[];
  holdout: PackageHoldoutItem[];
}

interface GradeRow {
  verdict: string;
  why: string | null;
  sort_items: {
    body: string | null;
    position: number | null;
    held_out: boolean | null;
    repeat_of: string | null;
  } | null;
}

/**
 * Their own graded pieces, verbatim, for exemplars/ and evals/holdout.jsonl.
 *
 * Retrieved exemplars moved one judging benchmark from 54.9 to 81.7 percent,
 * a larger effect than anything achieved by rewording a rubric. A rubric
 * describes the standard; an exemplar demonstrates it.
 *
 * Kept verbatim, never cleaned up. A tidied exemplar is our writing, not theirs.
 */
export async function loadGradedWork(
  admin: SupabaseClient,
  userId: string,
): Promise<GradedWork> {
  const empty: GradedWork = { exemplars: [], holdout: [] };
  try {
    const { data, error } = await admin
      .from("sort_grades")
      .select("verdict, why, sort_items!inner(body, position, held_out, repeat_of)")
      .eq("user_id", userId)
      .neq("verdict", "skip")
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) return empty;

    const rows = (data ?? []) as unknown as GradeRow[];
    const usable = rows.filter((row) =>
      row.sort_items && !row.sort_items.repeat_of && text(row.sort_items.body).length > 0
    );

    const holdout: PackageHoldoutItem[] = usable
      .filter((row) => row.sort_items?.held_out)
      .map((row) => ({
        position: row.sort_items?.position ?? null,
        verdict: row.verdict,
        why: row.why,
        body: row.sort_items?.body ?? "",
      }));

    const trainingGraded = usable.filter((row) => !row.sort_items?.held_out);
    // Both poles, deliberately. A negative exemplar is what makes the set
    // useful, and a set of six accepted pieces demonstrates nothing about where
    // the line is.
    const accepted = trainingGraded.filter((row) => row.verdict === "send");
    const rejected = trainingGraded.filter((row) => row.verdict === "would_not_send");
    const interleaved: GradeRow[] = [];
    for (let i = 0; i < MAX_EXEMPLARS; i++) {
      const next = i % 2 === 0 ? accepted[Math.floor(i / 2)] : rejected[Math.floor(i / 2)];
      if (next) interleaved.push(next);
    }
    const exemplars: PackageExemplar[] = interleaved.slice(0, MAX_EXEMPLARS).map((row) => ({
      position: row.sort_items?.position ?? null,
      verdict: row.verdict === "send" ? "send" : "would_not_send",
      body: row.sort_items?.body ?? "",
      why: row.why,
    }));

    return { exemplars, holdout };
  } catch {
    return empty;
  }
}
