/**
 * Training-material schema - the single contract between `training/anchor.yaml`
 * and every consumer (fact-guardrails, generate-briefing, memory-context-builder).
 *
 * Validation is hand-rolled (no external deps) so the edge runtime has zero
 * install surface. `validateTrainingMaterial` throws on missing required fields
 * and returns a well-typed object.
 */

export interface VoiceCard {
  adjectives: string[];
  anti_adjectives: string[];
  register: string;
  sentence_length: string;
}

export interface DoPhrases {
  openers: string[];
  connectors: string[];
  closers: string[];
}

export interface TypographyRules {
  forbidden_chars: string[];
  forbidden_tokens: string[];
  replacement_map: Record<string, string>;
}

export interface ExtractionReject {
  id: string;
  pattern: string;
  reason: string;
  field: "fact_value" | "fact_context" | "both";
}

export interface PreferenceSubtype {
  keywords: string[];
  examples: string[];
}

export interface PreferenceSubtypes {
  communication_style: PreferenceSubtype;
  decision_style: PreferenceSubtype;
  work_style: PreferenceSubtype;
  tool_or_method: PreferenceSubtype;
}

export type PreferenceSubtypeKey = keyof PreferenceSubtypes;

export interface BriefingExemplars {
  [briefingType: string]: string[];
}

export interface HotSignalTaxonomy {
  must_include: string[];
  deprioritize: string[];
  drop: string[];
}

export interface CitationPolicy {
  when_to_cite: string;
  uncertainty_phrasing: string;
  never: string;
}

export interface Watchlist {
  companies: string[];
  people: string[];
  themes: string[];
}

export interface StructuralRubricEntry {
  hook: string;
  body: string;
  close: string;
  word_budget: number;
  tolerance: number;
}

export interface StructuralRubric {
  [briefingType: string]: StructuralRubricEntry;
}

export interface ExportArtefact {
  filename: string;
  mime: string;
  kind: string;
}

export interface ExportVoiceCard {
  tone: string;
  emphasis: string[];
  avoid: string[];
  artefacts: ExportArtefact[];
}

export interface ExportVoiceCards {
  [targetKey: string]: ExportVoiceCard;
}

export interface EvaluationCorpusEntry {
  id: string;
  kind: "extraction" | "briefing";
  input?: string;
  briefing_type?: string;
  expect: Record<string, unknown>;
}

export interface TrainingMaterial {
  version: number;
  scope: "global" | "cohort" | "user";
  voice_card: VoiceCard;
  do_phrases: DoPhrases;
  dont_phrases: string[];
  typography_rules: TypographyRules;
  extraction_rejects: ExtractionReject[];
  preference_subtypes: PreferenceSubtypes;
  briefing_exemplars: BriefingExemplars;
  hot_signal_taxonomy: HotSignalTaxonomy;
  citation_policy: CitationPolicy;
  watchlist: Watchlist;
  structural_rubric: StructuralRubric;
  self_check_gate: string[];
  export_voice_cards: ExportVoiceCards;
  evaluation_corpus: EvaluationCorpusEntry[];
}

function assertArray<T = unknown>(v: unknown, path: string): T[] {
  if (!Array.isArray(v)) throw new Error(`training-schema: expected array at ${path}`);
  return v as T[];
}

function assertString(v: unknown, path: string): string {
  if (typeof v !== "string") throw new Error(`training-schema: expected string at ${path}`);
  return v;
}

function assertObject(v: unknown, path: string): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) {
    throw new Error(`training-schema: expected object at ${path}`);
  }
  return v as Record<string, unknown>;
}

function assertNumber(v: unknown, path: string): number {
  if (typeof v !== "number") throw new Error(`training-schema: expected number at ${path}`);
  return v;
}

/**
 * Validates an arbitrary parsed YAML/JSON value against the training-material
 * schema. Throws descriptively on missing or malformed fields; returns a fully
 * typed object on success.
 */
export function validateTrainingMaterial(raw: unknown): TrainingMaterial {
  const obj = assertObject(raw, "root");

  const voiceCard = assertObject(obj.voice_card, "voice_card");
  const doPhrases = assertObject(obj.do_phrases, "do_phrases");
  const typographyRules = assertObject(obj.typography_rules, "typography_rules");
  const preferenceSubtypes = assertObject(obj.preference_subtypes, "preference_subtypes");
  const briefingExemplars = assertObject(obj.briefing_exemplars, "briefing_exemplars");
  const hotSignal = assertObject(obj.hot_signal_taxonomy, "hot_signal_taxonomy");
  const citationPolicy = assertObject(obj.citation_policy, "citation_policy");
  const watchlist = assertObject(obj.watchlist, "watchlist");
  const structuralRubric = assertObject(obj.structural_rubric, "structural_rubric");
  const exportVoiceCards = assertObject(obj.export_voice_cards, "export_voice_cards");

  const material: TrainingMaterial = {
    version: assertNumber(obj.version, "version"),
    scope: (assertString(obj.scope, "scope") as TrainingMaterial["scope"]),
    voice_card: {
      adjectives: assertArray<string>(voiceCard.adjectives, "voice_card.adjectives"),
      anti_adjectives: assertArray<string>(voiceCard.anti_adjectives, "voice_card.anti_adjectives"),
      register: assertString(voiceCard.register, "voice_card.register"),
      sentence_length: assertString(voiceCard.sentence_length, "voice_card.sentence_length"),
    },
    do_phrases: {
      openers: assertArray<string>(doPhrases.openers, "do_phrases.openers"),
      connectors: assertArray<string>(doPhrases.connectors, "do_phrases.connectors"),
      closers: assertArray<string>(doPhrases.closers, "do_phrases.closers"),
    },
    dont_phrases: assertArray<string>(obj.dont_phrases, "dont_phrases"),
    typography_rules: {
      forbidden_chars: assertArray<string>(typographyRules.forbidden_chars, "typography_rules.forbidden_chars"),
      forbidden_tokens: assertArray<string>(typographyRules.forbidden_tokens, "typography_rules.forbidden_tokens"),
      replacement_map: assertObject(typographyRules.replacement_map, "typography_rules.replacement_map") as Record<string, string>,
    },
    extraction_rejects: assertArray(obj.extraction_rejects, "extraction_rejects").map((e, i) => {
      const er = assertObject(e, `extraction_rejects[${i}]`);
      return {
        id: assertString(er.id, `extraction_rejects[${i}].id`),
        pattern: assertString(er.pattern, `extraction_rejects[${i}].pattern`),
        reason: assertString(er.reason, `extraction_rejects[${i}].reason`),
        field: (assertString(er.field, `extraction_rejects[${i}].field`) as ExtractionReject["field"]),
      };
    }),
    preference_subtypes: {
      communication_style: normalizeSubtype(preferenceSubtypes.communication_style, "communication_style"),
      decision_style: normalizeSubtype(preferenceSubtypes.decision_style, "decision_style"),
      work_style: normalizeSubtype(preferenceSubtypes.work_style, "work_style"),
      tool_or_method: normalizeSubtype(preferenceSubtypes.tool_or_method, "tool_or_method"),
    },
    briefing_exemplars: Object.fromEntries(
      Object.entries(briefingExemplars).map(([k, v]) => [k, assertArray<string>(v, `briefing_exemplars.${k}`)])
    ),
    hot_signal_taxonomy: {
      must_include: assertArray<string>(hotSignal.must_include, "hot_signal_taxonomy.must_include"),
      deprioritize: assertArray<string>(hotSignal.deprioritize, "hot_signal_taxonomy.deprioritize"),
      drop: assertArray<string>(hotSignal.drop, "hot_signal_taxonomy.drop"),
    },
    citation_policy: {
      when_to_cite: assertString(citationPolicy.when_to_cite, "citation_policy.when_to_cite"),
      uncertainty_phrasing: assertString(citationPolicy.uncertainty_phrasing, "citation_policy.uncertainty_phrasing"),
      never: assertString(citationPolicy.never, "citation_policy.never"),
    },
    watchlist: {
      companies: assertArray<string>(watchlist.companies, "watchlist.companies"),
      people: assertArray<string>(watchlist.people, "watchlist.people"),
      themes: assertArray<string>(watchlist.themes, "watchlist.themes"),
    },
    structural_rubric: Object.fromEntries(
      Object.entries(structuralRubric).map(([k, v]) => {
        const r = assertObject(v, `structural_rubric.${k}`);
        return [k, {
          hook: assertString(r.hook, `structural_rubric.${k}.hook`),
          body: assertString(r.body, `structural_rubric.${k}.body`),
          close: assertString(r.close, `structural_rubric.${k}.close`),
          word_budget: assertNumber(r.word_budget, `structural_rubric.${k}.word_budget`),
          tolerance: assertNumber(r.tolerance, `structural_rubric.${k}.tolerance`),
        }];
      })
    ),
    self_check_gate: assertArray<string>(obj.self_check_gate, "self_check_gate"),
    export_voice_cards: Object.fromEntries(
      Object.entries(exportVoiceCards).map(([k, v]) => {
        const r = assertObject(v, `export_voice_cards.${k}`);
        return [k, {
          tone: assertString(r.tone, `export_voice_cards.${k}.tone`),
          emphasis: assertArray<string>(r.emphasis, `export_voice_cards.${k}.emphasis`),
          avoid: assertArray<string>(r.avoid, `export_voice_cards.${k}.avoid`),
          artefacts: assertArray(r.artefacts, `export_voice_cards.${k}.artefacts`).map((a, i) => {
            const ao = assertObject(a, `export_voice_cards.${k}.artefacts[${i}]`);
            return {
              filename: assertString(ao.filename, `export_voice_cards.${k}.artefacts[${i}].filename`),
              mime: assertString(ao.mime, `export_voice_cards.${k}.artefacts[${i}].mime`),
              kind: assertString(ao.kind, `export_voice_cards.${k}.artefacts[${i}].kind`),
            };
          }),
        }];
      })
    ),
    evaluation_corpus: assertArray(obj.evaluation_corpus, "evaluation_corpus").map((e, i) => {
      const ec = assertObject(e, `evaluation_corpus[${i}]`);
      return {
        id: assertString(ec.id, `evaluation_corpus[${i}].id`),
        kind: assertString(ec.kind, `evaluation_corpus[${i}].kind`) as "extraction" | "briefing",
        input: typeof ec.input === "string" ? ec.input : undefined,
        briefing_type: typeof ec.briefing_type === "string" ? ec.briefing_type : undefined,
        expect: assertObject(ec.expect, `evaluation_corpus[${i}].expect`),
      };
    }),
  };

  return material;
}

function normalizeSubtype(v: unknown, key: string): PreferenceSubtype {
  const o = assertObject(v, `preference_subtypes.${key}`);
  return {
    keywords: assertArray<string>(o.keywords, `preference_subtypes.${key}.keywords`),
    examples: assertArray<string>(o.examples, `preference_subtypes.${key}.examples`),
  };
}
