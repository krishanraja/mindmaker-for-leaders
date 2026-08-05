import { describe, it, expect } from 'vitest';
import {
  admitVerdicts,
  buildLedgerRow,
  capCriteria,
  enforceBorderlineRule,
  enforceLens,
  enforceQuoteRule,
  enforcementReport,
  INSUFFICIENT,
  isoWeek,
  isUnrepaired,
  ledgerVerdictFor,
  markUnrepaired,
  mechanicalFindings,
  pickJudgeProvider,
  resolveProviderOrder,
  selectExemplars,
  tokenOverlap,
  truncateQuote,
  type GradedItem,
  type LoadedCriterion,
  type ScoredVerdict,
} from './critique-core';

/**
 * The deterministic half of CRITIQUE. These pin the rules that must hold every
 * time rather than most times, which is the whole reason they are code:
 *
 *   - a verdict whose quote is absent from the artefact drops to insufficient
 *     evidence, and the drop is reported rather than swallowed
 *   - a borderline with no named change is a breaks
 *   - never more than seven criteria, never one nobody loaded
 *   - exemplars are the person's own nearest graded items, training only
 *   - the Signature judge is never the family that generated the artefact
 *   - agree writes accepted, push-back writes rejected, in the right ISO week
 */

const criterion = (over: Partial<LoadedCriterion> = {}): LoadedCriterion => ({
  id: 'c-1',
  shortId: 'C1',
  name: 'Earned claim',
  checkText: 'Every assertion carries a source, an example or a named instance.',
  weight: 'essential',
  ...over,
});

const scored = (over: Partial<ScoredVerdict> = {}): ScoredVerdict => ({
  criterionId: 'c-1',
  criterionName: 'Earned claim',
  lens: 'standard',
  label: 'your rule',
  verdict: 'breaks',
  quote: '',
  sentence: 'The opening asserts a result with nothing behind it.',
  changeToHolds: null,
  revision: null,
  adjustments: [],
  ...over,
});

const ARTEFACT = [
  'We helped the team cut their reporting cycle from nine days to two.',
  'Numbers are from the Q2 close, signed off by their finance lead.',
  'The next step is a two week pilot on the sales pipeline.',
].join('\n');

// ---------------------------------------------------------------------------
// Quote or do not score
// ---------------------------------------------------------------------------

describe('enforceQuoteRule', () => {
  it('keeps a verdict whose quote is really in the artefact', () => {
    const out = enforceQuoteRule(
      [scored({ verdict: 'holds', quote: 'cut their reporting cycle from nine days to two' })],
      ARTEFACT,
    );
    expect(out[0].verdict).toBe('holds');
    expect(out[0].adjustments).toHaveLength(0);
  });

  it('drops a fabricated quote to insufficient evidence and reports the drop', () => {
    const out = enforceQuoteRule(
      [scored({ verdict: 'breaks', quote: 'we unlock transformational outcomes for our clients' })],
      ARTEFACT,
    );
    expect(out[0].verdict).toBe(INSUFFICIENT);
    expect(out[0].quote).toBe('');
    expect(out[0].adjustments).toEqual([{ rule: 'quote', from: 'breaks', reason: 'not_found' }]);
    expect(enforcementReport(out).droppedForQuote).toBe(1);
  });

  it('drops a verdict with no quote at all', () => {
    const out = enforceQuoteRule([scored({ verdict: 'breaks', quote: '' })], ARTEFACT);
    expect(out[0].verdict).toBe(INSUFFICIENT);
    expect(out[0].adjustments[0]).toMatchObject({ rule: 'quote', reason: 'missing' });
  });

  it('drops a quote too short to locate a passage', () => {
    const out = enforceQuoteRule([scored({ verdict: 'breaks', quote: 'the' })], ARTEFACT);
    expect(out[0].verdict).toBe(INSUFFICIENT);
    expect(out[0].adjustments[0]).toMatchObject({ rule: 'quote', reason: 'too_short' });
  });

  it('is not fuzzy: one changed word fails', () => {
    const out = enforceQuoteRule(
      [scored({ verdict: 'holds', quote: 'cut their reporting cycle from ten days to two' })],
      ARTEFACT,
    );
    expect(out[0].verdict).toBe(INSUFFICIENT);
  });

  it('survives reflowed whitespace and curly quotes, which are not paraphrase', () => {
    const artefact = 'The client said “we do not want a deck”, about progress reports.';
    const out = enforceQuoteRule(
      [scored({ verdict: 'holds', quote: 'said  "we do not\n want a deck"' })],
      artefact,
    );
    expect(out[0].verdict).toBe('holds');
  });

  it('strips the revision when it drops a verdict it can no longer stand behind', () => {
    const out = enforceQuoteRule(
      [scored({ verdict: 'breaks', quote: 'nowhere in the piece at all', revision: 'a fix' })],
      ARTEFACT,
    );
    expect(out[0].revision).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Borderline needs a named change
// ---------------------------------------------------------------------------

describe('enforceBorderlineRule', () => {
  it('keeps a borderline that names the single change to holds', () => {
    const out = enforceBorderlineRule([
      scored({ verdict: 'borderline', changeToHolds: 'Name the finance lead who signed it off.' }),
    ]);
    expect(out[0].verdict).toBe('borderline');
    expect(out[0].adjustments).toHaveLength(0);
  });

  it('turns a borderline with no named change into a breaks, and says so', () => {
    const out = enforceBorderlineRule([scored({ verdict: 'borderline', changeToHolds: null })]);
    expect(out[0].verdict).toBe('breaks');
    expect(out[0].adjustments).toEqual([{ rule: 'borderline', from: 'borderline' }]);
    expect(enforcementReport(out).borderlineToBreaks).toBe(1);
  });

  it('runs after the quote rule, so an unquotable borderline is not promoted', () => {
    const { verdicts } = enforceLens(
      [{
        criterion_id: 'C1',
        verdict: 'borderline',
        quote: 'a passage that is not in the work',
        sentence: 'reads thin',
      }],
      ARTEFACT,
      { lens: 'standard', allowed: [criterion()] },
    );
    expect(verdicts[0].verdict).toBe(INSUFFICIENT);
  });
});

// ---------------------------------------------------------------------------
// Never invent a criterion, never more than seven
// ---------------------------------------------------------------------------

describe('capCriteria', () => {
  const many = Array.from({ length: 9 }, (_, i) =>
    criterion({ id: `c-${i}`, shortId: `C${i}`, name: `Criterion ${i}`, weight: 'important' }));

  it('scores at most seven and reports the overflow', () => {
    const { scored: kept, dropped, overCap } = capCriteria(many);
    expect(kept).toHaveLength(7);
    expect(dropped).toHaveLength(2);
    expect(overCap).toBe(true);
  });

  it('loads essential first, then pitfall, then important', () => {
    const { scored: kept } = capCriteria([
      criterion({ id: 'a', name: 'important one', weight: 'important' }),
      criterion({ id: 'b', name: 'pitfall one', weight: 'pitfall' }),
      criterion({ id: 'c', name: 'essential one', weight: 'essential' }),
    ]);
    expect(kept.map((c) => c.name)).toEqual(['essential one', 'pitfall one', 'important one']);
  });

  it('does not report an overflow for a rubric that fits', () => {
    expect(capCriteria([criterion()]).overCap).toBe(false);
  });
});

describe('admitVerdicts', () => {
  it('drops a criterion nobody loaded and names it', () => {
    const { verdicts, invented } = admitVerdicts(
      [
        { criterion_id: 'C1', verdict: 'holds', quote: 'x' },
        { criterion_name: 'Tone of voice', verdict: 'breaks', quote: 'y' },
      ],
      { lens: 'standard', allowed: [criterion()] },
    );
    expect(verdicts).toHaveLength(1);
    expect(invented).toEqual(['Tone of voice']);
  });

  it('labels a house lens as CTRL\'s check and never as their rule', () => {
    const { verdicts } = admitVerdicts(
      [{ criterion_id: 'house.signature', verdict: 'breaks', quote: 'x' }],
      {
        lens: 'signature',
        allowed: [criterion({ id: 'house.signature', shortId: 'H2', name: 'Only they could have written it' })],
      },
    );
    expect(verdicts[0].label).toBe("CTRL's check");
    expect(verdicts[0].criterionId).toBeNull();
  });

  it('treats an unrecognised verdict word as insufficient evidence, never as a pass', () => {
    const { verdicts } = admitVerdicts(
      [{ criterion_id: 'C1', verdict: 'mostly fine', quote: 'x' }],
      { lens: 'standard', allowed: [criterion()] },
    );
    expect(verdicts[0].verdict).toBe(INSUFFICIENT);
  });
});

// ---------------------------------------------------------------------------
// Never a bare rejection
// ---------------------------------------------------------------------------

describe('markUnrepaired', () => {
  it('flags a breaks that reached the terminal pass with no revision', () => {
    const out = markUnrepaired([scored({ verdict: 'breaks', quote: 'q', revision: null })]);
    expect(isUnrepaired(out[0])).toBe(true);
    expect(enforcementReport(out).unrepaired).toBe(1);
  });

  it('leaves a repaired breaks alone', () => {
    const out = markUnrepaired([scored({ verdict: 'breaks', revision: 'the fixed sentence' })]);
    expect(isUnrepaired(out[0])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Exemplar retrieval
// ---------------------------------------------------------------------------

describe('selectExemplars', () => {
  const items: GradedItem[] = [
    { id: '1', body: 'Reporting cycle cut from nine days to two, signed off by finance.', verdict: 'send', why: 'has the number' },
    { id: '2', body: 'We unlock transformational outcomes across the enterprise.', verdict: 'would_not_send', why: 'says nothing' },
    { id: '3', body: 'Pipeline pilot runs for two weeks starting Monday.', verdict: 'send', why: null },
    { id: '4', body: 'Cooking notes about a weekend risotto recipe.', verdict: 'send', why: null },
    { id: '5', body: 'Held out piece about reporting cycles and finance sign off.', verdict: 'send', why: null, heldOut: true },
  ];

  it('returns the nearest graded items by token overlap, best first', () => {
    const { exemplars } = selectExemplars(ARTEFACT, items);
    expect(exemplars[0].id).toBe('1');
    expect(exemplars[0].overlap).toBeGreaterThan(exemplars[exemplars.length - 1].overlap);
  });

  it('never retrieves a hold-out item', () => {
    const { exemplars } = selectExemplars(ARTEFACT, items);
    expect(exemplars.map((e) => e.id)).not.toContain('5');
  });

  it('caps at five and floors at three, reporting a short set', () => {
    expect(selectExemplars(ARTEFACT, items).exemplars).toHaveLength(4);
    expect(selectExemplars(ARTEFACT, items.slice(0, 2)).short).toBe(true);
    expect(selectExemplars(ARTEFACT, items.slice(0, 2)).none).toBe(false);
  });

  it('says plainly when there is nothing graded, rather than running zero-shot', () => {
    const empty = selectExemplars(ARTEFACT, []);
    expect(empty.none).toBe(true);
    expect(empty.exemplars).toHaveLength(0);
  });

  it('reports whether both poles made the retrieved set', () => {
    expect(selectExemplars(ARTEFACT, items).bothPoles).toBe(true);
    expect(selectExemplars(ARTEFACT, [items[0], items[2]]).bothPoles).toBe(false);
  });

  it('is deterministic: the same corpus retrieves the same neighbours', () => {
    const a = selectExemplars(ARTEFACT, items).exemplars.map((e) => e.id);
    const b = selectExemplars(ARTEFACT, items).exemplars.map((e) => e.id);
    expect(a).toEqual(b);
  });

  it('scores overlap on content words, not on stopwords', () => {
    expect(tokenOverlap('the and of a', 'the and of a')).toBe(0);
    expect(tokenOverlap('reporting cycle finance', 'reporting cycle finance')).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Provider routing (CH-14)
// ---------------------------------------------------------------------------

describe('resolveProviderOrder', () => {
  it('defaults to today\'s order so no existing caller changes behaviour', () => {
    expect(resolveProviderOrder(undefined, ['openai', 'gemini'])).toEqual(['openai', 'gemini']);
    expect(resolveProviderOrder([], ['openai', 'gemini'])).toEqual(['openai', 'gemini']);
  });

  it('honours a named order exactly', () => {
    expect(resolveProviderOrder(['gemini', 'openai'], ['openai', 'gemini'])).toEqual(['gemini', 'openai']);
  });

  it('skips a preferred provider that is not configured', () => {
    expect(resolveProviderOrder(['gemini', 'openai'], ['openai'])).toEqual(['openai']);
  });

  it('never widens a preference to a provider the caller did not name', () => {
    expect(resolveProviderOrder(['gemini'], ['openai'])).toEqual([]);
  });
});

describe('pickJudgeProvider', () => {
  it('picks a provider that is not the one that generated the artefact', () => {
    expect(pickJudgeProvider('openai', ['openai', 'gemini'])).toBe('gemini');
    expect(pickJudgeProvider('gemini', ['openai', 'gemini'])).toBe('openai');
  });

  it('returns null rather than letting a generator judge itself', () => {
    expect(pickJudgeProvider('openai', ['openai'])).toBeNull();
    expect(pickJudgeProvider('gemini', ['gemini'])).toBeNull();
  });

  it('returns null when nothing is configured', () => {
    expect(pickJudgeProvider('openai', [])).toBeNull();
    expect(pickJudgeProvider(null, [])).toBeNull();
  });

  it('uses the first available provider when no generator was recorded', () => {
    expect(pickJudgeProvider(null, ['openai', 'gemini'])).toBe('openai');
    expect(pickJudgeProvider('unknown', ['gemini'])).toBe('gemini');
  });
});

// ---------------------------------------------------------------------------
// The ledger row (CH-01)
// ---------------------------------------------------------------------------

describe('isoWeek', () => {
  it('uses the ISO week-numbering year, not the calendar year', () => {
    expect(isoWeek(new Date('2026-01-01T00:00:00Z'))).toBe('2026-W01');
    expect(isoWeek(new Date('2026-08-05T09:30:00Z'))).toBe('2026-W32');
    expect(isoWeek(new Date('2027-01-01T00:00:00Z'))).toBe('2026-W53');
    expect(isoWeek(new Date('2024-12-30T00:00:00Z'))).toBe('2025-W01');
    expect(isoWeek(new Date('2021-01-03T00:00:00Z'))).toBe('2020-W53');
  });
});

describe('buildLedgerRow', () => {
  const base = {
    userId: 'u-1',
    surface: 'client updates',
    criterionId: 'c-1',
    criterionName: 'Earned claim',
    verdict: 'breaks' as const,
    quote: 'we helped the team cut their reporting cycle from nine days to two, signed off by their finance lead, in Q2',
    at: new Date('2026-08-05T09:30:00Z'),
  };

  it('writes accepted when they agree', () => {
    expect(buildLedgerRow({ ...base, response: 'agree' })).toMatchObject({
      user_id: 'u-1',
      week: '2026-W32',
      surface: 'client updates',
      signal: 'output',
      criterion_id: 'c-1',
      criterion_name: 'Earned claim',
      verdict: 'breaks',
      disposition: 'accepted',
    });
  });

  it('writes rejected when they push back, which is the load-bearing row', () => {
    expect(buildLedgerRow({ ...base, response: 'push_back' }).disposition).toBe('rejected');
  });

  it('writes unknown rather than guessing when there was no response', () => {
    expect(buildLedgerRow({ ...base, response: null }).disposition).toBe('unknown');
    expect(buildLedgerRow(base).disposition).toBe('unknown');
  });

  it('truncates the quote to about fifteen words', () => {
    const row = buildLedgerRow({ ...base, response: 'agree' });
    expect(row.quote?.split(' ').length).toBeLessThanOrEqual(16);
    expect(row.quote?.endsWith('...')).toBe(true);
  });

  it('carries a null criterion id for a house check', () => {
    const row = buildLedgerRow({
      ...base,
      criterionId: null,
      criterionName: 'Only they could have written it',
      response: 'push_back',
    });
    expect(row.criterion_id).toBeNull();
    expect(row.criterion_name).toBe('Only they could have written it');
  });

  it('carries an uncovered observation as its own row type', () => {
    const row = buildLedgerRow({
      ...base,
      criterionId: null,
      criterionName: 'uncovered',
      verdict: 'uncovered',
      response: 'agree',
    });
    expect(row.verdict).toBe('uncovered');
  });

  it('leaves no quote as null rather than an empty string', () => {
    expect(truncateQuote('   ')).toBeNull();
    expect(buildLedgerRow({ ...base, quote: null, response: 'agree' }).quote).toBeNull();
  });
});

describe('ledgerVerdictFor', () => {
  it('refuses to write a row for a criterion that was never scored', () => {
    expect(ledgerVerdictFor(INSUFFICIENT)).toBeNull();
    expect(ledgerVerdictFor('breaks')).toBe('breaks');
  });
});

// ---------------------------------------------------------------------------
// The mechanical pass
// ---------------------------------------------------------------------------

describe('mechanicalFindings', () => {
  it('quotes the offending text rather than describing it', () => {
    const findings = mechanicalFindings("In today's fast-paced world, we delve into synergy.");
    const ids = findings.map((f) => f.id);
    expect(ids).toContain('mech.windupOpener');
    expect(ids).toContain('mech.nobodySaysThis');
    expect(findings[0].quote.length).toBeGreaterThan(0);
  });

  it('never reads inside a verbatim span (CH-16)', () => {
    const quote = 'we leverage synergy to unlock value';
    const body = `Their own rejected line was: ${quote}. The rest is clean prose here.`;
    expect(mechanicalFindings(body, [quote])).toHaveLength(0);
  });

  it('reports only, and never rewrites the submission', () => {
    const body = `A sentence with a long dash${String.fromCharCode(0x2014)}right here.`;
    const findings = mechanicalFindings(body);
    expect(findings.map((f) => f.id)).toContain('mech.longDash');
    expect(body).toContain(String.fromCharCode(0x2014));
  });
});
