/**
 * ingest-evidence post-check.
 *
 * The logic lives in ../_shared/ingest-post-check.ts so vitest can run it: the
 * vitest include covers supabase/functions/_shared, not the function folders.
 * This file is the function-local door onto it and holds no logic of its own.
 */

export {
  capCandidates,
  checkCandidate,
  EVIDENCE_KINDS,
  isLocated,
  isRulePhrased,
  locateQuote,
  maskQuotedSpans,
  MAX_CANDIDATES,
  normaliseEvidenceKind,
  runPostCheck,
  unifyPunctuation,
} from "../_shared/ingest-post-check.ts";

export type {
  AcceptedCandidate,
  CandidateCheckResult,
  EvidenceKind,
  IngestCandidateInput,
  IngestItemInput,
  IngestReject,
  LocatedItem,
  PostCheckResult,
  QuoteLocation,
  QuoteRejected,
  QuoteRejectReason,
  QuoteSpan,
} from "../_shared/ingest-post-check.ts";
