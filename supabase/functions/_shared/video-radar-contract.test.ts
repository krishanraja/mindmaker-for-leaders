import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildVideoRadarCandidates, headlineToRadar, trendToRadar } from './video-radar-contract';

describe('video radar contract', () => {
  it('keeps the committed cross-repository fixture on schema major one', async () => {
    const fixture = JSON.parse(await readFile(join(process.cwd(), 'supabase/functions/_shared/fixtures/video-radar-v1.json'), 'utf8'));
    expect(fixture.schema_version).toBe(1);
    expect(fixture.provider).toBe('mm_ctrl');
    expect(fixture.candidates[0].sensitivity).toBe('public');
  });
  it('maps the shared headline pool without exposing internal objects', async () => {
    const candidate = await headlineToRadar({ id: 'raw-id', headline: 'Agent costs move into workflow design', say: 'The model bill is no longer the expensive part.', source: 'example.com', sourceCount: 3, url: 'https://example.com/story', category: 'economics', score: 12 }, '2026-08-28');
    expect(candidate?.source_urls).toEqual(['https://example.com/story']);
    expect(candidate?.corroboration).toBe(3);
    expect(candidate?.source_ref_hash).not.toContain('raw-id');
    expect(candidate?.sensitivity).toBe('public');
  });

  it('drops ungrounded trends and preserves grounded evidence URLs', async () => {
    const base = { id: 'trend-id', detected_on: '2026-08-25', category: 'work', title: 'Forward deployed builders', summary: 'Teams are moving builders closer to users.', implication: 'Organisation design changes.', source_count: 2, momentum: 0.8 };
    expect(await trendToRadar({ ...base, evidence: [] })).toBeNull();
    const grounded = await trendToRadar({ ...base, evidence: [{ url: 'https://one.test/a', date: '2026-08-26' }, { url: 'https://two.test/b', date: '2026-08-27' }] });
    expect(grounded?.source_urls).toHaveLength(2);
    expect(grounded?.corroboration).toBe(2);
  });

  it('caps the combined output deterministically', async () => {
    const items = await buildVideoRadarCandidates([
      { id: 'a', headline: 'A valid story', say: 'A', source: 'a', sourceCount: 1, url: 'https://a.test', category: 'model', score: 1 },
      { id: 'b', headline: 'A stronger story', say: 'B', source: 'b', sourceCount: 2, url: 'https://b.test', category: 'model', score: 9 },
    ], '2026-08-28', [], 1);
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe('A stronger story');
  });
});
