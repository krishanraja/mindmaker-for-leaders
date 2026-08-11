/** Exact server-to-server authorization check for privileged maintenance paths. */
export function isServiceRequest(authorization: string | null, serviceKey: string): boolean {
  return serviceKey.length > 0 && authorization === `Bearer ${serviceKey}`;
}
