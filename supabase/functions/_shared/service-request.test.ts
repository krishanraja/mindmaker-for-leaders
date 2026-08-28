import { describe, expect, it } from 'vitest';
import { consumeRequestRateLimit, isBearerRequest, isCronRequest, isServiceRequest } from './service-request';

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

describe('isBearerRequest', () => {
  it('accepts an exact bearer token and fails closed', () => {
    expect(isBearerRequest('Bearer studio-secret', 'studio-secret')).toBe(true);
    expect(isBearerRequest('Bearer studio-secreu', 'studio-secret')).toBe(false);
    expect(isBearerRequest('studio-secret', 'studio-secret')).toBe(false);
    expect(isBearerRequest('Bearer ', '')).toBe(false);
    expect(isBearerRequest(null, 'studio-secret')).toBe(false);
  });

  it('limits repeated export requests', () => {
    expect(consumeRequestRateLimit('fixture-rate-token', 0, 2, 60_000)).toBe(0);
    expect(consumeRequestRateLimit('fixture-rate-token', 1, 2, 60_000)).toBe(0);
    expect(consumeRequestRateLimit('fixture-rate-token', 2, 2, 60_000)).toBe(60);
  });
});
