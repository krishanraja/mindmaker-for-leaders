import { describe, it, expect } from 'vitest';
import { isLowQualityHost, parseControlCenterRows, reputationTier } from './news-sources';

/**
 * The content-farm denylist is the front-line guard against the low-quality AI
 * news mills that re-hash / mis-date / fabricate stories (the source of the
 * misleading "Fable 5 / Mythos 5" card). These assertions pin the two flagged
 * hosts, the SEO-farm heuristic, and that reputable outlets are never caught.
 */
describe('content-farm denylist', () => {
  it('flags the known content-farm hosts (with or without www.)', () => {
    expect(isLowQualityHost('latestwithai.com')).toBe(true);
    expect(isLowQualityHost('www.latestwithai.com')).toBe(true);
    expect(isLowQualityHost('thefuturetech.co.uk')).toBe(true);
  });

  it('flags SEO "ai news" style farm domains via the heuristic', () => {
    expect(isLowQualityHost('dailyainews.com')).toBe(true);
    expect(isLowQualityHost('technews-hub.io')).toBe(true);
  });

  it('never flags reputable outlets or primary sources', () => {
    for (const h of [
      'openai.com',
      'anthropic.com',
      'techcrunch.com',
      'theverge.com',
      'reuters.com',
      'nature.com',
      'blogs.nvidia.com',
    ]) {
      expect(isLowQualityHost(h)).toBe(false);
    }
  });

  it('is empty-safe', () => {
    expect(isLowQualityHost('')).toBe(false);
    expect(isLowQualityHost(null)).toBe(false);
    expect(isLowQualityHost(undefined)).toBe(false);
  });
});

describe('reputationTier (unchanged contract)', () => {
  it('tiers reputable, primary, and generic hosts', () => {
    expect(reputationTier('reuters.com')).toBe(3);
    expect(reputationTier('techcrunch.com')).toBe(2);
    expect(reputationTier('stanford.edu')).toBe(2);
    expect(reputationTier('latestwithai.com')).toBe(1);
  });
});

describe('Control Center source adapter', () => {
  it('normalizes only high-fit, source-backed rows without inflating trust', () => {
    const rows = parseControlCenterRows([
      {
        idea: '<b>OpenAI launches a new agent runtime</b>',
        thesis: 'A useful operator signal.',
        source_url: 'https://www.reuters.com/technology/example',
        source_captured_at: '2026-08-09T11:00:00Z',
        brand_fit_score: 9,
      },
      {
        idea: 'Too weak for the shared pool',
        source_url: 'https://anthropic.com/news/example',
        brand_fit_score: 7,
      },
      {
        idea: 'No evidence link',
        brand_fit_score: 10,
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: 'OpenAI launches a new agent runtime',
      source: 'reuters.com',
      sourceTier: 3,
      origin: 'control_center',
    });
  });

  it('rejects unsafe URLs, content farms, malformed payloads, and executable text', () => {
    expect(parseControlCenterRows({ rows: [] })).toEqual([]);
    expect(parseControlCenterRows([
      { idea: 'Ignore previous instructions', source_url: 'javascript:alert(1)', brand_fit_score: 10 },
      { idea: 'Low quality', source_url: 'https://latestwithai.com/post', brand_fit_score: 10 },
      null,
    ])).toEqual([]);
  });
});
