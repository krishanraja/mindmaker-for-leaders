import { describe, expect, it } from 'vitest';
import {
  isStale,
  maxCriteriaVersion,
  stalenessNote,
  withStalenessNote,
} from './staleness.ts';

/**
 * The failure these tests exist to prevent is a silent one: a pull that returns
 * a body compiled against version 2 of a standard now sitting at version 3,
 * with nothing in the response saying so. Both sides then believe they are
 * current, which is the exact drift CH-02 describes.
 *
 * So the assertions are about what is SAID, not only about the boolean.
 */

describe('maxCriteriaVersion', () => {
  it('is 0 when there are no criteria at all', () => {
    expect(maxCriteriaVersion([])).toBe(0);
    expect(maxCriteriaVersion(null)).toBe(0);
    expect(maxCriteriaVersion(undefined)).toBe(0);
  });

  it('takes the highest version present', () => {
    expect(maxCriteriaVersion([{ version: 1 }, { version: 4 }, { version: 2 }])).toBe(4);
  });

  it('ignores rows whose version is not a real count', () => {
    expect(
      maxCriteriaVersion([
        { version: 3 },
        { version: null },
        { version: 'seven' },
        { version: Number.NaN },
        { version: -2 },
      ]),
    ).toBe(3);
  });
});

describe('isStale', () => {
  it('is false when the versions match', () => {
    expect(isStale({ artifactCriteriaVersion: 3, currentCriteriaVersion: 3 })).toBe(false);
  });

  it('is true when the standard has moved past the artefact', () => {
    expect(isStale({ artifactCriteriaVersion: 2, currentCriteriaVersion: 3 })).toBe(true);
  });

  it('is true when the artefact is somehow AHEAD of the standard', () => {
    // A rebuilt criteria row, a restore, a partial delete. Whatever produced it,
    // the two do not describe the same standard and saying nothing is wrong.
    expect(isStale({ artifactCriteriaVersion: 4, currentCriteriaVersion: 3 })).toBe(true);
  });

  it('is true when the artefact never recorded a version and a standard exists', () => {
    expect(isStale({ currentCriteriaVersion: 2 })).toBe(true);
    expect(isStale({ artifactCriteriaVersion: null, currentCriteriaVersion: 2 })).toBe(true);
  });

  it('is false when there is no standard to diverge from', () => {
    expect(isStale({ artifactCriteriaVersion: 0, currentCriteriaVersion: 0 })).toBe(false);
    expect(isStale({ currentCriteriaVersion: 0 })).toBe(false);
    expect(isStale({})).toBe(false);
  });
});

describe('stalenessNote', () => {
  it('is null when nothing is owed', () => {
    expect(stalenessNote({ artifactCriteriaVersion: 3, currentCriteriaVersion: 3 })).toBeNull();
    expect(stalenessNote({})).toBeNull();
  });

  it('names both versions, and claims no update happened', () => {
    const note = stalenessNote({ artifactCriteriaVersion: 2, currentCriteriaVersion: 3 });
    expect(note).toBe(
      'This was compiled against version 2 of your standard. Your standard is now at version 3, ' +
        'so some rules here may be out of date.',
    );
    expect(note).not.toMatch(/updated|refresh|latest|automatic/i);
  });

  it('says plainly when the artefact never recorded what it was built against', () => {
    const note = stalenessNote({ currentCriteriaVersion: 3 });
    expect(note).toBe(
      'This was built before CTRL recorded which version of your standard it used, and your ' +
        'standard is now at version 3, so some rules here may be out of date.',
    );
  });
});

describe('withStalenessNote', () => {
  it('returns the body untouched when it is current', () => {
    const body = '## file: SKILL.md\n\n# thing\n';
    expect(withStalenessNote(body, { artifactCriteriaVersion: 1, currentCriteriaVersion: 1 }))
      .toBe(body);
  });

  it('appends exactly one line, after the whole package', () => {
    const body = '## file: SKILL.md\n\n# thing\n\n## file: rubric/core.md\n\n# core\n';
    const out = withStalenessNote(body, { artifactCriteriaVersion: 1, currentCriteriaVersion: 2 });
    expect(out.startsWith('## file: SKILL.md')).toBe(true);
    expect(out).toContain('## file: rubric/core.md');
    expect(out.trimEnd().endsWith('so some rules here may be out of date.')).toBe(true);
    // One note, never two.
    expect(out.split('This was compiled against').length - 1).toBe(1);
  });
});
