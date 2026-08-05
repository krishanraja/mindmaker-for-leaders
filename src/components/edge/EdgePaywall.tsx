import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Lock,
  Zap,
  PenTool,
  Mail,
  Layers,
  FileText,
  X,
  Sparkles,
  Radar,
  Plug,
  Brain,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEdgeSubscription } from '@/hooks/useEdgeSubscription';
import { useProfileBasics } from '@/hooks/useProfileBasics';
import { renderMarkdown } from '@/lib/renderMarkdown';
import { EDGE_PRO_PRICE_LABEL } from '@/constants/billing';
// Sample artifacts live in their own module so this file only exports
// components (keeps react-refresh's fast-refresh boundary clean).
import { SAMPLE_ARTIFACTS } from './sampleArtifacts';

interface EdgePaywallProps {
  isOpen: boolean;
  onClose: () => void;
  capability?: string;
}

// Personalised one-liner shown above the blurred sample so the leader can
// see this isn't a stock screenshot - it's what THEIR artifact would look
// like. Falls back to null if we can't infer a sensible line.
function personalisedTeaser(sampleKey: string | null, company: string): string | null {
  const quarter = Math.ceil((new Date().getMonth() + 1) / 3);
  switch (sampleKey) {
    case 'board_memo':
      return `Board memo for ${company}, Q${quarter}`;
    case 'strategy_doc':
      return `Strategy doc for ${company}, Q${quarter}`;
    case 'email':
      return `Email draft for ${company}`;
    case 'meeting_agenda':
      return `Leadership agenda for ${company}`;
    case 'template':
      return `Weekly template for ${company}`;
    case 'systemize':
      return `Leadership framework for ${company}`;
    case 'teach':
      return `Teaching doc for ${company}`;
    default:
      return null;
  }
}

// Match a paywall capability string to a sample key
function findSampleKey(capability?: string): string | null {
  if (!capability) return null;
  const lower = capability.toLowerCase();
  if (lower.includes('board') || lower.includes('memo')) return 'board_memo';
  if (lower.includes('strategy')) return 'strategy_doc';
  if (lower.includes('email')) return 'email';
  if (lower.includes('meeting') || lower.includes('agenda')) return 'meeting_agenda';
  if (lower.includes('template')) return 'template';
  if (lower.includes('systemize') || lower.includes('framework')) return 'systemize';
  if (lower.includes('teach')) return 'teach';
  if (lower.includes('draft')) return 'email';
  return 'strategy_doc'; // default fallback
}

// Pro-only lines only. Anything free (briefing, Automator, Memory, Voice)
// belongs in FREE_INCLUDED; src/constants/planMatrix.ts and docs/PRICING.md
// are the source of truth for which side a capability sits on.
const BENEFITS = [
  { icon: Brain, text: 'Unlimited decision weighs (free is 3 a month)' },
  { icon: Sparkles, text: 'Multi-model cross-examination of every decision' },
  { icon: Radar, text: 'Decision watch: an alert when a load-bearing assumption weakens' },
  { icon: Plug, text: 'Live MCP pull of your skills into any AI' },
  { icon: PenTool, text: 'Unlimited drafting: emails, memos, strategy docs' },
  { icon: Layers, text: 'Framework generation from your strengths' },
  { icon: FileText, text: 'Edge artifacts: agendas, templates, board memos' },
  { icon: Mail, text: 'Email delivery of generated artifacts' },
];

const FREE_INCLUDED = [
  'Read-write Memory Web',
  'Voice profile',
  'Automator skill builds and exports, unlimited',
  'Daily personalised briefing',
  '3 decision weighs a month',
];

const PRICE = EDGE_PRO_PRICE_LABEL;

function PaywallContent({
  capability,
  onClose,
  onSubscribe,
  isProcessing,
}: {
  capability?: string;
  onClose: () => void;
  onSubscribe: () => void;
  isProcessing: boolean;
}) {
  const { companyName } = useProfileBasics();
  const isQuotaExhausted = capability === 'free_quota_exhausted';

  return (
    <div className="space-y-5">
      {/* Header icon */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-accent/20 to-purple-500/20">
          <Zap className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">
            {isQuotaExhausted ? 'Your free weighs this month are used' : 'Unlimited weighs, cross-examined, plus Edge artifacts'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isQuotaExhausted
              ? 'Free covers 3 decision weighs a month. Edge Pro removes the cap and adds a multi-model cross-examination of every decision.'
              : capability
                ? `Required for: ${capability}`
                : `Unlimited decisions, the live pull of your skills, and Edge artifacts. ${PRICE}.`}
          </p>
        </div>
      </div>

      {/* Blurred sample artifact preview - personalised when we have the
          leader's company name. Generic sample if not. */}
      {(() => {
        const sampleKey = findSampleKey(capability);
        const sampleContent = sampleKey ? SAMPLE_ARTIFACTS[sampleKey] : null;
        if (!sampleContent) return null;
        const personalisedLine = companyName
          ? personalisedTeaser(sampleKey, companyName)
          : null;
        return (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative rounded-xl border border-border overflow-hidden"
          >
            {personalisedLine && (
              <div className="px-4 pt-3 pb-1 bg-accent/5 border-b border-border">
                <p className="text-[11px] font-medium text-accent">
                  {personalisedLine}
                </p>
              </div>
            )}
            <div
              className="p-4 max-h-32 overflow-hidden text-xs"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(sampleContent) }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
            <div className="absolute bottom-0 inset-x-0 h-16 backdrop-blur-[3px] bg-background/50 flex items-end justify-center pb-3">
              <span className="text-[11px] text-accent font-medium">Unlock to generate the full artifact</span>
            </div>
          </motion.div>
        );
      })()}

      {/* Benefits */}
      <div className="space-y-3">
        {BENEFITS.map((benefit, i) => {
          const Icon = benefit.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3"
            >
              <CheckCircle2 className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
              <span className="text-sm text-foreground">{benefit.text}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Free tier reminder so the delta is concrete */}
      <div className="rounded-xl border border-border bg-muted/30 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Free tier still includes
        </p>
        <ul className="mt-1.5 space-y-1">
          {FREE_INCLUDED.map((line) => (
            <li key={line} className="text-xs text-foreground/80">
              {line}
            </li>
          ))}
        </ul>
      </div>

      {/* Price */}
      <div className="text-center py-2">
        <span className="text-3xl font-bold text-foreground">{PRICE}</span>
        <p className="text-xs text-muted-foreground mt-1">Cancel anytime</p>
      </div>

      {/* CTA */}
      <div className="space-y-2">
        <Button
          onClick={onSubscribe}
          disabled={isProcessing}
          className="w-full gap-2"
          size="lg"
        >
          <Lock className="h-4 w-4" />
          {isProcessing ? 'Redirecting...' : 'Start Edge Pro'}
        </Button>
        <Button
          onClick={onClose}
          variant="ghost"
          className="w-full text-muted-foreground"
        >
          Maybe later
        </Button>
      </div>

      {/* Footer */}
      <p className="text-[10px] text-muted-foreground/60 text-center">
        Secure checkout via Stripe. Cancel anytime from your account.
      </p>
    </div>
  );
}

export const EdgePaywall = React.memo<EdgePaywallProps>(({ isOpen, onClose, capability }) => {
  const isMobile = useIsMobile();
  const { subscribe, isProcessing } = useEdgeSubscription();

  const handleSubscribe = useCallback(async () => {
    const url = await subscribe();
    if (url) {
      window.location.href = url;
    }
  }, [subscribe]);

  // Mobile: Bottom sheet via Sheet component
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="rounded-t-2xl px-6 pb-8 pt-6">
          <SheetHeader className="sr-only">
            <SheetTitle>Unlock Edge Pro</SheetTitle>
            <SheetDescription>Upgrade to access all Edge capabilities</SheetDescription>
          </SheetHeader>
          <PaywallContent
            capability={capability}
            onClose={onClose}
            onSubscribe={handleSubscribe}
            isProcessing={isProcessing}
          />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Dialog
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Unlock Edge Pro</DialogTitle>
          <DialogDescription>Upgrade to access all Edge capabilities</DialogDescription>
        </DialogHeader>
        <PaywallContent
          capability={capability}
          onClose={onClose}
          onSubscribe={handleSubscribe}
          isProcessing={isProcessing}
        />
      </DialogContent>
    </Dialog>
  );
});

EdgePaywall.displayName = 'EdgePaywall';
