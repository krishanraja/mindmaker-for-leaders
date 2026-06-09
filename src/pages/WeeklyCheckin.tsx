import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/ui/voice-input';
import { ArrowLeft, Lightbulb, Target, Brain, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getPersistedAssessmentId } from '@/utils/assessmentPersistence';
import { aggregateLeaderResults } from '@/utils/aggregateLeaderResults';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCreateMission } from '@/hooks/useMissions';
import { useCreateCheckIn } from '@/hooks/useCheckIns';
import { motion, AnimatePresence } from 'framer-motion';

export default function WeeklyCheckin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createMission } = useCreateMission();
  const { createCheckIn } = useCreateCheckIn();
  const [textInput, setTextInput] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverInsight, setServerInsight] = useState<string | null>(null);
  const [serverAction, setServerAction] = useState<string | null>(null);
  const [serverWhy, setServerWhy] = useState<string | null>(null);
  const [acceptedMove, setAcceptedMove] = useState(false);

  const question = useMemo(() => {
    return "What AI decision did you face this week?";
  }, []);

  const combinedInput = [textInput, transcript].filter(Boolean).join(' ');

  const handleSubmit = async () => {
    if (!combinedInput.trim()) return;
    setIsSubmitting(true);
    setIsSubmitted(false);
    setServerInsight(null);
    setServerAction(null);
    setServerWhy(null);

    let baselineContext: {
      benchmarkTier: string;
      benchmarkScore: number;
      topTension: string | null;
      topRisk: string | null;
    } | null = null;
    try {
      const { assessmentId } = getPersistedAssessmentId();
      if (assessmentId) {
        const aggregated = await aggregateLeaderResults(assessmentId, false);
        baselineContext = {
          benchmarkTier: aggregated.benchmarkTier,
          benchmarkScore: aggregated.benchmarkScore,
          topTension: aggregated.tensions?.[0]?.summary_line ?? null,
          topRisk: aggregated.riskSignals?.[0]?.description ?? null,
        };
      }
    } catch {
      // ignore
    }

    try {
      const { data, error } = await supabase.functions.invoke('submit-weekly-checkin', {
        body: {
          transcript: combinedInput.trim(),
          asked_prompt_key: 'weekly_default',
          baseline_context: baselineContext,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setServerInsight(data?.insight ?? null);
      setServerAction(data?.action_text ?? null);
      setServerWhy(data?.why_text ?? null);
      setIsSubmitted(true);

      // Save check-in to database
      if (user?.id) {
        try {
          await createCheckIn({
            checkInText: combinedInput.trim(),
          });
        } catch {
          // non-blocking
        }
      }
    } catch (e) {
      console.error('Weekly check-in submit failed:', e);
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptMove = async () => {
    if (!serverAction || !user?.id) return;
    try {
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() + 14);
      await createMission({
        missionText: serverAction,
        checkInDate: checkInDate.toISOString().split('T')[0],
      });
      setAcceptedMove(true);
    } catch (err) {
      console.error('Failed to create mission from check-in:', err);
    }
  };

  return (
    <div className="h-screen-safe overflow-hidden flex flex-col bg-background">
      <header className="flex-shrink-0 flex items-center gap-4 px-4 py-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate('/today')} className="-ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Weekly check-in</h1>
          <p className="text-xs text-muted-foreground">
            30 seconds max. One real decision, not theory.
          </p>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto scrollbar-hide p-4">
        <div className="max-w-2xl mx-auto">

      <Card className="border rounded-xl">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 rounded-lg bg-primary/10 p-2">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">{question}</div>
              <p className="text-sm text-muted-foreground mt-1">
                Type or speak it. We'll turn it into one insight + one action.
              </p>
            </div>
          </div>

          {/* Text input */}
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type your reflection here..."
            className="w-full mt-4 min-h-[80px] p-3 rounded-lg border border-border bg-background text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

          {/* Voice input + submit */}
          <div className="mt-3 flex items-center gap-3">
            <VoiceInput
              maxDuration={30}
              placeholder="Or record 30s"
              onTranscript={(t) => setTranscript((prev) => (prev ? `${prev} ${t}` : t))}
            />
            <Button
              variant="cta"
              disabled={!combinedInput.trim() || isSubmitting}
              onClick={handleSubmit}
              className="h-10"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>

          {transcript ? (
            <div className="mt-3 rounded-lg bg-secondary/30 p-3 text-sm text-foreground">
              <span className="text-xs text-muted-foreground block mb-1">Voice transcript:</span>
              {transcript}
            </div>
          ) : null}

          {/* AI Response Cards */}
          <AnimatePresence>
            {isSubmitted && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 space-y-3"
              >
                {/* Reflection/Insight card */}
                {serverInsight && (
                  <Card className="border-l-4 border-l-blue-500 bg-blue-500/5">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <Brain className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-blue-600 mb-1">Reflection</p>
                          <p className="text-sm text-foreground">{serverInsight}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action/Recommendation card */}
                {serverAction && (
                  <Card className="border-l-4 border-l-emerald-500 bg-emerald-500/5">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <Target className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-emerald-600 mb-1">
                            Suggested Move
                          </p>
                          <p className="text-sm text-foreground">{serverAction}</p>
                          {user?.id && !acceptedMove && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleAcceptMove}
                              className="mt-2 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Accept as Mission
                            </Button>
                          )}
                          {acceptedMove && (
                            <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Added to your missions
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Why card */}
                {serverWhy && (
                  <Card className="border-l-4 border-l-amber-500 bg-amber-500/5">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-amber-600 mb-1">Why</p>
                          <p className="text-sm text-foreground">{serverWhy}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!serverInsight && !serverAction && (
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-sm font-medium text-foreground">Captured.</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Saved. Your weekly action will appear on Today.
                    </p>
                  </div>
                )}

                <div className="pt-1">
                  <Button variant="outline" onClick={() => navigate('/today')}>
                    Done
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

        </div>
      </main>
    </div>
  );
}
