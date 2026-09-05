/**
 * Authenticate machine-only Edge Function calls with an exact configured
 * credential. JWT payload text is never decoded or trusted here.
 */
export function hasExactServiceCredential(
  authorization: string | null,
  configuredCredentials: readonly string[],
): boolean {
  if (!authorization?.startsWith("Bearer ")) return false;
  const bearer = authorization.slice("Bearer ".length);
  if (!bearer || bearer.includes(" ")) return false;

  return configuredCredentials.some((credential) =>
    credential.length > 0 && bearer === credential
  );
}
