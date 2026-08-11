import { describe, expect, it } from 'vitest';
import { isServiceRequest } from './service-request';

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
