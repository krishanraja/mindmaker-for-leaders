/* eslint-disable react-refresh/only-export-components -- co-locates the stone with its verdict/source helpers */
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ExternalLink, GitFork, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DecisionClaim, DecisionEvidence, Verdict } from '@/hooks/useDecisionEngine';

// The evidence vocabulary (the locked numerical-first set), mapped from the engine verdict.
export const STONE: Record<Verdict, { label: string; ring: string; text: string }> = {
  supported: { label: 'Holds', ring: 'border-emerald-500/30 bg-emerald-500/[0.06]', text: 'text-emerald-300' },
  contested: { label: 'Contested', ring: 'border-amber-500/30 bg-amber-500/[0.06]', text: 'text-amber-300' },
  unverified: { label: 'Thin', ring: 'border-border bg-foreground/[0.03]', text: 'text-muted-foreground' },
  unverifiable: { label: 'Assumption', ring: 'border-indigo-500/30 bg-indigo-500/[0.06]', text: 'text-indigo-300' },
  pending: { label: 'Checking', ring: 'border-border bg-secondary/40', text: 'text-muted-foreground' },
};

// Source reliability: an "unverifiable" consideration cannot be answered by external evidence -
// only the leader can. The cardinal honesty rule, surfaced.
export function isOnlyYou(c: DecisionClaim): boolean {
  return c.verdict === 'unverifiable';
}

export function domainOf(url: string | null): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

const STANCE_DOT: Record<DecisionEvidence['stance'], string> = {
  supports: 'bg-emerald-400',
  refutes: 'bg-rose-400',
  neutral: 'bg-muted-foreground',
};

export function ConsiderationStone({
  claim,
  evidence,
  expanded,
  onToggle,
  animated = true,
}: {
  claim: DecisionClaim;
  evidence: DecisionEvidence[];
  expanded: boolean;
  onToggle: () => void;
  animated?: boolean; // false renders at final state (QC harness / static capture)
}) {
  const onlyYou = isOnlyYou(claim);
  const stone = STONE[claim.verdict] ?? STONE.pending;
  // Independent corroboration = distinct supporting domains (mirrors the verify governor).
  const independent = useMemo(() => {
    const d = new Set<string>();
    for (const e of evidence) {
      if (e.stance !== 'supports' || !e.source_url) continue;
      const dom = domainOf(e.source_url);
      if (dom) d.add(dom);
    }
    return d.size;
  }, [evidence]);

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 4 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={cn('rounded-xl border', onlyYou ? 'border-border bg-foreground/[0.03]' : stone.ring)}
    >
      <button type="button" onClick={onToggle} className="w-full p-3.5 text-left">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
              onlyYou ? 'border-border text-muted-foreground' : cn('border-border', stone.text),
            )}
            aria-hidden
          >
            {onlyYou ? <Lock className="h-3.5 w-3.5" /> : <GitFork className="h-3.5 w-3.5 rotate-90" />}
          </span>
          <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">{claim.text}</span>
          <ChevronRight className={cn('h-4 w-4 shrink-0 self-center text-muted-foreground transition-transform', expanded && 'rotate-90')} />
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-10 text-[11px]">
          {onlyYou ? (
            <span className="font-medium text-muted-foreground">Only you can answer</span>
          ) : (
            <span className={cn('font-semibold', stone.text)}>{stone.label}</span>
          )}
          {claim.is_load_bearing && <span className="text-muted-foreground">load-bearing</span>}
          {!onlyYou && independent > 0 && (
            <span className="text-muted-foreground">
              {independent} {independent === 1 ? 'source' : 'independent sources'}
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 px-3.5 pb-3.5 pl-[3.375rem]">
          {claim.rationale && <p className="text-xs leading-relaxed text-muted-foreground">{claim.rationale}</p>}
          {onlyYou ? (
            <p className="text-xs text-muted-foreground">No external evidence can settle this - it is yours to judge.</p>
          ) : evidence.length > 0 ? (
            <div className="space-y-1.5">
              {evidence.map((e) => (
                <a
                  key={e.id}
                  href={e.source_url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STANCE_DOT[e.stance] ?? 'bg-muted-foreground')} />
                  <span className="min-w-0 flex-1 truncate">{e.source_title || domainOf(e.source_url) || 'source'}</span>
                  {e.source_url && <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />}
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No sources retrieved yet.</p>
          )}
        </div>
      )}
    </motion.div>
  );
}
