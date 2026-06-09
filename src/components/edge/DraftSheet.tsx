import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  MessageSquare,
  Loader2,
  Zap,
  Send,
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
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useVoice } from '@/hooks/useVoice';
import { supabase } from '@/integrations/supabase/client';
import type { EdgeCapability, ActionType, SharpenCapability } from '@/types/edge';
import { COVER_CAPABILITY_META, SHARPEN_CAPABILITY_META } from '@/types/edge';
import { TranscriptReviewPanel } from '@/components/voice/TranscriptReviewPanel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DraftSheetProps {
  isOpen: boolean;
  onClose: () => void;
  capability: EdgeCapability | null;
  actionType: 'sharpen' | 'cover';
  targetKey: string;
  onGenerated: (result: { actionId: string; content: string; title: string }) => void;
  /** Whether the leader has Edge Pro. Free leaders get one watermarked memo. */
  isPaid?: boolean;
  /** Called when the free allowance is used, so the host can show the paywall. */
  onLimitReached?: () => void;
}

type InputMode = 'voice' | 'text';
type DraftState = 'idle' | 'recording' | 'transcribing' | 'generating';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve metadata from either COVER or SHARPEN meta maps */
function resolveCapabilityMeta(
  capability: EdgeCapability,
  actionType: ActionType,
): { label: string; description: string; icon: string } {
  if (actionType === 'sharpen' && capability in SHARPEN_CAPABILITY_META) {
    return SHARPEN_CAPABILITY_META[capability as SharpenCapability];
  }
  if (actionType === 'cover' && capability in COVER_CAPABILITY_META) {
    return COVER_CAPABILITY_META[capability as keyof typeof COVER_CAPABILITY_META];
  }
  // Fallback: try both maps
  if (capability in COVER_CAPABILITY_META) {
    return COVER_CAPABILITY_META[capability as keyof typeof COVER_CAPABILITY_META];
  }
  if (capability in SHARPEN_CAPABILITY_META) {
    return SHARPEN_CAPABILITY_META[capability as SharpenCapability];
  }
  return { label: capability, description: '', icon: 'Zap' };
}

/** Map sharpen capability to edge-generate capability key */
const SHARPEN_GENERATE_MAP: Record<string, string> = {
  systemize: 'framework',
  teach: 'teaching_doc',
  lean_into: 'lean_into',
};

/**
 * One structured, answerable prompt per capability. Every prompt is anchored to
 * the business or the decision, never to the self. No "walk us through your
 * thinking" and nothing that asks a busy leader to praise or expose themselves.
 */
function getPromptText(_actionType: ActionType, capability: EdgeCapability): string {
  switch (capability) {
    case 'board_memo':
      return 'What decision does the board need to make? One line.';
    case 'strategy_doc':
      return 'What strategic question must this document answer?';
    case 'email':
      return 'Who is this for, and what do you need from them?';
    case 'meeting_agenda':
      return 'What does this meeting need to decide or unblock?';
    case 'template':
      return 'What do you keep rewriting that we should turn into a template?';
    case 'systemize':
    case 'framework':
      return 'What recurring decision do you want to stop making by hand?';
    case 'teach':
    case 'teaching_doc':
      return 'What recent call do you want your team to be able to make without you?';
    case 'lean_into':
      return 'Where could this strength move the needle this quarter?';
    default:
      return 'Say your key points and we draft it for you.';
  }
}

/** A worked example, shown as a placeholder so the prompt is never a blank page. */
function getExample(capability: EdgeCapability): string {
  switch (capability) {
    case 'board_memo':
      return 'e.g. Approve $200k to consolidate four pilots into one team.';
    case 'strategy_doc':
      return 'e.g. Should we build our own AI layer or buy one?';
    case 'email':
      return 'e.g. My CFO. I need sign-off on the pilot budget by Friday.';
    case 'meeting_agenda':
      return 'e.g. Decide which two pilots we stop.';
    case 'template':
      return 'e.g. The weekly update I send the board.';
    case 'systemize':
    case 'framework':
      return 'e.g. How I decide which vendors get a pilot.';
    case 'teach':
    case 'teaching_doc':
      return 'e.g. How I price a new enterprise deal.';
    case 'lean_into':
      return 'e.g. Turning around the stalled enterprise segment.';
    default:
      return 'e.g. The key points, the audience, the ask.';
  }
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

function DraftContent({
  capability,
  actionType,
  targetKey,
  onClose,
  onGenerated,
  isPaid = true,
  onLimitReached,
}: {
  capability: EdgeCapability;
  actionType: ActionType;
  targetKey: string;
  onClose: () => void;
  onGenerated: DraftSheetProps['onGenerated'];
  isPaid?: boolean;
  onLimitReached?: () => void;
}) {
  const [inputMode, setInputMode] = useState<InputMode>('voice');
  const [textInput, setTextInput] = useState('');
  const [draftState, setDraftState] = useState<DraftState>('idle');
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editReviewText, setEditReviewText] = useState('');

  const meta = resolveCapabilityMeta(capability, actionType);
  const promptText = getPromptText(actionType, capability);
  const example = getExample(capability);

  const isSharpen = actionType === 'sharpen';

  // -----------------------------------------------------------------------
  // Voice handling
  // -----------------------------------------------------------------------

  const handleTranscript = useCallback((text: string) => {
    setVoiceTranscript(text);
    setDraftState('idle');
  }, []);

  const {
    isRecording,
    isProcessing: isTranscribing,
    duration,
    browserCaptionPreview,
    pendingReview,
    confirmPendingTranscript,
    dismissPendingReview,
    startRecording,
    stopRecording,
    resetRecording,
  } = useVoice({
    maxDuration: 120,
    deferTranscriptCallback: true,
    onTranscript: handleTranscript,
  });

  useEffect(() => {
    if (pendingReview) {
      setEditReviewText(pendingReview.transcript);
      setDraftState('idle');
    }
  }, [pendingReview]);

  const handleConfirmVoiceReview = useCallback(async () => {
    await confirmPendingTranscript(editReviewText);
  }, [confirmPendingTranscript, editReviewText]);

  const handleVoiceToggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
      setDraftState('transcribing');
    } else {
      setVoiceTranscript(null);
      setError(null);
      resetRecording();
      startRecording();
      setDraftState('recording');
    }
  }, [isRecording, startRecording, stopRecording, resetRecording]);

  // -----------------------------------------------------------------------
  // Generation
  // -----------------------------------------------------------------------

  const inputText = inputMode === 'voice' ? voiceTranscript : textInput.trim();
  const canGenerate = !!inputText && draftState !== 'generating';

  const handleGenerate = useCallback(async () => {
    if (!inputText) return;
    setDraftState('generating');
    setError(null);

    try {
      const generateCapability = isSharpen
        ? SHARPEN_GENERATE_MAP[capability] || capability
        : capability;

      const { data, error: fnError } = await supabase.functions.invoke('edge-generate', {
        body: { capability: generateCapability, targetKey, voiceInput: inputText },
      });

      if (fnError) throw fnError;

      onGenerated({
        actionId: data.actionId,
        content: data.content,
        title: data.title,
      });
    } catch (err) {
      console.error('edge-generate failed:', err);
      // For a free leader, a failed generation is almost always the used-up
      // free allowance. Show the paywall after the value, not a raw error.
      if (!isPaid && onLimitReached) {
        onLimitReached();
        return;
      }
      setError('That did not send. Tap to try again.');
      setDraftState('idle');
    }
  }, [inputText, capability, isSharpen, targetKey, onGenerated, isPaid, onLimitReached]);

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'p-2.5 rounded-xl bg-gradient-to-br',
            isSharpen
              ? 'from-emerald-500/20 to-teal-500/20'
              : 'from-amber-500/20 to-orange-500/20',
          )}
        >
          <Zap
            className={cn(
              'h-5 w-5',
              isSharpen ? 'text-emerald-400' : 'text-amber-400',
            )}
          />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">{meta.label}</h3>
          <p className="text-xs text-muted-foreground">{meta.description}</p>
        </div>
      </div>

      {/* Voice input */}
      <AnimatePresence mode="wait">
        {inputMode === 'voice' && (
          <motion.div
            key="voice"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{promptText}</p>
              <p className="text-xs text-muted-foreground/70">{example}</p>
            </div>

            {/* Record button */}
            <div className="flex flex-col items-center gap-3">
              <motion.button
                onClick={handleVoiceToggle}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={isTranscribing || draftState === 'generating'}
                className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors',
                  isRecording
                    ? 'bg-destructive shadow-destructive/25'
                    : 'bg-accent shadow-accent/25',
                  (isTranscribing || draftState === 'generating') && 'opacity-50 cursor-not-allowed',
                )}
              >
                {isRecording ? (
                  <MicOff className="w-7 h-7 text-white" />
                ) : (
                  <Mic className="w-7 h-7 text-white" />
                )}
              </motion.button>

              {/* Recording indicator */}
              {isRecording && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-1"
                >
                  <span className="text-lg font-bold tabular-nums text-foreground">
                    {formatTime(duration)}
                  </span>
                  <div className="flex items-center gap-0.5 h-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: [3, Math.random() * 16 + 3, 3] }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.4 + Math.random() * 0.4,
                          delay: i * 0.03,
                        }}
                        className="w-0.5 bg-destructive rounded-full"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground/50">
                    Tap to stop recording
                  </p>
                </motion.div>
              )}

              {/* Transcribing state */}
              {isTranscribing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-2 text-sm text-muted-foreground"
                >
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Transcribing...
                  </div>
                  {browserCaptionPreview ? (
                    <p className="text-xs text-center italic max-w-full px-1">
                      Browser preview (may differ): {browserCaptionPreview}
                    </p>
                  ) : null}
                </motion.div>
              )}

              {isRecording && browserCaptionPreview ? (
                <p className="text-xs text-muted-foreground/70 text-center italic max-w-full">
                  Live caption (approx.): {browserCaptionPreview}
                </p>
              ) : null}

              {pendingReview && !isRecording && !isTranscribing && (
                <TranscriptReviewPanel
                  transcript={pendingReview.transcript}
                  rawTranscript={pendingReview.rawTranscript}
                  refined={pendingReview.refined}
                  editedText={editReviewText}
                  onEditedTextChange={setEditReviewText}
                  onConfirm={handleConfirmVoiceReview}
                  onDismiss={() => {
                    dismissPendingReview();
                    setVoiceTranscript(null);
                  }}
                  confirmLabel="Use this text"
                  className="w-full"
                />
              )}

              {/* Transcript preview after confirm */}
              {voiceTranscript && !isRecording && !isTranscribing && !pendingReview && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full rounded-xl bg-foreground/5 border border-foreground/10 p-3"
                >
                  <p className="text-xs text-muted-foreground mb-1 font-medium">
                    Your key points:
                  </p>
                  <p className="text-sm text-foreground leading-relaxed line-clamp-4">
                    {voiceTranscript}
                  </p>
                </motion.div>
              )}

              {/* Idle hint */}
              {!isRecording && !isTranscribing && !voiceTranscript && !pendingReview && (
                <p className="text-xs text-muted-foreground/50">
                  Tap to speak (up to 2 minutes)
                </p>
              )}
            </div>

            {/* Type instead toggle */}
            <button
              onClick={() => setInputMode('text')}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors mx-auto"
            >
              <MessageSquare className="w-3 h-3" />
              Type instead
            </button>
          </motion.div>
        )}

        {inputMode === 'text' && (
          <motion.div
            key="text"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            <p className="text-sm font-medium text-foreground">{promptText}</p>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={example}
              autoFocus
              rows={4}
              className={cn(
                'w-full px-4 py-3 rounded-xl',
                'bg-foreground/5 border border-foreground/10',
                'text-foreground placeholder:text-foreground/30',
                'focus:outline-none focus:ring-2 focus:ring-accent/30',
                'resize-none text-sm',
              )}
            />
            <button
              onClick={() => {
                setInputMode('voice');
                setTextInput('');
              }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors mx-auto"
            >
              <Mic className="w-3 h-3" />
              Switch to voice
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          onClick={onClose}
          variant="ghost"
          className="flex-1 text-muted-foreground"
          disabled={draftState === 'generating'}
        >
          Cancel
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="flex-1 gap-2"
        >
          {draftState === 'generating' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Generate
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function DraftSheet({
  isOpen,
  onClose,
  capability,
  actionType,
  targetKey,
  onGenerated,
  isPaid,
  onLimitReached,
}: DraftSheetProps) {
  const isMobile = useIsMobile();

  if (!capability) return null;

  const meta = resolveCapabilityMeta(capability, actionType);

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="rounded-t-2xl px-6 pb-8 pt-6 max-h-[85vh] overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Draft {meta.label}</SheetTitle>
            <SheetDescription>
              {meta.description}
            </SheetDescription>
          </SheetHeader>
          <DraftContent
            capability={capability}
            actionType={actionType}
            targetKey={targetKey}
            onClose={onClose}
            onGenerated={onGenerated}
            isPaid={isPaid}
            onLimitReached={onLimitReached}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Draft {meta.label}</DialogTitle>
          <DialogDescription>
            {meta.description}
          </DialogDescription>
        </DialogHeader>
        <DraftContent
          capability={capability}
          actionType={actionType}
          targetKey={targetKey}
          onClose={onClose}
          onGenerated={onGenerated}
          isPaid={isPaid}
          onLimitReached={onLimitReached}
        />
      </DialogContent>
    </Dialog>
  );
}
