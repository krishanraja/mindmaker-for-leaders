/** Exact server-to-server authorization check for privileged maintenance paths. */
export function isServiceRequest(authorization: string | null, serviceKey: string): boolean {
  return serviceKey.length > 0 && authorization === `Bearer ${serviceKey}`;
}

/** Constant-work comparison for the custom secret shared by pg_cron and Edge Functions. */
export function isCronRequest(candidate: string | null, cronSecret: string): boolean {
  if (!candidate || cronSecret.length === 0 || candidate.length !== cronSecret.length) return false;
  let mismatch = 0;
  for (let index = 0; index < cronSecret.length; index += 1) {
    mismatch |= candidate.charCodeAt(index) ^ cronSecret.charCodeAt(index);
  }
  return mismatch === 0;
}

/** Constant-work bearer comparison for a dedicated machine-client token. */
export function isBearerRequest(authorization: string | null, secret: string): boolean {
  if (!authorization?.startsWith("Bearer ")) return false;
  return isCronRequest(authorization.slice("Bearer ".length), secret);
}

const requestWindows = new Map<string, { openedAt: number; count: number }>();

/** Per-isolate safety limit. Platform-level rate limits remain the outer control. */
export function consumeRequestRateLimit(identity: string, now = Date.now(), limit = 60, windowMs = 60_000): number {
  const current = requestWindows.get(identity);
  if (!current || now - current.openedAt >= windowMs) {
    requestWindows.set(identity, { openedAt: now, count: 1 });
    return 0;
  }
  current.count += 1;
  if (current.count <= limit) return 0;
  return Math.max(1, Math.ceil((windowMs - (now - current.openedAt)) / 1000));
}
