/**
 * AddMemorySheet Component
 * 
 * Bottom sheet for adding new memory via voice or text input.
 * Supports live transcript preview and tag suggestions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Send, Loader2, MessageSquare, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateMemory } from '@/hooks/useMemoryQueries';
import { useVoice } from '@/hooks/useVoice';
import type { FactCategory } from '@/types/memory';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

interface AddMemorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORIES: { value: FactCategory; label: string; description: string }[] = [
  { value: 'identity', label: 'About You', description: 'Role, title, team' },
  { value: 'business', label: 'Business', description: 'Company, industry' },
  { value: 'objective', label: 'Goals', description: 'Priorities, metrics' },
  { value: 'blocker', label: 'Challenges', description: 'Obstacles, constraints' },
  { value: 'preference', label: 'Preferences', description: 'Work style, decisions' },
];

// Local storage key for offline drafts
const DRAFT_KEY = 'mindmaker-memory-draft';

interface Draft {
  label: string;
  value: string;
  category: FactCategory;
  timestamp: number;
}

export const AddMemorySheet: React.FC<AddMemorySheetProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'choice' | 'voice' | 'text'>('choice');
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  // Default to 'preference' - matches the voice auto-save flow and is the
  // softest, most reversible category. The user can promote to a more
  // specific category from the disclosure below or later from Memory Center.
  const [category, setCategory] = useState<FactCategory>('preference');
  const [error, setError] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  const createMemory = useCreateMemory();

  // Voice capture is deliberately one-tap-to-save: a busy leader says the
  // thought, taps stop, and the memory lands. Category is defaulted - the
  // user can refine it later from the Memory Center. The text flow (below)
  // still surfaces the full form for users who want to choose upfront.
  const autoSaveVoiceMemory = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      const factKey = `voice_${Date.now()}`;
      await createMemory.mutateAsync({
        fact_key: factKey,
        fact_category: 'preference',
        fact_label: 'Voice memory',
        fact_value: trimmed,
        source_type: 'voice',
        confidence_score: 1.0,
        is_high_stakes: false,
      });
      localStorage.removeItem(DRAFT_KEY);
      haptics?.success?.();
      toast.success('Memory saved. Open it in Memory Center to change the category.');
      onSuccess?.();
      handleCloseRef.current?.();
    } catch (err) {
      // Fall back to the review form so nothing is lost.
      setValue(trimmed);
      setMode('text');
      const msg = err instanceof Error ? err.message : 'Could not save automatically';
      toast.error(`${msg}. Review and save manually.`);
    }
  }, [createMemory, onSuccess]);

  const {
    isRecording,
    isProcessing: isTranscribing,
    duration,
    transcript,
    error: voiceError,
    startRecording,
    stopRecording,
    resetRecording,
  } = useVoice({
    maxDuration: 120,
    onTranscript: (text) => {
      void autoSaveVoiceMemory(text);
    },
  });

  // Ref to handleClose so the voice auto-save callback can use it without
  // creating a circular dependency with useCallback's deps.
  const handleCloseRef = React.useRef<(() => void) | null>(null);

  // Check for saved draft on mount
  useEffect(() => {
    if (isOpen) {
      try {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
          const draft: Draft = JSON.parse(savedDraft);
          // Only restore if draft is less than 24 hours old
          if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
            setHasDraft(true);
          } else {
            localStorage.removeItem(DRAFT_KEY);
          }
        }
      } catch (e) {
        // Ignore storage errors
      }
    }
  }, [isOpen]);

  // Save draft periodically
  useEffect(() => {
    if (value.trim() && mode === 'text') {
      const draft: Draft = {
        label,
        value,
        category,
        timestamp: Date.now(),
      };
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch (e) {
        // Ignore storage errors
      }
    }
  }, [label, value, category, mode]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      haptics?.light?.();
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleRestoreDraft = () => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        const draft: Draft = JSON.parse(savedDraft);
        setLabel(draft.label);
        setValue(draft.value);
        setCategory(draft.category);
        setMode('text');
        setHasDraft(false);
      }
    } catch (e) {
      // Ignore storage errors
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  };

  const handleVoiceToggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      resetRecording();
      startRecording();
      setMode('voice');
    }
  }, [isRecording, startRecording, stopRecording, resetRecording]);

  const handleSubmit = async () => {
    if (!value.trim()) {
      setError('Please enter some content');
      return;
    }

    setError(null);

    try {
      // Generate a fact_key from the label or category
      const factKey = label.trim()
        ? label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
        : `${category}_${Date.now()}`;

      await createMemory.mutateAsync({
        fact_key: factKey,
        fact_category: category,
        fact_label: label.trim() || CATEGORIES.find(c => c.value === category)?.label || 'Memory',
        fact_value: value.trim(),
        source_type: mode === 'voice' ? 'voice' : 'manual',
        confidence_score: 1.0,
        is_high_stakes: false,
      });

      // Clear draft on success
      localStorage.removeItem(DRAFT_KEY);

      haptics?.success?.();
      toast.success('Memory saved successfully');
      onSuccess?.();
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save memory';
      setError(msg);
      haptics?.error?.();
      toast.error(msg);
    }
  };

  const handleClose = useCallback(() => {
    setMode('choice');
    setLabel('');
    setValue('');
    setCategory('preference');
    setError(null);
    resetRecording();
    onClose();
  }, [resetRecording, onClose]);

  // Keep the ref in sync so autoSaveVoiceMemory can close the sheet without
  // being rebuilt every render (which would break the useVoice callback).
  useEffect(() => {
    handleCloseRef.current = handleClose;
  }, [handleClose]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLoading = createMemory.isPending || isTranscribing;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 35, stiffness: 400, mass: 0.8 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-[70]",
              "h-[85vh] bg-background rounded-t-3xl",
              "border-t border-border shadow-2xl",
              "flex flex-col"
            )}
          >
            {/* Handle */}
            <div className="flex items-center justify-center pt-2 pb-1">
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Add Memory</h2>
              <Button variant="ghost" size="icon" onClick={handleClose} className="h-10 w-10">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {/* Draft restoration prompt */}
              {hasDraft && mode === 'choice' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-xl bg-accent/10 border border-accent/20"
                >
                  <p className="text-sm text-foreground mb-2">
                    You have an unsaved draft. Would you like to restore it?
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleRestoreDraft} className="border-0">
                      Restore
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleDiscardDraft}>
                      Discard
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Error display */}
              {(error || voiceError) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20"
                >
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-sm">{error || voiceError?.message}</p>
                  </div>
                </motion.div>
              )}

              <AnimatePresence mode="wait">
                {/* Choice mode */}
                {mode === 'choice' && !isLoading && (
                  <motion.div
                    key="choice"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center gap-6 py-8"
                  >
                    <p className="text-center text-muted-foreground">
                      How would you like to add a memory?
                    </p>

                    {/* Voice button */}
                    <motion.button
                      onClick={handleVoiceToggle}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        'w-24 h-24 rounded-full',
                        'bg-gradient-to-br from-accent to-accent/80',
                        'flex items-center justify-center',
                        'shadow-lg shadow-accent/25',
                        'border-0'
                      )}
                    >
                      <Mic className="w-10 h-10 text-accent-foreground" />
                    </motion.button>
                    <p className="text-sm text-muted-foreground">Tap to speak</p>

                    {/* Divider */}
                    <div className="flex items-center gap-4 w-full max-w-xs">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">or</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* Text input option */}
                    <Button
                      variant="outline"
                      onClick={() => setMode('text')}
                      className="border-0 bg-secondary/50"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Type instead
                    </Button>
                  </motion.div>
                )}

                {/* Voice recording mode */}
                {mode === 'voice' && isRecording && (
                  <motion.div
                    key="recording"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center gap-6 py-8"
                  >
                    <motion.button
                      onClick={handleVoiceToggle}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className={cn(
                        'w-24 h-24 rounded-full',
                        'bg-gradient-to-br from-destructive to-destructive/80',
                        'flex items-center justify-center',
                        'shadow-lg shadow-destructive/25',
                        'border-0'
                      )}
                    >
                      <MicOff className="w-10 h-10 text-destructive-foreground" />
                    </motion.button>

                    <div className="text-2xl font-bold tabular-nums text-foreground">
                      {formatTime(duration)}
                      <span className="text-sm text-muted-foreground ml-2">/ 2:00</span>
                    </div>

                    {/* Waveform animation */}
                    <div className="flex items-center justify-center gap-1 h-8">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{
                            height: [8, Math.random() * 24 + 8, 8],
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.5 + Math.random() * 0.5,
                            delay: i * 0.05,
                          }}
                          className="w-1 bg-destructive/60 rounded-full"
                        />
                      ))}
                    </div>

                    <p className="text-sm text-muted-foreground">Tap to stop</p>
                  </motion.div>
                )}

                {/* Processing state */}
                {isLoading && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center gap-6 py-12"
                  >
                    <div className="relative">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                        className={cn(
                          'w-20 h-20 rounded-full',
                          'bg-gradient-to-r from-accent via-primary to-accent',
                          'p-[2px]'
                        )}
                      >
                        <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-accent" />
                        </div>
                      </motion.div>
                    </div>
                    <div className="text-center">
                      <p className="text-foreground font-medium">
                        {isTranscribing ? 'Processing speech...' : 'Saving memory...'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        This only takes a moment
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Text input mode - minimal friction. The leader writes
                    one field (memory content). Category defaults to
                    "preference" and lives behind a disclosure for the rare
                    case the user wants to set it explicitly. Label is also
                    hidden by default; most memories don't need one. */}
                {mode === 'text' && !isLoading && (
                  <motion.div
                    key="text"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="value">Memory content</Label>
                      <Textarea
                        id="value"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="What would you like to remember?"
                        rows={6}
                        className="resize-none"
                      />
                    </div>

                    <details className="group rounded-lg border border-border/60 bg-secondary/30">
                      <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <span>
                          Saved as <span className="text-foreground/80">{CATEGORIES.find(c => c.value === category)?.label || category}</span>
                        </span>
                        <span className="ml-auto text-[10px] uppercase tracking-wider">Edit</span>
                      </summary>
                      <div className="px-3 pb-3 space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="category">Category</Label>
                          <Select value={category} onValueChange={(v) => setCategory(v as FactCategory)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  <div>
                                    <span className="font-medium">{cat.label}</span>
                                    <span className="text-muted-foreground ml-2 text-xs">
                                      {cat.description}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="label">Label (optional)</Label>
                          <Input
                            id="label"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="e.g., My main goal for Q1"
                          />
                        </div>
                      </div>
                    </details>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer actions */}
            {mode === 'text' && !isLoading && (
              <div className="flex-shrink-0 px-4 py-4 border-t border-border pb-safe">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setMode('choice')}
                    className="flex-1 border-0"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!value.trim()}
                    className="flex-1 border-0"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Save Memory
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AddMemorySheet;
