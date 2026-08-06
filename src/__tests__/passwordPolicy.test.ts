import { describe, expect, it } from 'vitest';
import { PASSWORD_MIN_LENGTH, PASSWORD_RULE_TEXT, checkPassword } from '@/lib/passwordPolicy';

// The rule three surfaces now share. These assertions exist because the forms
// previously stated only the length half of a four-part server policy, which
// let a password pass the client and fail opaquely at Supabase.
describe('checkPassword', () => {
  it('accepts a password meeting every client-checkable rule', () => {
    expect(checkPassword('Correct1Horse2Battery')).toBeNull();
  });

  it('names the length problem with the actual length', () => {
    expect(checkPassword('Ab1')).toBe('Use at least 12 characters. That one is 3.');
  });

  it('rejects a long password with no uppercase', () => {
    expect(checkPassword('correct1horse2battery')).toBe('Add an uppercase letter.');
  });

  it('rejects a long password with no lowercase', () => {
    expect(checkPassword('CORRECT1HORSE2BATTERY')).toBe('Add a lowercase letter.');
  });

  it('rejects a long password with no digit', () => {
    expect(checkPassword('CorrectHorseBattery')).toBe('Add a number.');
  });

  it('checks length before composition, so the first message is the useful one', () => {
    // A short password is short whatever else is wrong with it.
    expect(checkPassword('abc')).toMatch(/at least 12 characters/);
  });

  it('mirrors the server minimum', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12);
    expect(checkPassword('A1'.padEnd(PASSWORD_MIN_LENGTH - 1, 'a'))).not.toBeNull();
    expect(checkPassword('A1'.padEnd(PASSWORD_MIN_LENGTH, 'a'))).toBeNull();
  });

  it('announces the breach check, which cannot be verified in a browser', () => {
    expect(PASSWORD_RULE_TEXT).toMatch(/breach/i);
  });
});
