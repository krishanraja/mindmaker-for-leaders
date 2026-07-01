import { describe, it, expect } from 'vitest';
import { cleanEvidenceText, sourceDomain, shortAge } from './decisionParts';

describe('cleanEvidenceText', () => {
  it('strips HTML tags', () => {
    expect(cleanEvidenceText('The table shows <strong>$0</strong> per call')).toBe('The table shows $0 per call');
  });

  it('strips markdown heading / emphasis markers but keeps the words', () => {
    expect(cleanEvidenceText('## Bottom line **DeepSeek** wins')).toBe('Bottom line DeepSeek wins');
  });

  it('drops a trailing SEO site-name segment', () => {
    expect(cleanEvidenceText('DeepSeek V3 vs GPT-4o pricing | Future AGI')).toBe('DeepSeek V3 vs GPT-4o pricing');
  });

  it('keeps a pipe when the lead segment is too short to be a real title', () => {
    // "A | B" - lead segment under 12 chars, so it is not treated as a title tail.
    expect(cleanEvidenceText('A | B')).toBe('A | B');
  });

  it('normalises em/en dashes to hyphens and collapses whitespace', () => {
    expect(cleanEvidenceText('DeepSeek   V3 \u2014 cheaper')).toBe('DeepSeek V3 - cheaper');
  });

  it('decodes common HTML entities', () => {
    expect(cleanEvidenceText('cost &amp; latency &#39;win&#39;')).toBe("cost & latency 'win'");
  });

  it('handles null / empty', () => {
    expect(cleanEvidenceText(null)).toBe('');
    expect(cleanEvidenceText('')).toBe('');
    expect(cleanEvidenceText('   ')).toBe('');
  });
});

describe('sourceDomain', () => {
  it('returns the bare domain, stripping www', () => {
    expect(sourceDomain('https://artificialanalysis.ai/models')).toBe('artificialanalysis.ai');
    expect(sourceDomain('https://www.futureagi.com/blog/x')).toBe('futureagi.com');
  });

  it('returns empty on bad / missing input', () => {
    expect(sourceDomain(null)).toBe('');
    expect(sourceDomain('not a url')).toBe('');
  });
});

describe('shortAge', () => {
  const base = new Date('2026-07-01T00:00:00Z');

  it('compacts months and days', () => {
    expect(shortAge('2026-05-01T00:00:00Z', base)).toBe('2mo');
    expect(shortAge('2026-06-26T00:00:00Z', base)).toBe('5d');
  });

  it('returns empty when the date is missing or unparseable', () => {
    expect(shortAge(null, base)).toBe('');
    expect(shortAge('nonsense', base)).toBe('');
  });
});
