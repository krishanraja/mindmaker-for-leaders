import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Mic, Send, Lightbulb, AlertTriangle, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { VoiceInput } from '@/components/ui/voice-input';
import { PressureTestPanel } from '@/components/operator/decision/PressureTestPanel';

const DECISION_ENGINE_ENABLED = import.meta.env.VITE_DECISION_ENGINE_ENABLED === 'true';

interface AdvisorSession {
  id: string;
  question_text: string;
  recommendation: string;
  reasoning: string;
  risk_assessment: string | null;
  alternative_suggestion: string | null;
  created_at: string;
}

interface DecisionAdvisorProps {
  operatorProfileId: string;
}

export function DecisionAdvisor({ operatorProfileId }: DecisionAdvisorProps) {
  const [mode, setMode] = useState<'pressure' | 'quick'>(DECISION_ENGINE_ENABLED ? 'pressure' : 'quick');
  const [question, setQuestion] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<AdvisorSession | null>(null);
  const [recentSessions, setRecentSessions] = useState<AdvisorSession[]>([]);

  const handleSubmit = async () => {
    if (!question.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('operator-decision-advisor', {
        body: {
          question_text: question.trim(),
        },
      });

      if (error) throw error;

      if (data) {
        const session: AdvisorSession = {
          id: data.session_id || `temp-${Date.now()}`,
          question_text: question.trim(),
          recommendation: data.recommendation,
          reasoning: data.reasoning,
          risk_assessment: data.risk_assessment,
          alternative_suggestion: data.alternative_suggestion,
          created_at: new Date().toISOString(),
        };

        setCurrentResponse(session);
        setRecentSessions(prev => [session, ...prev].slice(0, 5));
        setQuestion('');
      }
    } catch (error) {
      console.error('Error getting advisor response:', error);
      alert('Failed to get recommendation. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Load recent sessions
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('operator_advisor_sessions')
          .select('*')
          .eq('operator_profile_id', operatorProfileId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;

        if (data && isMounted) {
          setRecentSessions(data);
        }
      } catch (error) {
        console.warn('Error loading recent sessions:', error);
      }
    })();
    return () => { isMounted = false; };
  }, [operatorProfileId]);

  return (
    <div className="space-y-6">
      {DECISION_ENGINE_ENABLED && (
        <div className="inline-flex rounded-lg border border-border p-1 bg-secondary/40 text-sm">
          <button
            onClick={() => setMode('pressure')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${mode === 'pressure' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Pressure test
          </button>
          <button
            onClick={() => setMode('quick')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${mode === 'quick' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Quick advice
          </button>
        </div>
      )}

      {DECISION_ENGINE_ENABLED && mode === 'pressure' ? (
        <PressureTestPanel />
      ) : (
      <>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              Quick Decision Advisor
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Ask "should I do X or Y?" and get a clear recommendation based on your business context.
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <Mic className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-xs text-muted-foreground flex-1">
                Prefer to speak? Record your question:
              </span>
              <VoiceInput
                placeholder="Record"
                maxDuration={60}
                onTranscript={(transcript) => {
                  setQuestion(prev => prev ? `${prev}\n\n${transcript}` : transcript);
                }}
              />
            </div>

            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Should I get ChatGPT Pro or Business account?"
              className="min-h-[100px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />

            <Button
              onClick={handleSubmit}
              disabled={!question.trim() || isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? 'Getting recommendation...' : 'Get Recommendation'}
              <Send className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Response */}
      {currentResponse && (
        <Card className="border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <h4 className="font-semibold text-foreground">Your Question</h4>
              <Badge variant="outline" className="text-xs">
                {new Date(currentResponse.created_at).toLocaleDateString()}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {currentResponse.question_text}
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <h5 className="font-semibold text-foreground">Recommendation</h5>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {currentResponse.recommendation}
                </p>
              </div>

              <div>
                <h5 className="font-semibold text-foreground mb-2">Why</h5>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {currentResponse.reasoning}
                </p>
              </div>

              {currentResponse.risk_assessment && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <h5 className="font-semibold text-foreground">Watch Out For</h5>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentResponse.risk_assessment}
                  </p>
                </div>
              )}

              {currentResponse.alternative_suggestion && (
                <div>
                  <h5 className="font-semibold text-foreground mb-2">Alternative</h5>
                  <p className="text-sm text-muted-foreground">
                    {currentResponse.alternative_suggestion}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h4 className="font-semibold text-foreground mb-4">Recent Questions</h4>
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors cursor-pointer"
                  onClick={() => setCurrentResponse(session)}
                >
                  <p className="text-sm text-foreground mb-1 line-clamp-2">
                    {session.question_text}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.recommendation.slice(0, 100)}...
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </>
      )}
    </div>
  );
}
