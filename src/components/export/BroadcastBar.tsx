/**
 * BroadcastBar
 *
 * Flag-gated (FF.contextBroadcast) affordance rendered in Step 3 of the
 * Context Export wizard when exportResult.content is present.
 *
 * On click: copies the content to clipboard, opens ChatGPT / Claude / Gemini
 * in new tabs, and shows a live checklist of each destination plus a manual
 * reminder for Cursor / Claude Code local files.
 *
 * The existing single-target copy/download flow is NOT modified.
 */

import { useState, useCallback, useReducer } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Check, Square, ExternalLink, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

interface BroadcastBarProps {
  content: string;
}

type DestId = 'chatgpt' | 'claude' | 'gemini';

interface DestState {
  chatgpt: boolean;
  claude: boolean;
  gemini: boolean;
}

const DESTINATIONS: { id: DestId; label: string; url: string }[] = [
  { id: 'chatgpt', label: 'ChatGPT', url: 'https://chatgpt.com/' },
  { id: 'claude',  label: 'Claude',  url: 'https://claude.ai/new' },
  { id: 'gemini',  label: 'Gemini',  url: 'https://gemini.google.com/app' },
];

const LOCAL_TOOLS = [
  { label: 'Cursor', hint: 'paste into .cursorrules' },
  { label: 'Claude Code', hint: 'paste into CLAUDE.md' },
];

const INITIAL_STATE: DestState = { chatgpt: false, claude: false, gemini: false };

function destReducer(
  state: DestState,
  action: { id: DestId }
): DestState {
  return { ...state, [action.id]: true };
}

export function BroadcastBar({ content }: BroadcastBarProps) {
  const [broadcast, dispatch] = useReducer(destReducer, INITIAL_STATE);
  const [didBroadcast, setDidBroadcast] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const handleBroadcast = useCallback(async () => {
    if (isBusy) return;
    setIsBusy(true);

    // 1. Copy to clipboard
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Non-fatal - continue opening tabs
    }

    // 2. Open each destination in a new tab, tick checklist as we go
    for (const dest of DESTINATIONS) {
      window.open(dest.url, '_blank', 'noopener,noreferrer');
      dispatch({ id: dest.id });
      // Small stagger so browsers don't block the burst as a pop-up flood
      await new Promise<void>((res) => setTimeout(res, 150));
    }

    setDidBroadcast(true);
    setShowChecklist(true);
    setIsBusy(false);

    toast('Context copied - paste into each tab', {
      description: 'For Cursor / Claude Code: paste into .cursorrules or CLAUDE.md',
      duration: 6000,
    });
  }, [content, isBusy]);

  const toggleChecklist = useCallback(() => {
    setShowChecklist((v) => !v);
  }, []);

  const allWebDone = broadcast.chatgpt && broadcast.claude && broadcast.gemini;

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="rounded-xl border border-accent/25 bg-accent/5 overflow-hidden"
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
          <Radio className="h-4 w-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug">Broadcast to all</p>
          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
            Copy and open ChatGPT, Claude, and Gemini in one click
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {didBroadcast && (
            <button
              onClick={toggleChecklist}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showChecklist ? 'Hide checklist' : 'Show checklist'}
            >
              {showChecklist ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          <button
            onClick={handleBroadcast}
            disabled={isBusy}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              allWebDone
                ? 'border border-accent/30 bg-accent/10 text-accent cursor-default'
                : 'border border-accent bg-accent text-white hover:bg-accent/90 active:scale-95',
              isBusy && 'opacity-60 cursor-wait'
            )}
          >
            {allWebDone ? (
              <>
                <Check className="h-3 w-3" />
                Broadcasted
              </>
            ) : (
              <>
                <Radio className="h-3 w-3" />
                {isBusy ? 'Opening...' : 'Broadcast'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live checklist */}
      <AnimatePresence>
        {showChecklist && (
          <motion.div
            key="checklist"
            initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-accent/10 px-4 py-3 space-y-2">
              {/* Web destinations */}
              {DESTINATIONS.map((dest) => {
                const done = broadcast[dest.id];
                return (
                  <div key={dest.id} className="flex items-center gap-2.5">
                    <motion.div
                      initial={false}
                      animate={done ? { scale: [1.2, 1] } : {}}
                      transition={{ duration: 0.15 }}
                    >
                      {done ? (
                        <Check className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                      ) : (
                        <Square className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
                      )}
                    </motion.div>
                    <span className={cn(
                      'text-xs transition-colors',
                      done ? 'text-foreground' : 'text-muted-foreground/60'
                    )}>
                      {dest.label}
                    </span>
                    {done && (
                      <a
                        href={dest.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto text-muted-foreground/50 hover:text-accent transition-colors"
                        aria-label={`Open ${dest.label}`}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                );
              })}

              {/* Divider */}
              <div className="border-t border-border/50 pt-2 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Local tools - paste manually
                </p>
                {LOCAL_TOOLS.map((tool) => (
                  <div key={tool.label} className="flex items-center gap-2.5">
                    <Terminal className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                    <span className="text-xs text-muted-foreground/70">
                      {tool.label}
                      <span className="text-muted-foreground/40 ml-1">({tool.hint})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
