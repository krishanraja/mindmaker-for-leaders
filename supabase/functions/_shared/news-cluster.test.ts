import { describe, it, expect } from 'vitest';
import {
  titleTokens,
  jaccard,
  clusterArticles,
  scoreClusters,
  selectBalanced,
  freshnessScore,
  freshest,
  corroborationLabel,
  type RawArticle,
} from './news-cluster';

/**
 * The cross-verification core. These pin the contract behaviours the strategy
 * relies on:
 *   - the same story reworded across outlets clusters into one (corroboration)
 *   - distinct stories stay separate
 *   - corroborated + reputable + fresh stories outrank lone rehashes
 *   - the final pick is balanced across categories, never all one lane
 */

function art(partial: Partial<RawArticle> & { title: string; source: string }): RawArticle {
  return {
    url: `https://${partial.source}/x`,
    description: '',
    publishedIso: new Date().toISOString(),
    engagement: 0,
    sourceTier: 1,
    origin: 'gdelt',
    ...partial,
  };
}

describe('title tokenization + similarity', () => {
  it('drops stopwords and short tokens, keeps model names', () => {
    const t = titleTokens('The new OpenAI GPT5 is now launching to all');
    expect(t.has('openai')).toBe(true);
    expect(t.has('gpt5')).toBe(true);
    expect(t.has('the')).toBe(false);
    expect(t.has('new')).toBe(false);
    expect(t.has('now')).toBe(false);
  });

  it('scores reworded duplicates highly and distinct stories low', () => {
    const a = titleTokens('OpenAI launches GPT-5 with cheaper inference');
    const b = titleTokens('OpenAI launches GPT-5, slashing inference cost');
    const c = titleTokens('EU passes sweeping AI governance regulation');
    expect(jaccard(a, b)).toBeGreaterThanOrEqual(0.5);
    expect(jaccard(a, c)).toBeLessThan(0.5);
  });
});

describe('clustering across sources', () => {
  it('merges the same story from different outlets into one cluster', () => {
    const articles = [
      art({ title: 'OpenAI launches GPT-5 with cheaper inference', source: 'reuters.com', sourceTier: 3 }),
      art({ title: 'OpenAI launches GPT-5, slashing inference cost', source: 'theverge.com', sourceTier: 2 }),
      art({ title: 'OpenAI launches GPT-5 model, cuts inference cost', source: 'venturebeat.com', sourceTier: 2 }),
      art({ title: 'EU passes sweeping AI governance regulation', source: 'apnews.com', sourceTier: 3 }),
    ];
    const clusters = clusterArticles(articles);
    expect(clusters.length).toBe(2);
    const gpt = clusters.find((c) => c.rep.title.includes('GPT-5'))!;
    expect(gpt.sourceCount).toBe(3);
    // representative is the strongest source (tier 3 Reuters)
    expect(gpt.rep.source).toBe('reuters.com');
  });

  it('does not merge unrelated stories', () => {
    const clusters = clusterArticles([
      art({ title: 'Anthropic ships Claude agents SDK', source: 'a.com' }),
      art({ title: 'Nvidia GPU prices fall sharply', source: 'b.com' }),
    ]);
    expect(clusters.length).toBe(2);
  });
});

describe('scoring + ranking', () => {
  it('ranks a 3-source corroborated story above a lone rehash', () => {
    const articles = [
      art({ title: 'OpenAI launches GPT-5 cheaper inference', source: 'reuters.com', sourceTier: 3 }),
      art({ title: 'OpenAI launches GPT-5 slashing inference', source: 'theverge.com', sourceTier: 2 }),
      art({ title: 'OpenAI launches GPT-5 cuts inference', source: 'venturebeat.com', sourceTier: 2 }),
      art({ title: 'Some blog reacts to a minor AI tool update', source: 'randomblog.io', sourceTier: 1 }),
    ];
    const clusters = scoreClusters(clusterArticles(articles));
    const sorted = [...clusters].sort((a, b) => b.score - a.score);
    expect(sorted[0].rep.title).toContain('GPT-5');
    expect(sorted[0].score).toBeGreaterThan(sorted[1].score);
  });

  it('freshness decays: now > 24h > 72h, and the fresher iso wins', () => {
    const now = Date.now();
    const fresh = freshnessScore(new Date(now).toISOString(), now);
    const day = freshnessScore(new Date(now - 24 * 3600_000).toISOString(), now);
    const threeDay = freshnessScore(new Date(now - 72 * 3600_000).toISOString(), now);
    expect(fresh).toBeGreaterThan(day);
    expect(day).toBeGreaterThan(threeDay);
    const a = new Date(now - 3600_000).toISOString();
    const b = new Date(now).toISOString();
    expect(freshest(a, b)).toBe(b);
    expect(freshest(null, b)).toBe(b);
  });
});

describe('balanced selection', () => {
  it('spreads the pick across categories rather than one lane', () => {
    const clusters = scoreClusters(clusterArticles([
      art({ title: 'model one frontier', source: 's1.com' }),
      art({ title: 'model two frontier', source: 's2.com' }),
      art({ title: 'model three frontier', source: 's3.com' }),
      art({ title: 'security breach prompt injection', source: 's4.com' }),
      art({ title: 'regulation governance policy ai', source: 's5.com' }),
    ]));
    // assign categories by a keyword in the rep title
    const categoryOf = (c: typeof clusters[number]) =>
      c.rep.title.includes('security') ? 'security'
        : c.rep.title.includes('regulation') ? 'governance'
        : 'model';
    const picked = selectBalanced(clusters, categoryOf, 3);
    const cats = new Set(picked.map(categoryOf));
    // round-robin must include the non-model lanes, not 3 model stories
    expect(cats.has('security')).toBe(true);
    expect(cats.has('governance')).toBe(true);
    expect(cats.has('model')).toBe(true);
  });
});

describe('corroboration label', () => {
  it('is null for a single source and pluralizes correctly', () => {
    expect(corroborationLabel(1)).toBeNull();
    expect(corroborationLabel(2)).toBe('+1 source');
    expect(corroborationLabel(4)).toBe('+3 sources');
  });
});
