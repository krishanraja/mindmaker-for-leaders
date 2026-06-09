/**
 * VoiceMemoryCapture Component
 * Voice-first input with text fallback for context extraction
 * Integrates with memory system for fact extraction and verification
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Send, Loader2, Brain, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useVoice } from '@/hooks/useVoice';
import { useUserMemory } from '@/hooks/useUserMemory';
import { FactVerificationCard } from './FactVerificationCard';
import { TranscriptReviewPanel } from '@/components/voice/TranscriptReviewPanel';

interface VoiceMemoryCaptureProps {
  onComplete?: (transcript: string) => void;
  placeholder?: string;
  promptText?: string;
  showVerification?: boolean;
  className?: string;
}

export const VoiceMemoryCapture: React.FC<VoiceMemoryCaptureProps> = ({
  onComplete,
  placeholder = "Tell me about yourself and your work...",
  promptText = "What's on your mind?",
  showVerification = true,
  className,
}) => {
  const [mode, setMode] = useState<'idle' | 'voice' | 'text' | 'review'>('idle');
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showVerificationCard, setShowVerificationCard] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [editReviewText, setEditReviewText] = useState('');

  const {
    pendingVerifications,
    isExtracting,
    extractFromTranscript,
    verifyFact,
    rejectFact,
    clearPendingVerifications,
  } = useUserMemory();

  const processInput = useCallback(async (text: string) => {
    if (!text.trim()) {
      toast.error('No speech detected. Please try again');
      return;
    }

    setIsProcessing(true);

    try {
      // Extract context from the transcript
      const result = await extractFromTranscript(text);

      // Show verification card if we have pending verifications
      if (showVerification && result.pending_verifications?.length > 0) {
        setShowVerificationCard(true);
        const count = result.pending_verifications.length;
        toast.success(`Found ${count} fact${count > 1 ? 's' : ''}. Please verify`);
      } else if (result.success) {
        toast.success('Memory saved');
        onComplete?.(text);
      } else {
        toast.error('Couldn\'t extract any facts. Please try again');
        onComplete?.(text);
      }
    } catch (err) {
      console.error('Error processing input:', err);
      toast.error('Couldn\'t save memory. Please try again');
    } finally {
      setIsProcessing(false);
    }
  }, [showVerification, extractFromTranscript, onComplete, toast]);

  const handleTranscript = useCallback(async (text: string) => {
    setLastTranscript(text);
    await processInput(text);
  }, [processInput]);

  const {
    isRecording,
    isProcessing: isTranscribing,
    duration,
    error: voiceError,
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
      setMode('review');
    }
  }, [pendingReview]);

  const handleConfirmReview = useCallback(async () => {
    await confirmPendingTranscript(editReviewText);
  }, [confirmPendingTranscript, editReviewText]);

  const handleDismissReview = useCallback(() => {
    dismissPendingReview();
    setMode('idle');
  }, [dismissPendingReview]);

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    setLastTranscript(textInput);
    await processInput(textInput);
    setTextInput('');
    setMode('idle');
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

  const handleVerificationComplete = () => {
    setShowVerificationCard(false);
    onComplete?.(lastTranscript);
  };

  const handleVerificationDismiss = () => {
    setShowVerificationCard(false);
    clearPendingVerifications();
    onComplete?.(lastTranscript);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLoading = isProcessing || isExtracting || isTranscribing;

  const showIdle = mode === 'idle' && !isLoading && !pendingReview;

  return (
    <>
      <div className={cn('w-full max-w-lg mx-auto', className)}>
        {/* Prompt text */}
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-lg text-foreground/80 mb-8"
        >
          {promptText}
        </motion.p>

        {/* Main capture area */}
        <div className="relative">
          <AnimatePresence mode="wait">
            {/* Idle state - show both options */}
            {showIdle && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center gap-6"
              >
                {/* Voice button */}
                <motion.button
                  onClick={handleVoiceToggle}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    'w-24 h-24 rounded-full',
                    'bg-gradient-to-br from-blue-500 to-purple-600',
                    'flex items-center justify-center',
                    'shadow-lg shadow-blue-500/25',
                    'border border-white/20'
                  )}
                >
                  <Mic className="w-10 h-10 text-white" />
                </motion.button>
                <p className="text-sm text-foreground/50">Tap to speak</p>

                {/* Divider */}
                <div className="flex items-center gap-4 w-full max-w-xs">
                  <div className="flex-1 h-px bg-foreground/10" />
                  <span className="text-xs text-foreground/30">or</span>
                  <div className="flex-1 h-px bg-foreground/10" />
                </div>

                {/* Text input option */}
                <motion.button
                  onClick={() => setMode('text')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl',
                    'bg-foreground/5 border border-foreground/10',
                    'text-foreground/60 text-sm',
                    'hover:bg-foreground/10 transition-colors'
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                  Type instead
                </motion.button>
              </motion.div>
            )}

            {/* Voice recording state */}
            {mode === 'voice' && isRecording && (
              <motion.div
                key="recording"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center gap-6"
              >
                {/* Recording indicator */}
                <motion.button
                  onClick={handleVoiceToggle}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className={cn(
                    'w-24 h-24 rounded-full',
                    'bg-gradient-to-br from-red-500 to-pink-600',
                    'flex items-center justify-center',
                    'shadow-lg shadow-red-500/25',
                    'border border-white/20'
                  )}
                >
                  <MicOff className="w-10 h-10 text-white" />
                </motion.button>

                {/* Timer */}
                <div className="text-2xl font-bold tabular-nums text-foreground">
                  {formatTime(duration)}
                  <span className="text-sm text-foreground/40 ml-2">/ 2:00</span>
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
                      className="w-1 bg-red-400 rounded-full"
                    />
                  ))}
                </div>

                {browserCaptionPreview ? (
                  <p className="text-xs text-foreground/50 text-center max-w-full px-2 italic">
                    Live caption (approx.): {browserCaptionPreview}
                  </p>
                ) : (
                  <p className="text-sm text-foreground/50">Tap to stop</p>
                )}
              </motion.div>
            )}

            {/* Text input mode */}
            {mode === 'text' && !isLoading && (
              <motion.div
                key="text"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="w-full space-y-4"
              >
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={placeholder}
                  autoFocus
                  rows={4}
                  className={cn(
                    'w-full px-4 py-3 rounded-2xl',
                    'bg-foreground/5 border border-foreground/10',
                    'text-foreground placeholder:text-foreground/30',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/30',
                    'resize-none'
                  )}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.metaKey) {
                      handleTextSubmit();
                    }
                  }}
                />
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setMode('idle');
                      setTextInput('');
                    }}
                    className={cn(
                      'flex-1 py-3 px-4 rounded-xl',
                      'bg-foreground/5 border border-foreground/10',
                      'text-foreground/60 font-medium'
                    )}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleTextSubmit}
                    disabled={!textInput.trim()}
                    className={cn(
                      'flex-1 py-3 px-4 rounded-xl',
                      'bg-gradient-to-r from-blue-500 to-purple-600',
                      'text-white font-medium',
                      'flex items-center justify-center gap-2',
                      !textInput.trim() && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Send className="w-4 h-4" />
                    Submit
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Processing state */}
            {isLoading && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center gap-6 py-8"
              >
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                    className={cn(
                      'w-20 h-20 rounded-full',
                      'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500',
                      'p-[2px]'
                    )}
                  >
                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                      <Brain className="w-8 h-8 text-purple-400" />
                    </div>
                  </motion.div>
                </div>
                <div className="text-center">
                  <p className="text-foreground font-medium">
                    {isTranscribing ? 'Processing speech...' : 
                     isExtracting ? 'Learning about you...' : 
                     'Analyzing...'}
                  </p>
                  {isTranscribing && browserCaptionPreview ? (
                    <p className="text-xs text-foreground/50 mt-2 max-w-full px-2 italic">
                      Browser preview (may differ): {browserCaptionPreview}
                    </p>
                  ) : (
                    <p className="text-sm text-foreground/50 mt-1">
                      This only takes a moment
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {mode === 'review' && pendingReview && (
            <TranscriptReviewPanel
              transcript={pendingReview.transcript}
              rawTranscript={pendingReview.rawTranscript}
              refined={pendingReview.refined}
              editedText={editReviewText}
              onEditedTextChange={setEditReviewText}
              onConfirm={handleConfirmReview}
              onDismiss={handleDismissReview}
              confirmLabel="Continue"
              className="mt-4"
            />
          )}

          {/* Error display */}
          {voiceError && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-sm text-center mt-4"
            >
              {voiceError.message}
            </motion.p>
          )}
        </div>
      </div>

      {/* Verification overlay */}
      <AnimatePresence>
        {showVerificationCard && pendingVerifications.length > 0 && (
          <FactVerificationCard
            facts={pendingVerifications}
            onVerify={verifyFact}
            onReject={rejectFact}
            onDismiss={handleVerificationDismiss}
            onComplete={handleVerificationComplete}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default VoiceMemoryCapture;
