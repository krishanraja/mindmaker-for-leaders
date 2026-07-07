/**
 * DecisionCapture - the ONE ask (cold + the desktop start state).
 *
 * Faithful to prototypes/decisions-2028.html (.ask): a single calm field. The
 * example lives as ghost text (it disappears the moment you type). Voice is ONE
 * elegant affordance embedded in the input footer (a mic glyph that flips the
 * SAME field into a calm listening waveform), NOT a second button, NOT three
 * example chips, NOT a floating mic FAB, NOT a 50-word explainer wall. One
 * primary CTA: "Weigh it".
 *
 * The mic drives a real recording -> transcription (AudioRecorder +
 * api.transcribeAudio, the same path VoiceInput uses) and appends the transcript
 * into the field, so "talk it out" is real, not decorative.
 *
 * All from ctrl-ds tokens. The waveform respects prefers-reduced-motion.
 */

import { useEffect, useRef, useState } from 'react';
import { Mic, ArrowRight, Loader2 } from 'lucide-react';
import { AudioRecorder } from '@/utils/audioRecorder';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const GHOST_EXAMPLE =
  '"We should let an agent own first-draft proposals before we hire another salesperson."';

const WAVE_STYLE_ID = 'ctrl-decision-wave-styles';
const WAVE_CSS = `
@keyframes ctrlWave { 0%,100% { height:8px; } 50% { height:34px; } }
.ctrl-wave-bar { animation: ctrlWave 1s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .ctrl-wave-bar { animation: none !important; height: 20px !important; } }
`;
function ensureWaveStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(WAVE_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = WAVE_STYLE_ID;
  el.textContent = WAVE_CSS;
  document.head.appendChild(el);
}

const WAVE_HEIGHTS = [14, 22, 30, 18, 26, 12, 28, 20, 16, 24, 30, 15, 22];

function Waveform() {
  ensureWaveStyles();
  return (
    <div className="flex h-10 items-center justify-center gap-1" aria-hidden="true">
      {WAVE_HEIGHTS.map((h, i) => (
        <i
          key={i}
          className="ctrl-wave-bar w-1 rounded-full bg-gradient-to-b from-accent/80 to-accent shadow-[0_0_10px_hsl(var(--accent)/0.5)]"
          style={{ height: h, animationDelay: `${i * 0.07}s`, animationDuration: `${0.85 + (i % 4) * 0.12}s` }}
        />
      ))}
    </div>
  );
}

export function DecisionCapture({
  value,
  onChange,
  onStart,
  starting,
  autoFocus,
  isDesktop = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onStart: () => void;
  starting: boolean;
  autoFocus?: boolean;
  isDesktop?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => () => { if (recorderRef.current?.isRecording()) recorderRef.current.stop(); }, []);

  const canWeigh = value.trim().length >= 8 && !starting;

  const toggleListen = async () => {
    if (listening) {
      recorderRef.current?.stop();
      setListening(false);
      return;
    }
    try {
      setMicError(null);
      recorderRef.current = new AudioRecorder();
      await recorderRef.current.start(async (audioBlob) => {
        setListening(false);
        setTranscribing(true);
        try {
          const result = await api.transcribeAudio(audioBlob, `decision-${Date.now()}`, 'deep_profile');
          if (result?.transcript) {
            const nextText = value ? `${value} ${result.transcript}` : result.transcript;
            onChange(nextText);
            // Land the leader in their own words: visible, editable, caret at the
            // end, one tap from "Weigh it". setTimeout(0) so the controlled value
            // has committed before we place the caret.
            setTimeout(() => {
              const el = textareaRef.current;
              if (!el) return;
              el.focus();
              el.setSelectionRange(nextText.length, nextText.length);
            }, 0);
          }
        } catch {
          setMicError('Could not transcribe. Try typing it instead.');
        } finally {
          setTranscribing(false);
        }
      });
      setListening(true);
    } catch {
      setMicError('Could not reach the microphone. Type it instead.');
    }
  };

  return (
    <div
      className={cn(
        'relative rounded-[20px] border bg-gradient-to-b from-card to-background shadow-[0_24px_48px_-28px_rgba(0,0,0,0.9)] transition-colors',
        focused || listening ? 'border-accent/30 shadow-[0_24px_54px_-26px_hsl(var(--accent)/0.18)]' : 'border-border',
      )}
    >
      {listening ? (
        <div className="flex min-h-[118px] flex-col items-center justify-center gap-4 px-5 py-7">
          <Waveform />
          <p className="text-sm font-semibold text-accent">Listening. Say the decision out loud.</p>
        </div>
      ) : (
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoFocus={autoFocus}
            rows={1}
            aria-label="The decision you are weighing"
            className={cn(
              'w-full resize-none border-0 bg-transparent px-[18px] pb-3.5 pt-[18px] leading-relaxed text-foreground outline-none placeholder:text-transparent',
              isDesktop ? 'min-h-[150px] text-lg' : 'min-h-[118px] text-base',
            )}
          />
          {/* ghost example - only while the field is empty (true ghost text, not a chip) */}
          {value.length === 0 && (
            <div
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute inset-x-[18px] top-[18px] leading-relaxed text-muted-foreground/70',
                isDesktop ? 'text-lg' : 'text-base',
              )}
            >
              <span className="text-muted-foreground/80">For example, </span>
              {GHOST_EXAMPLE}
            </div>
          )}
        </div>
      )}

      {/* footer: the ONE mic affordance (left) + hint + the ONE primary CTA (right) */}
      <div className="flex items-center gap-2.5 px-3.5 pb-3.5">
        <button
          type="button"
          onClick={toggleListen}
          disabled={transcribing}
          aria-label={listening ? 'Stop listening' : 'Say it out loud'}
          aria-pressed={listening}
          className={cn(
            'grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[14px] border transition-colors',
            listening ? 'border-transparent bg-accent text-accent-foreground' : 'border-border bg-foreground/[0.03] text-muted-foreground hover:border-accent/30 hover:text-accent',
          )}
        >
          {transcribing ? <Loader2 className="h-[19px] w-[19px] animate-spin" /> : <Mic className="h-[19px] w-[19px]" />}
        </button>
        <span className="min-w-0 flex-1 text-[11px] leading-snug text-muted-foreground/80">
          {micError ?? (transcribing ? 'Writing down what you said...' : isDesktop ? 'Type it, or tap to talk it out. One clean thought is enough.' : 'Type it, or tap to talk it out.')}
        </span>
        <button
          type="button"
          onClick={onStart}
          disabled={!canWeigh}
          className={cn(
            'inline-flex shrink-0 items-center gap-2 rounded-[14px] px-[18px] py-3 text-sm font-bold transition-opacity',
            canWeigh
              ? 'bg-gradient-to-b from-accent to-accent text-accent-foreground shadow-[0_12px_28px_-10px_hsl(var(--accent)/0.55)]'
              : 'cursor-not-allowed border border-border bg-secondary text-muted-foreground/50',
          )}
        >
          {starting ? 'Thinking it through...' : 'Think it through'}
          {!starting && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
