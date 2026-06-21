import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Copy, Check, Brain, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { Button } from '@/components/ui/button';
import { useDevice } from '@/hooks/useDevice';
import { useUserMemory } from '@/hooks/useUserMemory';
import { useToast } from '@/hooks/use-toast';

const ENRICH_INTRO =
  'Borrow your own AI. Copy one prompt, run it in ChatGPT or Claude, and paste the answer back. CTRL learns in two minutes what would take weeks to tell it.';

/**
 * The inbound enrichment loop: borrow your own AI. Copy one prompt, run it in
 * ChatGPT or Claude, paste the answer back, and CTRL learns in two minutes what
 * would take weeks to tell it. Reuses extract-user-context (which already parses
 * pasted markdown into verified facts), so the leader only reacts, never types
 * their whole world from scratch.
 */

interface EnrichPrompt {
  id: string;
  title: string;
  blurb: string;
  prompt: string;
}

const PROMPTS: EnrichPrompt[] = [
  {
    id: 'company',
    title: 'Your company and market',
    blurb: 'Position, competitors, risks, and opportunities.',
    prompt:
      'I want to brief an AI tool about my work. Write a detailed, factual brief on my company and market. Cover: what we do and who we sell to, our position versus the top three competitors (name them), our revenue model, and the biggest commercial risks and opportunities over the next 12 months. Be specific and concrete. If you are unsure of a fact, say so rather than inventing it.',
  },
  {
    id: 'competitors',
    title: 'Your competitive landscape',
    blurb: 'Each rival, their AI moves, and where you win or lose.',
    prompt:
      'List my main competitors. For each one, summarise their AI strategy, their most recent product or pricing moves, and where they are stronger or weaker than us. Name specific companies and products. Keep it concrete and recent.',
  },
  {
    id: 'leadership',
    title: 'How you lead',
    blurb: 'Your strengths, blind spots, and decision style.',
    prompt:
      'Based on what you know about me as a senior commercial leader, describe my likely leadership strengths, my blind spots, and my decision-making style. Be candid and specific. Frame each point as something I could act on.',
  },
  {
    id: 'board',
    title: "Your board's hardest questions",
    blurb: 'The five questions to be ready for, and strong answers.',
    prompt:
      'I report to a board. List the five hardest questions my board is likely to ask me about our AI strategy and commercial performance this quarter. For each, outline what a strong, specific answer would contain.',
  },
];

type Phase = 'idle' | 'adding' | 'done';

export default function EnrichPage() {
  const navigate = useNavigate();
  const { isMobile } = useDevice();
  const { toast } = useToast();
  const { extractFromTranscript } = useUserMemory();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [addedCount, setAddedCount] = useState(0);

  const copy = async (p: EnrichPrompt) => {
    try {
      await navigator.clipboard.writeText(p.prompt);
      setCopiedId(p.id);
      setTimeout(() => setCopiedId((c) => (c === p.id ? null : c)), 1800);
    } catch {
      toast({ title: 'Could not copy', description: 'Select the text and copy it manually.', variant: 'destructive' });
    }
  };

  const add = async () => {
    if (pasted.trim().length < 20) return;
    setPhase('adding');
    const result = await extractFromTranscript(pasted, undefined, 'enrichment');
    if (!result.success) {
      setPhase('idle');
      toast({ title: 'That did not go through', description: 'Give it another try in a moment.', variant: 'destructive' });
      return;
    }
    const count = result.facts_stored ?? result.facts_extracted ?? result.pending_verifications?.length ?? 0;
    setAddedCount(count);
    setPhase('done');
  };

  const body =
    phase === 'done' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-accent/30 bg-accent/5 p-5 text-center"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
                <Check className="h-6 w-6 text-accent" />
              </div>
              <p className="text-base font-semibold text-foreground">
                {addedCount > 0 ? `Added ${addedCount} to your profile.` : 'Saved to your profile.'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Review and confirm what is right in Memory. Your Edge and Briefing sharpen from here.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button onClick={() => navigate('/memory')} className="gap-2">
                  Review in Memory <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { setPasted(''); setPhase('idle'); setAddedCount(0); }}
                >
                  Add another
                </Button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Prompt library */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  1. Copy a prompt
                </p>
                {PROMPTS.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.blurb}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copy(p)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/5"
                      >
                        {copiedId === p.id ? (
                          <><Check className="h-3.5 w-3.5 text-accent" /> Copied</>
                        ) : (
                          <><Copy className="h-3.5 w-3.5" /> Copy</>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Paste back */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  2. Paste the answer back
                </p>
                <textarea
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  placeholder="Paste what ChatGPT or Claude gave you here."
                  rows={7}
                  className="w-full rounded-xl border border-border bg-foreground/5 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                <Button
                  onClick={add}
                  disabled={pasted.trim().length < 20 || phase === 'adding'}
                  className="w-full gap-2"
                  size="lg"
                >
                  {phase === 'adding' ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Reading it in</>
                  ) : (
                    <><Zap className="h-4 w-4" /> Add to my profile</>
                  )}
                </Button>
              </div>
            </>
          );

  // Mobile: full-screen with AppHeader + BottomNav.
  if (isMobile) {
    return (
      <MobileFrame scroll hideScrollbar maxWidth="max-w-2xl" padding="px-4 pb-24">
        <div className="py-4 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-accent" />
              <h1 className="text-xl font-bold text-foreground">Deepen your profile</h1>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{ENRICH_INTRO}</p>
          </div>
          {body}
        </div>
      </MobileFrame>
    );
  }

  // Desktop: unified shell (rail + top bar), cohesive with the rest of CTRL.
  return (
    <DesktopShell eyebrow="Workspace" title="Deepen your profile">
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <p className="text-sm leading-relaxed text-muted-foreground">{ENRICH_INTRO}</p>
          {body}
        </div>
      </div>
    </DesktopShell>
  );
}
