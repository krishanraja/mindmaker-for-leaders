import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Loader2, RefreshCw, Target, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSuggestedBets, type SuggestedBet } from '@/hooks/useSuggestedBets';

interface Props {
  /** Called when the leader is done with the cockpit. `accepted` are the bets
   *  they chose to Keep (may be empty - that is an honest, valid outcome). */
  onContinue: (accepted: SuggestedBet[]) => void;
}

/**
 * The onboarding "draft cockpit": after the Memory Web blooms, CTRL proposes
 * the open decisions (bets) the leader likely faces, drawn strictly from their
 * own facts. The leader curates with Keep / Swap / Not mine.
 *
 * Honesty: bets come from the suggest-bets edge function, which returns an
 * empty set when the captured facts are too thin to ground a decision. So an
 * empty rail is a real, expected state, shown as a words-led note rather than a
 * fabricated list.
 */
export function DraftCockpit({ onContinue }: Props) {
  const { bets, isLoading, hasLoaded, error, suggest } = useSuggestedBets();

  // Per-bet decision state, keyed by the bet statement (stable for a given set).
  const [accepted, setAccepted] = useState<SuggestedBet[]>([]);
  const [discarded, setDiscarded] = useState<Set<string>>(new Set());

  // Fetch once on mount.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void suggest();
  }, [suggest]);

  // Swap: drop all local decisions and pull a fresh set.
  const handleSwap = useCallback(async () => {
    setAccepted([]);
    setDiscarded(new Set());
    await suggest();
  }, [suggest]);

  const handleKeep = useCallback((bet: SuggestedBet) => {
    setAccepted((prev) =>
      prev.some((b) => b.statement === bet.statement) ? prev : [...prev, bet],
    );
    setDiscarded((prev) => {
      if (!prev.has(bet.statement)) return prev;
      const next = new Set(prev);
      next.delete(bet.statement);
      return next;
    });
  }, []);

  const handleNotMine = useCallback((bet: SuggestedBet) => {
    setDiscarded((prev) => new Set(prev).add(bet.statement));
    setAccepted((prev) => prev.filter((b) => b.statement !== bet.statement));
  }, []);

  const visibleBets = bets.filter((b) => !discarded.has(b.statement));
  const isAccepted = (b: SuggestedBet) => accepted.some((a) => a.statement === b.statement);
  const keptCount = accepted.length;

  return (
    <motion.div
      key="draft-cockpit"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-xl py-6 space-y-5"
    >
      <div className="space-y-2 text-center">
        <div className="flex items-center justify-center gap-2 text-accent">
          <Target className="h-5 w-5" />
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em]">
            Your draft cockpit
          </span>
        </div>
        <h2 className="text-xl font-bold text-foreground tracking-tight text-balance">
          The calls you are probably weighing
        </h2>
        <p className="text-sm text-muted-foreground text-balance">
          Drawn from what you just told us, nothing else. Keep the ones that are
          real, drop the ones that are not.
        </p>
      </div>

      {/* LOADING */}
      {isLoading && !hasLoaded && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Loader2 className="h-6 w-6 text-accent animate-spin" />
          <p className="text-sm text-muted-foreground">Reading your world for open bets...</p>
        </div>
      )}

      {/* LOADED */}
      {hasLoaded && (
        <>
          {/* Honest empty state: not enough captured signal to ground a bet. */}
          {visibleBets.length === 0 && (
            <div className="rounded-2xl border border-border bg-card px-5 py-6 text-center space-y-2">
              <p className="text-sm font-medium text-foreground">
                {error
                  ? 'We could not draft your cockpit just now.'
                  : 'Nothing solid to draft yet.'}
              </p>
              <p className="text-xs text-muted-foreground text-balance">
                {error
                  ? 'You can do this anytime from your dashboard once your brain has more in it.'
                  : 'Your brain is still thin. As you think out loud here, the real decisions you are weighing will surface on their own.'}
              </p>
            </div>
          )}

          {/* Chip-rail of proposed bets */}
          {visibleBets.length > 0 && (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {visibleBets.map((bet) => {
                  const kept = isAccepted(bet);
                  return (
                    <motion.div
                      key={bet.statement}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        'rounded-xl border bg-card p-4 text-left transition-colors',
                        kept ? 'border-accent/60 glow-accent-sm' : 'border-border',
                      )}
                    >
                      <p className="text-sm font-medium text-foreground leading-relaxed text-balance">
                        {bet.statement}
                      </p>
                      {bet.rationale && (
                        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                          {bet.rationale}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => handleKeep(bet)}
                          aria-pressed={kept}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                            kept
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-foreground/5 text-foreground hover:bg-foreground/10',
                          )}
                        >
                          <Check className="h-3.5 w-3.5" />
                          {kept ? 'Kept' : 'Keep'}
                        </button>
                        <button
                          onClick={() => handleNotMine(bet)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-foreground/5 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                          Not mine
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Swap: fresh set */}
              <button
                onClick={handleSwap}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Swap for a different set
              </button>
            </div>
          )}

          {/* Continue */}
          <button
            onClick={() => onContinue(accepted)}
            className="w-full px-8 py-3 rounded-xl bg-accent text-accent-foreground font-semibold flex items-center justify-center gap-2 shadow-lg shadow-accent/25"
          >
            {keptCount > 0
              ? `Lock in ${keptCount} ${keptCount === 1 ? 'bet' : 'bets'} and continue`
              : 'Continue'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </>
      )}
    </motion.div>
  );
}
