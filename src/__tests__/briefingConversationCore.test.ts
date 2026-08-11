import { describe, expect, it } from 'vitest';
import {
  cleanConversationText,
  normalizeCitationIndexes,
} from '../../supabase/functions/_shared/briefing-conversation-core';

describe('normalizeCitationIndexes', () => {
  it('keeps only unique, in-range, one-based segment references', () => {
    expect(normalizeCitationIndexes([2, 1, 2, 0, 8, '3'], 3)).toEqual([1, 0, 2]);
  });

  it('does not manufacture a citation when the model supplied none', () => {
    expect(normalizeCitationIndexes(undefined, 4)).toEqual([]);
    expect(normalizeCitationIndexes(['outside'], 4)).toEqual([]);
  });
});

describe('cleanConversationText', () => {
  it('enforces house punctuation and a hard length limit', () => {
    const dirty = `One${String.fromCharCode(0x2014)}two   three`;
    expect(cleanConversationText(dirty, 13)).toBe('One, two thre');
  });
});
