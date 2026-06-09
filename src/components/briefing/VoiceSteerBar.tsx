import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useVoice } from '@/hooks/useVoice';
import { invokeEdgeFunction } from '@/lib/api';
import { cn } from '@/lib/utils';

interface NudgeResponse {
  action:
    | 'add_interest'
    | 'add_exclude'
    | 'add_directive'
    | 'request_custom'
    | 'noop';
  applied: boolean;
  message: string;
  custom_prompt?: string;
}

interface VoiceSteerBarProps {
  briefingId?: string | null;
  /**
   * Called when the nudge requests a one-off custom briefing (e.g. "deep dive
   * on Anthropic"). The Briefing page passes this through to its custom
   * briefing trigger so the user gets the requested briefing immediately.
   */
  onCustomRequest?: (prompt: string) => void;
  /** Called after any successful nudge so the page can refetch interests. */
  onApplied?: () => void;
}

/**
 * Hero "tell me what you want to hear" voice control on the Briefing tab.
 * Records up to 15s, sends the transcript to `nudge-briefing`, surfaces a
 * confirmation toast, and bubbles up custom-briefing requests.
 */
export function VoiceSteerBar({ briefingId, onCustomRequest, onApplied }: VoiceSteerBarProps) {
  const [isApplying, setIsApplying] = useState(false);

  const handleTranscript = useCallback(
    async (transcript: string) => {
      const text = transcript.trim();
      if (!text) return;

      setIsApplying(true);
      try {
        const result = await invokeEdgeFunction<NudgeResponse>('nudge-briefing', {
          briefing_id: briefingId,
          transcript: text,
        });

        if (result.action === 'noop') {
          toast.message("Didn't quite catch that", {
            description: 'Try something like "less Stripe news" or "go deeper on Anthropic".',
          });
        } else {
          toast.success(result.message, {
            description:
              result.action === 'request_custom'
                ? 'Generating a custom briefing now.'
                : 'Future briefings will reflect this.',
          });
        }

        if (result.action === 'request_custom' && result.custom_prompt && onCustomRequest) {
          onCustomRequest(result.custom_prompt);
        }

        if (result.applied) {
          onApplied?.();
        }
      } catch (err) {
        console.error('nudge-briefing failed:', err);
        toast.error('Could not steer briefing', {
          description: (err as Error).message,
        });
      } finally {
        setIsApplying(false);
      }
    },
    [briefingId, onCustomRequest, onApplied],
  );

  const {
    isRecording,
    isProcessing,
    duration,
    browserCaptionPreview,
    startRecording,
    stopRecording,
    resetRecording,
  } = useVoice({
    maxDuration: 15,
    onTranscript: handleTranscript,
  });

  const handleToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      resetRecording();
      startRecording();
    }
  };

  const isBusy = isProcessing || isApplying;

  return (
    <div
      className={cn(
        'rounded-2xl border p-3 transition-colors',
        isRecording
          ? 'border-red-500/40 bg-red-500/5'
          : 'border-accent/30 bg-accent/5',
      )}
    >
      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleToggle}
          disabled={isBusy}
          aria-label={isRecording ? 'Stop steering' : 'Steer your briefing'}
          className={cn(
            'shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-colors',
            isRecording
              ? 'bg-red-500 text-white'
              : isBusy
              ? 'bg-muted text-muted-foreground'
              : 'bg-accent text-accent-foreground shadow-md',
          )}
        >
          {isBusy ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isRecording ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </motion.button>

        <div className="min-w-0 flex-1">
          {isRecording ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-medium text-foreground">
                  Listening · {Math.max(0, 15 - duration)}s left
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground italic line-clamp-1">
                {browserCaptionPreview || 'Try: "less Stripe, more Anthropic"'}
              </p>
            </div>
          ) : isBusy ? (
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-foreground">
                Applying your nudge…
              </span>
              <p className="text-[11px] text-muted-foreground">
                Tweaking what you'll hear next.
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-foreground">
                Steer your briefing
              </span>
              <p className="text-[11px] text-muted-foreground line-clamp-1">
                Tap and say what you'd rather hear.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
