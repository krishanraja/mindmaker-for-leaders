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
