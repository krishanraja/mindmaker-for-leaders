import { describe, expect, it } from 'vitest';
import { isCronRequest, isServiceRequest } from './service-request';

describe('isServiceRequest', () => {
  it('accepts only the exact server credential', () => {
    expect(isServiceRequest('Bearer service-secret', 'service-secret')).toBe(true);
    expect(isServiceRequest('Bearer user-jwt', 'service-secret')).toBe(false);
    expect(isServiceRequest(null, 'service-secret')).toBe(false);
  });

  it('fails closed when the server credential is absent', () => {
    expect(isServiceRequest('Bearer ', '')).toBe(false);
  });
});

describe('isCronRequest', () => {
  it('accepts only an exact, non-empty shared secret', () => {
    expect(isCronRequest('cron-secret', 'cron-secret')).toBe(true);
    expect(isCronRequest('cron-secreu', 'cron-secret')).toBe(false);
    expect(isCronRequest('cron-secret-extra', 'cron-secret')).toBe(false);
    expect(isCronRequest(null, 'cron-secret')).toBe(false);
    expect(isCronRequest('', '')).toBe(false);
  });
});
