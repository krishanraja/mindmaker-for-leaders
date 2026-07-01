// newsLens - a lightweight CLIENT mirror of the server's off-lens topical gate
// (supabase/functions/_shared/news-ai-native.ts `isOffLensTopic`).
//
// The server is the source of truth: it already drops off-lens
// (life-sciences / medical / pure-science / robotics-hardware / gaming / crypto)
// stories from the shared pool. This client copy is belt-and-braces: a row
// cached BEFORE the server change shipped could still carry an off-lens headline
// for the rest of that day, so Home drops it too. Kept intentionally small and
// in sync with the server regex.

const OFF_LENS_SUBJECT =
  /drug discovery|drug design|protein|genomic|genom(e|ic)s?|molecul|biolog|biotech|\bpharma|clinical|\bmedic(al|ine)\b|\bdisease|\bcancer\b|oncolog|\bgenes?\b|\bdna\b|\brna\b|vaccine|diagnos(is|tic|e)|patient|\bfda\b|life sciences|bioinformatic|neuroscience|astronom|astrophys|particle physics|\bquantum (chemistry|physics|computing)\b|materials science|climate model|weather forecast|nuclear fusion|telescope|\bgalax|\bcosmo|\brobot|humanoid|self-?driving|autonomous vehicle|\bdrone|video game|\bgaming\b|game studio|\besports?\b|crypto|blockchain|bitcoin|ethereum|\bnft\b|\bweb3\b|\bdefi\b/i;

const BUSINESS_SIGNAL =
  /raise[sd]?|funding|series [a-e]\b|valuation|\bipo\b|acqui(re|red|sition)|go-to-market|\bgtm\b|enterprise adoption|revenue|pricing|per-seat|subscription|productiz|monetiz|developer platform|\bsaas\b|customers deploy|in production at/i;

/**
 * True when the text is clearly off the AI-native-BUSINESS lens (a
 * science/bio/robotics/gaming/crypto story) and carries no offsetting business
 * signal. Used to drop such cards from the Home deck defensively.
 */
export function isOffLensHeadline(text: string | null | undefined): boolean {
  const hay = (text ?? '').trim();
  if (!hay) return false;
  if (!OFF_LENS_SUBJECT.test(hay)) return false;
  return !BUSINESS_SIGNAL.test(hay);
}
