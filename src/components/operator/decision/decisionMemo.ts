/**
 * decisionMemo - the pure builder that turns a finished decision case into a
 * one-page, board-ready markdown memo (the artifact a leader carries out of
 * the weigh). Assembles ONLY real stored data: the call, the counter-case,
 * the breakpoint, what checks out / what's shaky with sources, and what to
 * validate next. No options-considered section is fabricated - the engine
 * does not store alternatives. Nullable fields (older rows) are skipped.
 *
 * Kept pure (no React, no I/O, injectable date) so it is unit-testable and
 * shared by DecisionResultView + DecisionAnatomy.
 */
import type {
  DecisionCase,
  DecisionClaim,
  DecisionEvidence,
  DecisionTension,
} from '@/hooks/useDecisionEngine';
import { VERDICT_STYLE, cleanEvidenceText, sourceDomain, shortAge } from './decisionParts';

const TENSION_KIND_LABEL: Record<DecisionTension['kind'], string> = {
  vs_profile: 'Against your own profile',
  vs_evidence: 'Against the evidence',
  internal: 'Internal tension',
  model_disagreement: 'The models disagree',
};

function evidenceLine(e: DecisionEvidence): string {
  const point = cleanEvidenceText(e.key_point || e.excerpt || e.source_title);
  if (!point) return '';
  const domain = sourceDomain(e.source_url);
  const age = shortAge(e.published_at);
  const stance = e.stance === 'supports' ? 'supports' : e.stance === 'refutes' ? 'counters' : 'context';
  const provenance = [domain, age].filter(Boolean).join(', ');
  return `  - ${point} (${stance}${provenance ? `; ${provenance}` : ''})`;
}

export function buildDecisionMemo(
  decisionCase: DecisionCase,
  claims: DecisionClaim[],
  evidence: DecisionEvidence[],
  tensions: DecisionTension[],
  now: Date = new Date(),
): string {
  const lines: string[] = [];
  const title = decisionCase.title?.trim() || 'Decision memo';
  const date = now.toISOString().slice(0, 10);

  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`Decision memo - ${date}. Weighed with CTRL: claims decomposed, checked against live evidence, and stress-tested against the strongest case against.`);
  lines.push('');

  // The question
  lines.push('## The question');
  lines.push(decisionCase.statement.trim());
  if (decisionCase.reframed && decisionCase.reframed_statement) {
    lines.push('');
    lines.push(`Weighed as its AI-native version: ${decisionCase.reframed_statement.trim()}`);
    if (decisionCase.reframe_note) lines.push(`(${decisionCase.reframe_note.trim()})`);
  }
  lines.push('');

  // The call
  if (decisionCase.recommendation) {
    lines.push('## The call');
    lines.push(decisionCase.recommendation.trim());
    if (typeof decisionCase.confidence === 'number') {
      lines.push('');
      lines.push(`Confidence: ${Math.round(decisionCase.confidence * 100)}% (tracks the evidence below, not certainty)`);
    }
    lines.push('');
  }

  // Where it holds / where it breaks
  const supported = claims.filter((c) => c.verdict === 'supported');
  const shaky = claims.filter(
    (c) => c.verdict === 'contested' || c.verdict === 'unverified' || c.verdict === 'unverifiable',
  );
  if (supported.length > 0) {
    lines.push('## What checks out');
    for (const c of supported) lines.push(`- ${c.text.trim()}`);
    lines.push('');
  }
  if (shaky.length > 0) {
    lines.push("## What's shaky");
    for (const c of shaky) {
      const label = VERDICT_STYLE[c.verdict].label;
      lines.push(`- ${c.text.trim()} (${label.toLowerCase()})`);
    }
    lines.push('');
  }

  // The breakpoint: the one claim the whole call leans on
  const breakpoint = decisionCase.breakpoint_assumption_id
    ? claims.find((c) => c.id === decisionCase.breakpoint_assumption_id)
    : undefined;
  if (breakpoint) {
    lines.push('## The breakpoint');
    lines.push(`If this is wrong, the call flips: ${breakpoint.text.trim()}`);
    lines.push('');
  }

  // The strongest honest case against
  if (decisionCase.counter_case) {
    lines.push('## The case against');
    lines.push(decisionCase.counter_case.trim());
    lines.push('');
  }

  // Tensions worth carrying into the room
  if (tensions.length > 0) {
    lines.push('## Tensions');
    for (const t of tensions) {
      lines.push(`- ${TENSION_KIND_LABEL[t.kind]}: ${t.description.trim()}`);
    }
    lines.push('');
  }

  // What to validate next
  const validateNext = (decisionCase.validate_next ?? []).filter((v) => v && v.trim());
  if (validateNext.length > 0) {
    lines.push('## Validate next');
    for (const v of validateNext) lines.push(`- ${v.trim()}`);
    lines.push('');
  }

  // Evidence appendix, grouped per claim; only claims that actually have evidence
  const byClaim = new Map<string, DecisionEvidence[]>();
  for (const e of evidence) {
    const list = byClaim.get(e.claim_id) ?? [];
    list.push(e);
    byClaim.set(e.claim_id, list);
  }
  const claimsWithEvidence = claims.filter((c) => (byClaim.get(c.id) ?? []).length > 0);
  if (claimsWithEvidence.length > 0) {
    lines.push('## Evidence');
    for (const c of claimsWithEvidence) {
      lines.push(`- ${c.text.trim()}`);
      const rows = (byClaim.get(c.id) ?? [])
        .map(evidenceLine)
        .filter(Boolean)
        .slice(0, 3);
      lines.push(...rows);
    }
    lines.push('');
  }

  if (decisionCase.last_verified_at) {
    const age = shortAge(decisionCase.last_verified_at, now);
    lines.push(`Evidence last checked ${age ? `${age} ago` : 'recently'}. CTRL keeps watching the load-bearing claims and will flag it if one weakens.`);
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}
