import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Keyboard } from 'lucide-react';
import { AudioRecorder } from '@/utils/audioRecorder';
import { supabase } from '@/integrations/supabase/client';
import { TranscriptionResult } from '@/types/voice';

interface VoiceCaptureProps {
  promptHint: string;
  timeLimit: number;
  onTranscriptReady: (transcript: string) => void;
  onError: (error: string) => void;
  sessionId: string;
  moduleName: 'compass' | 'roi';
  onUseText?: () => void;
}

export const VoiceCapture: React.FC<VoiceCaptureProps> = ({
  promptHint,
  timeLimit,
  onTranscriptReady,
  onError,
  sessionId,
  moduleName,
  onUseText
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recorderRef.current?.isRecording()) {
        recorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      recorderRef.current = new AudioRecorder();
      
      await recorderRef.current.start(async (audioBlob) => {
        setIsTranscribing(true);
        await transcribeAudio(audioBlob);
      });

      setIsRecording(true);
      setElapsedTime(0);

      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => {
          if (prev >= timeLimit) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      onError('Could not access microphone. Please check permissions.');
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
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('sessionId', sessionId);
      formData.append('moduleType', moduleName);

      const { data, error } = await supabase.functions.invoke('voice-transcribe', {
        body: formData
      });

      if (error) throw error;

      const result: TranscriptionResult = data;
      setTranscript(result.transcript);
      onTranscriptReady(result.transcript);
      setIsTranscribing(false);
    } catch (error) {
      console.error('Error transcribing audio:', error);
      setIsTranscribing(false);
      onError('Failed to transcribe audio. Please try again.');
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{promptHint}</p>
        {onUseText && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onUseText}
            className="gap-2"
          >
            <Keyboard className="h-4 w-4" />
            Type instead
          </Button>
        )}
      </div>

      <div className="flex flex-col items-center gap-4">
        {/* Pulsing mic orb */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isTranscribing}
          className={`
            relative w-24 h-24 rounded-full flex items-center justify-center
            transition-all duration-300
            ${isRecording 
              ? 'bg-gradient-to-br from-primary to-primary-600 animate-pulse' 
              : 'bg-primary hover:bg-primary-600'
            }
            ${isTranscribing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isRecording ? (
            <MicOff className="h-10 w-10 text-white" />
          ) : (
            <Mic className="h-10 w-10 text-white" />
          )}
          
          {isRecording && (
            <span className="absolute -bottom-12 text-sm font-medium text-foreground">
              {elapsedTime}s / {timeLimit}s
            </span>
          )}
        </button>

        {/* Status text */}
        <div className="text-center mt-8 min-h-[32px]">
          {isTranscribing && (
            <p className="text-sm text-muted-foreground animate-pulse">
              Transcribing...
            </p>
          )}
          {!isRecording && !isTranscribing && !transcript && (
            <p className="text-sm text-muted-foreground">
              Tap to start recording
            </p>
          )}
          {isRecording && (
            <p className="text-sm text-primary font-medium">
              Recording... Tap to stop
            </p>
          )}
        </div>

        {/* Transcript display */}
        {transcript && (
          <div className="w-full p-4 bg-muted rounded-lg">
            <p className="text-sm text-foreground">{transcript}</p>
          </div>
        )}
      </div>
    </Card>
  );
};
