/**
 * useOnboardingInterview Hook
 *
 * State machine managing the onboarding voice interview flow.
 * Orchestrates: AI question generation -> TTS synthesis -> audio playback
 * -> user voice/text response -> transcription -> repeat.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { invokeEdgeFunction } from '@/lib/api';

export type InterviewStep =
  | 'welcome'
  | 'playing_question'
  | 'waiting_for_response'
  | 'recording'
  | 'transcribing'
  | 'generating_next'
  | 'extracting'
  | 'verification'
  // Session-one resequence: after extraction the leader watches their Memory
  // Web bloom to life, then pressure-tests a real decision (the concrete
  // payoff) before landing on the dashboard.
  | 'blooming'
  | 'first_artifact'
  | 'complete';

export type InputMode = 'voice' | 'text';

interface ConversationMessage {
  role: 'interviewer' | 'user';
  content: string;
}

interface InterviewResponse {
  message: string;
  is_complete: boolean;
  required_fields_captured: string[];
  required_fields_remaining: string[];
}

interface SynthesizeResponse {
  audio_base64: string;
  content_type: string;
}

const WELCOME_TEXT =
  "In about 2 minutes, we'll capture who you are, what you're working on, and how you think. That becomes your Memory Web. Once it's set: any AI tool you use (ChatGPT, Claude, and others) can know your context in one click, you get a short morning briefing tuned to your priorities, and your Edge profile helps you draft and decide faster.";

const FIRST_QUESTION =
  "So let's start simple. What's your name, and what do you do?";

export function useOnboardingInterview() {
  const [step, setStep] = useState<InterviewStep>('welcome');
  const [inputMode, setInputMode] = useState<InputMode>('voice');
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);
  const [fieldsStatus, setFieldsStatus] = useState<{
    captured: string[];
    remaining: string[];
  }>({
    captured: [],
    remaining: ['name', 'role', 'company', 'current_work', 'top_goal', 'challenge'],
  });
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const welcomeAudioCacheRef = useRef<string | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  /**
   * Synthesize text to audio via ElevenLabs and return a data URL.
   * Returns null if synthesis fails (text-only fallback).
   */
  const synthesizeAudio = useCallback(async (text: string): Promise<string | null> => {
    try {
      const result = await invokeEdgeFunction<SynthesizeResponse>(
        'synthesize-interview-audio',
        { text },
        30_000,
      );
      return `data:${result.content_type};base64,${result.audio_base64}`;
    } catch (err) {
      console.warn('TTS synthesis failed, falling back to text-only:', err);
      return null;
    }
  }, []);

  /**
   * Play audio from a data URL. Resolves when playback completes.
   */
  const playAudio = useCallback((audioUrl: string): Promise<void> => {
    return new Promise((resolve) => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => resolve();
      audio.onerror = () => {
        console.warn('Audio playback failed');
        resolve();
      };
      audio.play().catch(() => resolve());
    });
  }, []);

  /**
   * Start the interview: play welcome audio, then show first question.
   */
  const startInterview = useCallback(async (mode: InputMode) => {
    setInputMode(mode);
    setError(null);
    setStep('playing_question');
    setIsAudioLoading(true);

    // Synthesize welcome + first question as one audio
    const fullOpening = `${WELCOME_TEXT} ${FIRST_QUESTION}`;
    setCurrentQuestion(FIRST_QUESTION);

    // Add the first question to conversation
    setConversation([{ role: 'interviewer', content: FIRST_QUESTION }]);
    setTurnCount(1);

    let audioUrl = welcomeAudioCacheRef.current;
    if (!audioUrl) {
      audioUrl = await synthesizeAudio(fullOpening);
      if (audioUrl) {
        welcomeAudioCacheRef.current = audioUrl;
      }
    }

    setCurrentAudioUrl(audioUrl);
    setIsAudioLoading(false);

    if (audioUrl) {
      await playAudio(audioUrl);
    }

    setStep('waiting_for_response');
  }, [synthesizeAudio, playAudio]);

  /**
   * Process the user's response and generate the next question.
   */
  const submitResponse = useCallback(async (userText: string) => {
    if (!userText.trim()) return;

    setError(null);
    setStep('generating_next');

    const updatedConversation: ConversationMessage[] = [
      ...conversation,
      { role: 'user', content: userText.trim() },
    ];
    setConversation(updatedConversation);

    try {
      // Get next question from AI
      const result = await invokeEdgeFunction<InterviewResponse>(
        'onboarding-interview',
        {
          conversation: updatedConversation,
          turn_count: turnCount,
        },
        20_000,
      );

      const newTurn = turnCount + 1;
      setTurnCount(newTurn);
      setFieldsStatus({
        captured: result.required_fields_captured || [],
        remaining: result.required_fields_remaining || [],
      });

      if (result.is_complete) {
        // Interview is done; add final message and move to extraction
        const finalConversation: ConversationMessage[] = [
          ...updatedConversation,
          { role: 'interviewer', content: result.message },
        ];
        setConversation(finalConversation);
        setCurrentQuestion(result.message);
        setIsInterviewComplete(true);

        // Synthesize and play the final message
        setStep('playing_question');
        setIsAudioLoading(true);
        const audioUrl = await synthesizeAudio(result.message);
        setCurrentAudioUrl(audioUrl);
        setIsAudioLoading(false);

        if (audioUrl) {
          await playAudio(audioUrl);
        }

        // Move to extraction
        setStep('extracting');
        return;
      }

      // Add AI question to conversation
      const nextConversation: ConversationMessage[] = [
        ...updatedConversation,
        { role: 'interviewer', content: result.message },
      ];
      setConversation(nextConversation);
      setCurrentQuestion(result.message);

      // Synthesize and play the next question
      setStep('playing_question');
      setIsAudioLoading(true);
      const audioUrl = await synthesizeAudio(result.message);
      setCurrentAudioUrl(audioUrl);
      setIsAudioLoading(false);

      if (audioUrl) {
        await playAudio(audioUrl);
      }

      setStep('waiting_for_response');
    } catch (err) {
      console.error('Interview error:', err);
      setError('Something went wrong. Let me try that again.');
      setStep('waiting_for_response');
    }
  }, [conversation, turnCount, synthesizeAudio, playAudio]);

  /**
   * Build a combined transcript from the full conversation
   * for fact extraction.
   */
  const getFullTranscript = useCallback((): string => {
    return conversation
      .map((msg) => {
        const label = msg.role === 'interviewer' ? 'Krishan' : 'User';
        return `${label}: ${msg.content}`;
      })
      .join('\n\n');
  }, [conversation]);

  /**
   * Move to verification step after extraction is complete.
   */
  const moveToVerification = useCallback(() => {
    setStep('verification');
  }, []);

  /**
   * Mark the onboarding as complete.
   */
  const completeOnboarding = useCallback(() => {
    localStorage.setItem('mindmaker_onboarded', 'true');
    setStep('complete');
  }, []);

  /**
   * Skip audio playback and go straight to waiting for response.
   */
  const skipAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (step === 'playing_question' && !isInterviewComplete) {
      setStep('waiting_for_response');
    }
  }, [step, isInterviewComplete]);

  return {
    step,
    inputMode,
    currentQuestion,
    currentAudioUrl,
    isAudioLoading,
    conversation,
    turnCount,
    isInterviewComplete,
    fieldsStatus,
    error,
    welcomeText: WELCOME_TEXT,
    startInterview,
    submitResponse,
    getFullTranscript,
    moveToVerification,
    completeOnboarding,
    skipAudio,
    setStep,
    setInputMode,
  };
}
