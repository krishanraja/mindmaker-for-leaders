import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  capCandidates,
  checkCandidate,
  isLocated,
  isRulePhrased,
  locateQuote,
  maskQuotedSpans,
  normaliseEvidenceKind,
  runPostCheck,
  type QuoteSpan,
} from './ingest-post-check';
import {
  buildIngestSystemPrompt,
  HANDRUN_PROMPT_1_RULES,
} from '../ingest-evidence/prompt';

/**
 * The deterministic gate between the ingest LLM call and the rows it writes.
 *
 * CH-13 is the reason this file exists. The three reproduced failures of the
 * old fuzzy floors are pinned here as passing cases: filler dropped by the
 * model, a curly apostrophe swapped for a straight one, and a short clause
 * cited from a long source. The one case that must fail is an inserted word,
 * because insertion is fabrication and deletion is not.
 */

function span(loc: ReturnType<typeof locateQuote>): QuoteSpan {
  if (!isLocated(loc)) throw new Error(`expected a located span, got ${loc.rejected}`);
  return loc;
}

describe('locateQuote: exact slice', () => {
  it('locates a quote that appears verbatim', () => {
    const source = 'Before. we do not want a deck or any detailed notes. After.';
    const quote = 'we do not want a deck';
    const loc = span(locateQuote(source, quote));

    expect(source.slice(loc.start, loc.end)).toBe(quote);
    expect(loc.start).toBe(source.indexOf(quote));
  });

  it('locates a short clause cited from a long source', () => {
    const source =
      'We are very uncorporate as a client, so we do not want a deck or any '
      + 'detailed notes of what you have done, just tell me on the call.';
    const loc = span(locateQuote(source, 'just tell me on the call'));

    expect(source.slice(loc.start, loc.end)).toBe('just tell me on the call');
  });

  it('rejects an empty quote', () => {
    const loc = locateQuote('some source text', '   ');
    expect(isLocated(loc)).toBe(false);
    expect((loc as { rejected: string }).rejected).toBe('empty_quote');
  });
});

describe('locateQuote: asymmetric token match', () => {
  it('locates a curly-apostrophe quote at the correct raw offsets', () => {
    const source = 'He said we don’t want a deck, and moved on.';
    const quote = "we don't want a deck";
    const loc = span(locateQuote(source, quote));

    // The raw slice keeps the source's own curly apostrophe, and the offsets
    // point at the words, not the comma after them.
    expect(source.slice(loc.start, loc.end)).toBe('we don’t want a deck');
    expect(loc.start).toBe(source.indexOf('we don’t'));
    expect(loc.end).toBe(source.indexOf('we don’t') + 'we don’t want a deck'.length);
  });

  it('locates a quote the model cleaned filler out of', () => {
    const source = 'Honestly we don\'t, you know, want a deck for this one.';
    const quote = "we don't want a deck";
    const loc = span(locateQuote(source, quote));

    // Deletions pass. The stored span is the real one, filler included, which
    // is what renders with an ellipsis.
    expect(source.slice(loc.start, loc.end)).toBe("we don't, you know, want a deck");
  });

  it('locates across a dropped "um"', () => {
    const source = 'The board update, um, has to name the client.';
    const loc = span(locateQuote(source, 'the board update has to name the client'));
    expect(source.slice(loc.start, loc.end)).toBe('The board update, um, has to name the client');
  });

  it('rejects a quote with an inserted word as inserted_content', () => {
    const source = 'we do not want a deck for this engagement';
    const loc = locateQuote(source, 'we do not want a glossy deck');

    expect(isLocated(loc)).toBe(false);
    expect((loc as { rejected: string }).rejected).toBe('inserted_content');
  });

  it('rejects a reordered quote, because order is the whole check', () => {
    const source = 'name the client first, then the number';
    const loc = locateQuote(source, 'the number first, then name the client');

    expect(isLocated(loc)).toBe(false);
    expect((loc as { rejected: string }).rejected).toBe('inserted_content');
  });

  it('picks the tightest span when the first token repeats', () => {
    const source = 'we want speed. Later on we want a deck that names the client.';
    const loc = span(locateQuote(source, 'we want a deck'));
    expect(source.slice(loc.start, loc.end)).toBe('we want a deck');
  });
});

describe('rule-phrased poles', () => {
  const source = 'On the March board update he said never send a deck without the number in it.';

  it('rejects a candidate whose emergent pole is phrased as a rule', () => {
    const result = checkCandidate(source, {
      emergent_pole: 'A board update must always carry the number',
      items: [
        {
          quote: 'never send a deck without the number in it',
          situation: 'about the March board update',
          speaker_is_owner: true,
          kind: 'utterance',
        },
      ],
    });

    expect(result.accepted).toBeNull();
    expect(result.rejected.map((r) => r.reason)).toContain('rule_phrased_pole');
  });

  it('accepts a pole whose always/never sits inside the located quote span', () => {
    const result = checkCandidate(source, {
      emergent_pole: 'whether the number is in it: "never send a deck without the number in it"',
      items: [
        {
          quote: 'never send a deck without the number in it',
          situation: 'about the March board update',
          speaker_is_owner: true,
          kind: 'utterance',
        },
      ],
    });

    expect(result.rejected).toHaveLength(0);
    expect(result.accepted?.items).toHaveLength(1);
    expect(result.accepted?.items[0].quote).toBe('never send a deck without the number in it');
  });

  it('masks only resolved quotes, not anything in quotation marks', () => {
    const masked = maskQuotedSpans('a pole that says never', ['never say never']);
    expect(masked).toBe('a pole that says never');
    expect(isRulePhrased('a pole that says never', ['never say never'])).toBe(true);
  });
});

describe('checkCandidate: item and candidate rules', () => {
  const source = 'She said the update should name the client, not just the sector.';

  it('rejects an item with no situation and keeps the reason', () => {
    const result = checkCandidate(source, {
      emergent_pole: 'names the client or does not',
      items: [
        { quote: 'name the client', situation: '   ', speaker_is_owner: true, kind: 'utterance' },
      ],
    });

    expect(result.accepted).toBeNull();
    expect(result.rejected.map((r) => r.reason)).toEqual(['missing_situation', 'no_evidence']);
  });

  it('rejects a candidate that emitted a contrast_pole field', () => {
    const result = checkCandidate(source, {
      emergent_pole: 'names the client',
      contrast_pole: 'could be for anyone',
      items: [
        { quote: 'name the client', situation: 'about the update', speaker_is_owner: true },
      ],
    });

    expect(result.accepted).toBeNull();
    expect(result.rejected.map((r) => r.reason)).toEqual(['contrast_pole_emitted']);
  });

  it('allows a pole worded as a comparison', () => {
    const result = checkCandidate(source, {
      emergent_pole: 'names a specific client fact vs could be for anyone',
      items: [
        { quote: 'name the client', situation: 'about the update', speaker_is_owner: true },
      ],
    });

    expect(result.accepted?.emergent_pole).toBe('names a specific client fact vs could be for anyone');
  });

  it('restricts kind to what ingest may write', () => {
    expect(normaliseEvidenceKind('declared')).toBe('declared');
    expect(normaliseEvidenceKind('observation')).toBe('observation');
    expect(normaliseEvidenceKind('derived')).toBe('utterance');
    expect(normaliseEvidenceKind(undefined)).toBe('utterance');
  });
});

describe('capCandidates and runPostCheck', () => {
  const source = 'She said the update should name the client, not just the sector.';

  function candidate(n: number) {
    return {
      emergent_pole: `dimension ${n}`,
      items: [
        { quote: 'name the client', situation: 'about the update', speaker_is_owner: true },
      ],
    };
  }

  it('keeps 12 and returns the overflow', () => {
    const { kept, dropped } = capCandidates([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], 12);
    expect(kept).toHaveLength(12);
    expect(dropped).toEqual([13, 14]);
  });

  it('reports capped candidates as rejects rather than dropping them quietly', () => {
    const list = Array.from({ length: 14 }, (_, i) => candidate(i + 1));
    const result = runPostCheck(source, list);

    expect(result.candidates).toHaveLength(12);
    const capped = result.rejected.filter((r) => r.reason === 'over_candidate_cap');
    expect(capped).toHaveLength(2);
    expect(capped[0].quote).toBe('dimension 13');
  });
});

// The jsdom environment gives import.meta.url an http scheme, so the doc is
// found by walking up from the working directory instead.
function repoFile(relative: string): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, relative);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`could not find ${relative} from ${process.cwd()}`);
}

describe('PROMPT 1 drift guard', () => {
  const doc = readFileSync(repoFile('docs/PHASE-0.5-HANDRUN.md'), 'utf8');

  it('carries the hand-run rules block character for character', () => {
    // Byte identity, both directions: the constant appears verbatim in the doc,
    // and it is what the doc's Step 1 fence opens with. Edit either copy alone
    // and this fails, which is the point.
    expect(doc).toContain(HANDRUN_PROMPT_1_RULES);

    const step1 = doc.slice(doc.indexOf('## Step 1'));
    const afterFence = step1.slice(step1.indexOf('```') + 3);
    const block = afterFence.slice(0, afterFence.indexOf('```'));
    expect(block.trim().startsWith(HANDRUN_PROMPT_1_RULES)).toBe(true);
  });

  it('ships the rules block inside the system prompt', () => {
    const prompt = buildIngestSystemPrompt();
    expect(prompt.startsWith(HANDRUN_PROMPT_1_RULES)).toBe(true);
    expect(prompt).toContain('"candidates"');
    expect(prompt).toContain('Do NOT emit a contrast_pole field');
  });
});
