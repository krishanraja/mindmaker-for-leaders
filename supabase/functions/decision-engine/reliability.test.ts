import { describe, it, expect } from 'vitest';
import { scoreEvidence, buildEvidenceRow } from './reliability';
import type { Evidence } from './types';

/**
 * The single 0-100 evidence score is what the Decisions tab renders as a compact trust ring, so
 * its formula needs to be pinned: tier is the spine, freshness and relevance each move it a
 * little, and corroboration adds a capped bump. These cases use a NULL published date wherever
 * possible so the freshness term is the deterministic neutral 0.6 (no dependency on the clock).
 */
describe('scoreEvidence', () => {
  it('weights a primary, undated source high', () => {
    // artificialanalysis -> primary tier (100); relevance null -> 0.7; published null -> 0.6.
    // 100*0.6 + 0.6*100*0.2 + 0.7*100*0.2 = 60 + 12 + 14 = 86.
    expect(scoreEvidence({ retriever: 'artificialanalysis', source_type: 'artificialanalysis', published_at: null, relevance_score: null }, 0)).toBe(86);
  });

  it('weights an unknown-provenance source low', () => {
    // brave with no url -> unverified tier (30). 30*0.6 + 12 + 14 = 44.
    expect(scoreEvidence({ retriever: 'brave', source_type: 'brave', source_url: null, published_at: null, relevance_score: null }, 0)).toBe(44);
  });

  it('adds a corroboration bump, capped at 3 independent sources', () => {
    const base = { retriever: 'brave', source_type: 'brave', source_url: null, published_at: null, relevance_score: null };
    expect(scoreEvidence(base, 0)).toBe(44);
    expect(scoreEvidence(base, 3)).toBe(59); // +15
    expect(scoreEvidence(base, 9)).toBe(59); // still +15 (capped)
  });

  it('rewards fresher sources over stale ones at the same tier', () => {
    const recent = { retriever: 'exa', source_type: 'exa', source_url: 'https://x.test/a', published_at: new Date().toISOString(), relevance_score: 0.8 };
    const old = { ...recent, published_at: new Date(Date.now() - 1000 * 86_400_000).toISOString() };
    expect(scoreEvidence(recent, 0)).toBeGreaterThan(scoreEvidence(old, 0));
  });

  it('never punishes a null relevance below the neutral default', () => {
    const withRel = { retriever: 'exa', source_type: 'exa', source_url: 'https://x.test/a', published_at: null, relevance_score: 0.7 };
    const noRel = { ...withRel, relevance_score: null };
    expect(scoreEvidence(noRel, 0)).toBe(scoreEvidence(withRel, 0));
  });

  it('clamps to 0..100', () => {
    const s = scoreEvidence({ retriever: 'artificialanalysis', source_type: 'artificialanalysis', published_at: new Date().toISOString(), relevance_score: 1 }, 9);
    expect(s).toBeLessThanOrEqual(100);
    expect(s).toBeGreaterThanOrEqual(0);
  });
});

describe('buildEvidenceRow', () => {
  const ev: Evidence = {
    source_url: 'https://techcrunch.com/article',
    source_title: 'An AI agent story',
    excerpt: 'A new AI agent framework shipped.',
    stance: 'supports',
    retriever: 'exa',
    relevance_score: 0.9,
    published_at: '2026-06-01T00:00:00Z',
  };

  it('stamps tier, published_at and a numeric score onto the insert row', () => {
    const row = buildEvidenceRow(ev, { userId: 'u1', claimId: 'c1', corroboration: 2 });
    expect(row.claim_id).toBe('c1');
    expect(row.user_id).toBe('u1');
    expect(row.reliability_tier).toBe('reputable'); // techcrunch.com is a reputable host
    expect(row.published_at).toBe('2026-06-01T00:00:00Z');
    expect(typeof row.evidence_score).toBe('number');
    expect(row.evidence_score).toBeGreaterThan(0);
    expect(row.stance).toBe('supports');
    expect(row.retriever).toBe('exa');
  });

  it('defaults published_at to null when the retriever did not surface one', () => {
    const row = buildEvidenceRow({ ...ev, published_at: undefined }, { userId: 'u1', claimId: 'c1', corroboration: 0 });
    expect(row.published_at).toBeNull();
  });
});
