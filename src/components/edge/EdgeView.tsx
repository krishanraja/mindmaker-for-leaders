import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';
import { useEdge } from '@/hooks/useEdge';
import { useEdgeSubscription } from '@/hooks/useEdgeSubscription';
import { EdgeOnboarding } from './EdgeOnboarding';
import { EdgePaywall } from './EdgePaywall';
import { EdgeVerdict } from './EdgeVerdict';
import { EdgeFullReadSheet } from './EdgeFullReadSheet';
import { DraftSheet } from './DraftSheet';
import { ArtifactPreview } from './ArtifactPreview';
import type { EdgeCapability, ActionType, FeedbackType } from '@/types/edge';

// ===== Main EdgeView Component =====

export default function EdgeView() {
  const {
    strengths,
    weaknesses,
    hasProfile,
    isLoading,
    isSynthesizing,
    synthesize,
    submitFeedback,
  } = useEdge();

  const { hasAccess } = useEdgeSubscription();
  const navigate = useNavigate();

  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallCapability, setPaywallCapability] = useState<string | undefined>();
  const [fullReadOpen, setFullReadOpen] = useState(false);

  // DraftSheet state
  const [draftSheetOpen, setDraftSheetOpen] = useState(false);
  const [activeCapability, setActiveCapability] = useState<EdgeCapability | null>(null);
  const [activeTargetKey, setActiveTargetKey] = useState('');
  const [activeActionType, setActiveActionType] = useState<ActionType>('cover');

  // ArtifactPreview state
  const [artifactPreviewOpen, setArtifactPreviewOpen] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedActionId, setGeneratedActionId] = useState<string | null>(null);

  // The one move: draft a board memo that covers the leading gap. Free leaders
  // go straight in too. The server hands them one watermarked memo, then the
  // paywall appears after the value is shown, never as a dead-end before it.
  const handleMakeMove = useCallback((targetKey: string) => {
    setActiveCapability('board_memo');
    setActiveTargetKey(targetKey);
    setActiveActionType('cover');
    setDraftSheetOpen(true);
  }, []);

  // Free allowance used: show the paywall after the leader has felt the value.
  const handleLimitReached = useCallback(() => {
    setDraftSheetOpen(false);
    setPaywallCapability('Board Memo');
    setPaywallOpen(true);
  }, []);

  const handleReject = useCallback(
    (feedbackType: FeedbackType, key: string) => {
      submitFeedback(feedbackType, key);
    },
    [submitFeedback],
  );

  const handleGenerated = useCallback(
    (result: { actionId: string; content: string; title: string }) => {
      setDraftSheetOpen(false);
      setGeneratedContent(result.content);
      setGeneratedTitle(result.title);
      setGeneratedActionId(result.actionId);
      setArtifactPreviewOpen(true);
    },
    [],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
      </div>
    );
  }

  // Synthesizing state
  if (isSynthesizing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center gap-4 py-20"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-accent/20 border-t-accent"
        >
          <Brain className="h-5 w-5 text-accent" />
        </motion.div>
        <p className="text-sm font-medium text-foreground">Building your Edge.</p>
        <p className="text-xs text-muted-foreground">Reading your Memory Web.</p>
      </motion.div>
    );
  }

  // First-time / no profile: keep the single-focal onboarding for empty accounts
  if (!hasProfile) {
    return <EdgeOnboarding onComplete={synthesize} />;
  }

  // Full Edge view: the Verdict
  return (
    <>
      <EdgeVerdict
        strengths={strengths}
        weaknesses={weaknesses}
        onMakeMove={handleMakeMove}
        onOpenFullRead={() => setFullReadOpen(true)}
        onPressureTest={() => navigate('/decision')}
      />

      <EdgeFullReadSheet
        isOpen={fullReadOpen}
        onClose={() => setFullReadOpen(false)}
        strengths={strengths}
        weaknesses={weaknesses}
        onReject={handleReject}
        onMakeNextMove={() => {
          setFullReadOpen(false);
          handleMakeMove(weaknesses[0]?.key || strengths[0]?.key || '');
        }}
        onUpgrade={() => {
          setPaywallCapability('Skill Builder');
          setPaywallOpen(true);
        }}
      />

      <EdgePaywall
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        capability={paywallCapability}
      />

      <DraftSheet
        isOpen={draftSheetOpen}
        onClose={() => setDraftSheetOpen(false)}
        capability={activeCapability}
        targetKey={activeTargetKey}
        actionType={activeActionType}
        onGenerated={handleGenerated}
        isPaid={hasAccess}
        onLimitReached={handleLimitReached}
      />

      <ArtifactPreview
        isOpen={artifactPreviewOpen}
        onClose={() => setArtifactPreviewOpen(false)}
        content={generatedContent}
        title={generatedTitle}
        actionId={generatedActionId}
      />
    </>
  );
}
