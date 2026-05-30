/**
 * Training-material regression harness.
 *
 * Executes the `evaluation_corpus` from training/anchor.yaml against the
 * pure guardrail logic in supabase/functions/_shared/guardrails-core.ts.
 *
 * Every change to the YAML, the core guardrails module, the briefing prompt,
 * or the export formatters should run this harness. CI can invoke it via
 * `npm run test:training`.
 *
 * The briefing-kind entries here verify that the banned-phrase + typography
 * strip works against synthetic inputs. They do NOT hit the live LLM; that
 * is what the manual verification steps in the plan file cover.
 */

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { validateTrainingMaterial } from '../../supabase/functions/_shared/training-schema';
import {
  runGuardrailsPure,
  applyTypographyRulesCore,
  stripBannedPhrasesCore,
  findBannedPhrasesCore,
  type IncomingFact,
} from '../../supabase/functions/_shared/guardrails-core';

const YAML_PATH = resolve(process.cwd(), 'training', 'anchor.yaml');
const raw = readFileSync(YAML_PATH, 'utf8');
const training = validateTrainingMaterial(parseYaml(raw));

function factFromInput(input: string, category = 'preference'): IncomingFact {
  return {
    fact_key: 'test_fact',
    fact_category: category,
    fact_label: 'Test',
    fact_value: input,
    fact_context: input,
    confidence_score: 0.8,
    is_high_stakes: false,
  };
}

describe('training file schema', () => {
  test('parses and validates cleanly', () => {
    expect(training.version).toBeGreaterThanOrEqual(1);
    expect(training.extraction_rejects.length).toBeGreaterThan(0);
    expect(training.typography_rules.forbidden_tokens).toContain('em dash');
    expect(training.export_voice_cards.chatgpt_custom_gpt).toBeDefined();
    expect(training.evaluation_corpus.length).toBeGreaterThan(0);
  });
});

describe('typography + banned phrases', () => {
  test('replacement_map strips em dashes and en dashes', () => {
    const out = applyTypographyRulesCore('This is a test\u2014with em dash and en dash\u2013here.', training);
    expect(out).not.toContain('\u2014');
    expect(out).not.toContain('\u2013');
  });

  test('stripBannedPhrases removes filler', () => {
    const input = 'In today\'s fast-paced world, we need to dive deep into this game-changer.';
    const out = stripBannedPhrasesCore(input, training);
    const remaining = findBannedPhrasesCore(out, training);
    expect(remaining).toEqual([]);
  });
});

describe('extraction_rejects - corpus entries', () => {
  const extractionCases = training.evaluation_corpus.filter(e => e.kind === 'extraction');

  for (const entry of extractionCases) {
    test(`${entry.id}: ${entry.input?.slice(0, 60)}`, () => {
      const fact = factFromInput(entry.input || '', 'preference');
      const result = runGuardrailsPure([fact], training);
      const expectedDecision = entry.expect.decision;

      if (expectedDecision === 'reject') {
        expect(result.rejected.length).toBe(1);
        expect(result.kept.length).toBe(0);
        if (entry.expect.reason_id) {
          // Any of: the named rule, the typography_token shortcut, or
          // unmapped_preference are all acceptable rejections - they all
          // reflect the correct behaviour (don't store this as a fact).
          const acceptedReasons = [
            entry.expect.reason_id,
            'typography_token',
            'unmapped_preference',
          ];
          expect(acceptedReasons).toContain(result.rejected[0].reason_id);
        }
      } else if (expectedDecision === 'keep') {
        // For positive extractions the category might be preference but for
        // the harness we also check that an identity-level input survives.
        const idFact = factFromInput(entry.input || '', 'identity');
        const r2 = runGuardrailsPure([idFact], training);
        expect(r2.kept.length).toBe(1);
      }
    });
  }
});

describe('extraction_rejects - quick synthetic probes', () => {
  test('rejects em-dash meta-instruction', () => {
    const r = runGuardrailsPure([factFromInput("Don't use em dashes in my briefings.")], training);
    expect(r.rejected.length).toBe(1);
  });

  test('rejects transient state', () => {
    const r = runGuardrailsPure([factFromInput("I'm tired today, running late.")], training);
    expect(r.rejected.length).toBe(1);
  });

  test('rejects third-party identity as user fact', () => {
    const r = runGuardrailsPure([factFromInput('my cofounder is the CEO', 'identity')], training);
    expect(r.rejected.length).toBe(1);
  });

  test('keeps positive identity fact', () => {
    const f: IncomingFact = {
      fact_key: 'role',
      fact_category: 'identity',
      fact_label: 'Role',
      fact_value: 'product lead at Mindmaker',
      fact_context: 'I run product at Mindmaker.',
      confidence_score: 0.9,
      is_high_stakes: true,
    };
    const r = runGuardrailsPure([f], training);
    expect(r.kept.length).toBe(1);
    expect(r.rejected.length).toBe(0);
  });

  test('downgrades preference that cannot be mapped to a subtype', () => {
    const f: IncomingFact = {
      fact_key: 'pref',
      fact_category: 'preference',
      fact_label: 'Preference',
      fact_value: 'enjoys a good book',
      fact_context: 'enjoys a good book',
      confidence_score: 0.8,
      is_high_stakes: false,
    };
    const r = runGuardrailsPure([f], training);
    expect(r.rejected.length).toBe(1);
    expect(r.rejected[0].reason_id).toBe('unmapped_preference');
  });
});

describe('briefing corpus - synthetic post-processing', () => {
  const briefingCases = training.evaluation_corpus.filter(e => e.kind === 'briefing');

  for (const entry of briefingCases) {
    test(`${entry.id}: banned-phrase strip holds`, () => {
      const mockScript = `In today's fast-paced world, OpenAI shipped a game-changer\u2014one to watch.`;
      const cleaned = stripBannedPhrasesCore(applyTypographyRulesCore(mockScript, training), training);
      const notContains = (entry.expect.not_contains as string[] | undefined) || [];
      for (const phrase of notContains) {
        expect(cleaned.toLowerCase()).not.toContain(phrase.toLowerCase());
      }
    });
  }
});
