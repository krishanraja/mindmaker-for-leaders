import { describe, it, expect } from 'vitest';
import {
  isAiNative,
  isOffLensTopic,
  isAiNativeBusiness,
  classifyCategory,
  resolveCategory,
  relativeTimeAgo,
  isNewsCategoryId,
  DEFAULT_NEWS_CATEGORY,
} from './news-ai-native';

/**
 * The AI-native lock + the 9-category tagger are the auditable core of the news
 * deck. These assertions pin the two contract cases the spec calls out:
 *   - an AI story about a model price cut -> kept + tagged "economics"
 *   - a generic "company raises a Series B in retail" with no AI angle -> dropped
 * plus the never-null category fallback and the honest relative-time helper.
 */
describe('news AI-native lock', () => {
  it('keeps an AI model price-cut story and tags it economics', () => {
    const headline = 'OpenAI cuts GPT-4o API token price 40%, halving agent inference cost';
    expect(isAiNative(headline)).toBe(true);
    expect(classifyCategory(headline)).toBe('economics');
  });

  it('drops a generic retail Series B with no AI angle', () => {
    const headline = 'Retail startup raises $20M Series B to expand store footprint';
    expect(isAiNative(headline)).toBe(false);
  });

  it('drops a generic exec-hire story with no AI angle', () => {
    expect(isAiNative('Acme Corp appoints new chief financial officer')).toBe(false);
  });
});

describe('off-lens topical exclusion', () => {
  it('drops an AI-in-drug-discovery science story (the BioNeMo case)', () => {
    const headline = 'NVIDIA BioNeMo toolkit enables AI skills for drug discovery';
    // keyword-AI-native, but off the AI-native BUSINESS lens
    expect(isAiNative(headline)).toBe(true);
    expect(isOffLensTopic(headline)).toBe(true);
    expect(isAiNativeBusiness(headline)).toBe(false);
  });

  it.each([
    'DeepMind AI predicts protein folding for a new class of medicine',
    'AI model designs a cancer vaccine in clinical trials',
    'AI telescope pipeline finds a new galaxy in astronomy survey',
    'Humanoid robot uses AI to navigate a warehouse',
    'AI crypto trading bot predicts bitcoin price swings',
  ])('drops off-lens: %s', (headline) => {
    expect(isOffLensTopic(headline)).toBe(true);
    expect(isAiNativeBusiness(headline)).toBe(false);
  });

  it('keeps an off-lens sector story that is really a business/GTM move', () => {
    const headline =
      'AI drug-discovery startup raises $200M Series C and ships an enterprise platform';
    expect(isOffLensTopic(headline)).toBe(false);
    expect(isAiNativeBusiness(headline)).toBe(true);
  });

  it('keeps the core AI-native business stories untouched', () => {
    for (const h of [
      'OpenAI cuts GPT-4o API token price 40%',
      'New agent orchestration framework ships an enterprise SDK',
      'EU AI Act compliance forces model governance audits',
      'Bank reports measurable ROI from AI deployed in production',
    ]) {
      expect(isOffLensTopic(h)).toBe(false);
      expect(isAiNativeBusiness(h)).toBe(true);
    }
  });
});

describe('category classifier (deterministic backstop)', () => {
  const cases: Array<[string, string]> = [
    ['Anthropic ships Claude Opus 4.5 with a 1M token context window', 'model'],
    ['New agent framework SDK adds a vendor integration for the dev stack', 'tools'],
    ['Multi-agent orchestration eval shows agent reliability gains with handoffs', 'orchestration'],
    ['How startups package their AI-native product for go-to-market distribution', 'product'],
    ['EU AI Act compliance deadline forces model governance audits', 'governance'],
    ['Prompt injection exploit leaks data from production AI agents', 'security'],
    ['Companies reskill teams and hire AI engineers as agentic roles emerge', 'org'],
    ['Bank reports measurable ROI from AI deployed in production at scale', 'proof'],
  ];
  it.each(cases)('classifies %s -> %s', (text, expected) => {
    expect(classifyCategory(text)).toBe(expected);
  });

  it('falls back to the default category for AI-native-but-generic text', () => {
    expect(classifyCategory('AI is changing everything')).toBe(DEFAULT_NEWS_CATEGORY);
  });
});

describe('resolveCategory', () => {
  it('trusts a valid LLM-assigned id', () => {
    expect(resolveCategory('security', 'a story about model pricing')).toBe('security');
  });
  it('ignores an invalid LLM id and classifies from text', () => {
    expect(resolveCategory('not-a-real-id', 'GPT-4o token price drops 40%')).toBe('economics');
  });
  it('never returns null', () => {
    expect(isNewsCategoryId(resolveCategory(null, ''))).toBe(true);
  });
});

describe('relativeTimeAgo (honest, never fabricated)', () => {
  const now = Date.parse('2026-06-20T12:00:00Z');
  it('returns Today when no timestamp is available', () => {
    expect(relativeTimeAgo(null, now)).toBe('Today');
    expect(relativeTimeAgo(undefined, now)).toBe('Today');
    expect(relativeTimeAgo('not-a-date', now)).toBe('Today');
  });
  it('formats recent ages', () => {
    expect(relativeTimeAgo('2026-06-20T11:30:00Z', now)).toBe('30m ago');
    expect(relativeTimeAgo('2026-06-20T09:00:00Z', now)).toBe('3h ago');
    expect(relativeTimeAgo('2026-06-19T12:00:00Z', now)).toBe('Yesterday');
    expect(relativeTimeAgo('2026-06-17T12:00:00Z', now)).toBe('3d ago');
  });
});
