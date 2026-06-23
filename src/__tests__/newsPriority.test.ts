import { describe, it, expect } from 'vitest';
import {
  priorityScore,
  rankByPreferences,
  categoriesForGroups,
  groupsForCategories,
  type NewsPreferences,
  type RankableCard,
} from '@/lib/newsPriority';

const balanced: NewsPreferences = { boosted: [], bias: 'balanced' };

describe('priority group mapping', () => {
  it('maps selected groups to their category ids', () => {
    const cats = categoriesForGroups(['capability', 'commercial']);
    expect(cats).toEqual(expect.arrayContaining(['model', 'economics', 'product']));
    expect(cats).not.toContain('governance');
  });
  it('round-trips groups <-> categories', () => {
    const cats = categoriesForGroups(['build']);
    expect(groupsForCategories(cats)).toContain('build');
  });
});

describe('priorityScore', () => {
  it('lifts a chosen lane above an unchosen one of equal world-importance', () => {
    const prefs: NewsPreferences = { boosted: ['model'], bias: 'balanced' };
    const chosen: RankableCard = { category: 'model', score: 5 };
    const other: RankableCard = { category: 'governance', score: 5 };
    expect(priorityScore(chosen, prefs)).toBeGreaterThan(priorityScore(other, prefs));
  });
  it('practical bias lifts tools/proof over a frontier-model story', () => {
    const prefs: NewsPreferences = { boosted: [], bias: 'practical' };
    const tool: RankableCard = { category: 'tools', score: 4 };
    const model: RankableCard = { category: 'model', score: 4 };
    expect(priorityScore(tool, prefs)).toBeGreaterThan(priorityScore(model, prefs));
  });
  it('big-moves bias lifts a multi-source story', () => {
    const prefs: NewsPreferences = { boosted: [], bias: 'big' };
    const corroborated: RankableCard = { category: 'model', score: 4, sourceCount: 3 };
    const lone: RankableCard = { category: 'model', score: 4, sourceCount: 1 };
    expect(priorityScore(corroborated, prefs)).toBeGreaterThan(priorityScore(lone, prefs));
  });
});

describe('rankByPreferences', () => {
  it('puts the leader-chosen lane first', () => {
    const prefs: NewsPreferences = { boosted: ['economics'], bias: 'balanced' };
    const cards: RankableCard[] = [
      { category: 'model', score: 6 },
      { category: 'economics', score: 5 },
      { category: 'governance', score: 6 },
    ];
    const ranked = rankByPreferences(cards, prefs);
    expect(ranked[0].category).toBe('economics');
  });
  it('caps a single lane for variety, overflow appended last', () => {
    const cards: RankableCard[] = [
      { category: 'model', score: 9 },
      { category: 'model', score: 8 },
      { category: 'model', score: 7 },
      { category: 'model', score: 6 },
      { category: 'tools', score: 1 },
    ];
    const ranked = rankByPreferences(cards, balanced, 2);
    // first three keep variety: 2 model max before tools appears in the kept set
    const firstThree = ranked.slice(0, 3).map((c) => c.category);
    expect(firstThree.filter((c) => c === 'model').length).toBeLessThanOrEqual(2);
    expect(firstThree).toContain('tools');
    expect(ranked.length).toBe(5); // nothing lost
  });
});
