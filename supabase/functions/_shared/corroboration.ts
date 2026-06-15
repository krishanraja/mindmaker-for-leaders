// Multi-source corroboration governor (CTRL Brain P3 / market-read spec).
// A confident "supported" verdict requires >= 2 INDEPENDENT supporting sources (distinct
// domains). One source - however good - cannot earn a confident Holds ("ten vendor blogs
// can't make Holds"). Deterministic backstop on top of the LLM adjudicator, which does not
// reliably enforce independence. Pure + unit-testable.

export interface EvidenceLike {
  stance?: string | null;        // "supports" | "refutes" | "neutral"
  source_url?: string | null;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

/** Distinct domains among the SUPPORTING evidence (url-less evidence cannot prove independence). */
export function countIndependentSupport(evidence: EvidenceLike[]): number {
  const domains = new Set<string>();
  for (const e of evidence) {
    if (e.stance !== 'supports' || !e.source_url) continue;
    const d = domainOf(e.source_url);
    if (d) domains.add(d);
  }
  return domains.size;
}

export interface GovernedVerdict {
  verdict: string;
  confidence: number;
  independentSources: number;
  governed: boolean;
}

/** Downgrade an over-confident "supported" that lacks >= 2 independent supporting sources. */
export function governByCorroboration(
  verdict: string,
  confidence: number,
  evidence: EvidenceLike[],
): GovernedVerdict {
  const independentSources = countIndependentSupport(evidence);
  if (verdict === 'supported' && independentSources < 2) {
    return { verdict: 'unverified', confidence: Math.min(confidence, 0.35), independentSources, governed: true };
  }
  return { verdict, confidence, independentSources, governed: false };
}
