import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, Send, Loader2, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/lib/api';
import { AudioRecorder } from '@/utils/audioRecorder';

interface DailyProvocationProps {
  prompt: {
    id: string;
    question: string;
    category: string;
  };
  onResponseSubmitted: () => void;
}

export const DailyProvocation: React.FC<DailyProvocationProps> = ({
  prompt,
  onResponseSubmitted,
}) => {
  const [responseText, setResponseText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current?.isRecording()) recorderRef.current.stop();
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      recorderRef.current = new AudioRecorder();
      
      await recorderRef.current.start(async (audioBlob) => {
        setIsTranscribing(true);
        await transcribeAudio(audioBlob);
      });

      setIsRecording(true);
      setElapsedTime(0);

      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => {
          if (prev >= 60) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Could not access microphone. Please type your answer instead.');
    }
  };

  const stopRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const result = await api.transcribeAudio(audioBlob, `reflection-${Date.now()}`, 'reflection');
      if (result?.transcript) {
        setResponseText(result.transcript);
      }
    } catch (err) {
      console.error('Transcription error:', err);
      setError('Transcription failed. Please type your answer.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!responseText.trim()) {
      setError('Please provide a response before submitting.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Submit reflection to edge function
      const { data, error } = await supabase.functions.invoke('submit-reflection', {
        body: {
          prompt_id: prompt.id,
          response_text: responseText.trim(),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Clear response and notify parent
      setResponseText('');
      onResponseSubmitted();
    } catch (err) {
      console.error('Error submitting reflection:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit reflection. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [responseText, prompt.id, onResponseSubmitted]);

  const handleSkip = useCallback(async () => {
    try {
      // Mark prompt as skipped
      await supabase
        .from('leader_prompt_history')
        .update({ skipped: true })
        .eq('prompt_id', prompt.id)
        .order('shown_at', { ascending: false })
        .limit(1);

      onResponseSubmitted();
    } catch (err) {
      console.error('Error skipping prompt:', err);
    }
  }, [prompt.id, onResponseSubmitted]);

  return (
    <Card className="mb-6 border rounded-2xl bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-foreground">Daily Provocation</span>
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-4 leading-relaxed">
          {prompt.question}
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <Textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder="Share your thoughts... (or use voice input below)"
            className="min-h-[120px] resize-none"
            disabled={isRecording || isTranscribing || isSubmitting}
          />

          <div className="flex items-center gap-3">
            {isRecording ? (
              <>
                <Button
                  variant="outline"
                  onClick={stopRecording}
                  className="flex items-center gap-2"
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  Stop Recording ({elapsedTime}s)
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={startRecording}
                disabled={isTranscribing || isSubmitting}
                className="flex items-center gap-2"
              >
                <Mic className="h-4 w-4" />
                {isTranscribing ? 'Transcribing...' : 'Voice Input'}
              </Button>
            )}

            {isTranscribing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing audio...
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSubmit}
              disabled={!responseText.trim() || isSubmitting || isRecording || isTranscribing}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Reflection
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={isSubmitting}
              className="text-muted-foreground"
            >
              Skip for now
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
