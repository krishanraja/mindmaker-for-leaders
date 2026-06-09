import { useState, useEffect } from 'react';
import { ArrowLeft, Send, Lightbulb, Zap, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VoiceInput } from '@/components/sharpen/VoiceInput';
import { InsightCard } from '@/components/sharpen/InsightCard';
import { CopyablePrompt } from '@/components/sharpen/CopyablePrompt';
import { LoadingState } from '@/components/sharpen/LoadingState';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAssessment, type AssessmentInsights } from '@/contexts/AssessmentContext';

interface CoachResult {
  whats_working: string;
  one_thing_to_try: string;
  upgraded_prompt: string;
  why_this_works: string;
  model_hint?: string | null;
}

// Suggested prompts based on assessment gaps
const getSuggestedPrompts = (insights: AssessmentInsights | null) => {
  const suggestions: { title: string; prompt: string; category: string }[] = [];
  
  if (!insights) {
    // Default suggestions if no assessment data
    return [
      { title: "Strategic planning", prompt: "Help me create a 90-day AI adoption roadmap for my team", category: "Strategy" },
      { title: "Team alignment", prompt: "Draft talking points for explaining AI value to skeptical stakeholders", category: "Communication" },
      { title: "Quick wins", prompt: "Identify 3 repetitive tasks in my workflow that AI could automate", category: "Efficiency" }
    ];
  }
  
  // Personalized suggestions based on assessment insights
  if (insights.topTension?.toLowerCase().includes('alignment') || insights.topGap?.toLowerCase().includes('team')) {
    suggestions.push({
      title: "Address your alignment gap",
      prompt: "Create a one-page AI vision document I can share with my leadership team to build consensus",
      category: "Your Gap"
    });
  }
  
  if (insights.topTension?.toLowerCase().includes('kpi') || insights.primaryBottleneck?.toLowerCase().includes('measurement')) {
    suggestions.push({
      title: "Connect AI to KPIs",
      prompt: "Help me define 3 measurable KPIs to track AI adoption impact on my team's performance",
      category: "Your Gap"
    });
  }
  
  if (insights.benchmarkTier === 'Emerging' || insights.benchmarkTier === 'Establishing') {
    suggestions.push({
      title: "Build your foundation",
      prompt: "Create a beginner-friendly AI learning path for a busy executive with 2 hours per week",
      category: "Growth"
    });
  }
  
  // Always add at least one suggestion
  if (suggestions.length === 0) {
    suggestions.push({
      title: "Leverage your strength",
      prompt: `As a ${insights.benchmarkTier || 'developing'} AI leader, what's one advanced technique I should master next?`,
      category: "Growth"
    });
  }
  
  return suggestions;
};

export default function PromptCoach() {
  const navigate = useNavigate();
  const { assessmentInsights, contactData } = useAssessment();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CoachResult | null>(null);
  
  const suggestedPrompts = getSuggestedPrompts(assessmentInsights);
  const hasAssessmentContext = !!assessmentInsights;

  const handleVoiceTranscript = (text: string) => {
    setPrompt(prev => prev + (prev ? ' ' : '') + text);
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt first');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('prompt-coach', {
        body: { 
          prompt: prompt.trim(),
          // Pass assessment context for personalized coaching
          context: assessmentInsights ? {
            benchmarkTier: assessmentInsights.benchmarkTier,
            topGap: assessmentInsights.topGap,
            learningStyle: assessmentInsights.learningStyle,
            role: contactData?.role || null
          } : null
        }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
    } catch (error) {
      console.error('Prompt coach error:', error);
      toast.error(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryAnother = () => {
    setPrompt('');
    setResult(null);
  };

  const handleApplyUpgrade = () => {
    if (result?.upgraded_prompt) {
      setPrompt(result.upgraded_prompt);
      setResult(null);
      toast.success('Upgraded prompt applied');
    }
  };

  const handleSuggestionClick = (suggestionPrompt: string) => {
    setPrompt(suggestionPrompt);
  };

  return (
    <div className="h-screen-safe overflow-hidden flex flex-col bg-background">
      {/* Header */}
      <header className="flex-shrink-0 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="font-semibold text-lg text-foreground">Prompt Coach</span>
          </div>
          {result && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTryAnother}
              className="text-muted-foreground"
            >
              Try another
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto scrollbar-hide container mx-auto px-4 py-8 max-w-2xl">
        {!result && !isLoading && (
          <div className="space-y-6">
            {/* Hero */}
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
                Check your prompt before you use it
              </h1>
              <p className="text-muted-foreground">
                Paste or speak what you're about to ask AI
              </p>
            </div>

            {/* Connected Intelligence: Suggested Prompts based on Assessment */}
            {suggestedPrompts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {hasAssessmentContext ? 'Suggested for your gaps' : 'Try these prompts'}
                  </span>
                  {hasAssessmentContext && (
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                      Personalized
                    </Badge>
                  )}
                </div>
                <div className="grid gap-2">
                  {suggestedPrompts.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion.prompt)}
                      className="text-left p-3 bg-secondary/30 hover:bg-secondary/50 rounded-lg transition-colors border border-transparent hover:border-border"
                    >
                      <div className="flex items-start gap-3">
                        <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{suggestion.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{suggestion.prompt}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {suggestion.category}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="space-y-4">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="For example: Summarize this document for me..."
                className="min-h-[160px] text-base resize-none"
                disabled={isLoading}
              />

              <div className="flex items-center justify-between gap-4">
                <VoiceInput 
                  onTranscript={handleVoiceTranscript}
                  isDisabled={isLoading}
                />
                
                <Button
                  onClick={handleSubmit}
                  disabled={!prompt.trim() || isLoading}
                  variant="cta"
                  className="flex-1 h-14 text-base"
                >
                  <Send className="h-5 w-5 mr-2" />
                  Check my prompt
                </Button>
              </div>
            </div>

            {/* Hint */}
            <p className="text-center text-muted-foreground text-sm">
              Quick feedback before you hit send
            </p>
          </div>
        )}

        {isLoading && (
          <LoadingState message="Reviewing your prompt..." />
        )}

        {result && (
          <div className="space-y-4">
            {/* What's Working */}
            <InsightCard
              icon={<span className="text-lg">✓</span>}
              title="What's working"
              variant="default"
            >
              {result.whats_working}
            </InsightCard>

            {/* One Thing to Try */}
            <InsightCard
              icon={<Lightbulb className="h-5 w-5" />}
              title="One thing to try"
              variant="highlight"
            >
              {result.one_thing_to_try}
            </InsightCard>

            {/* Upgraded Prompt */}
            <div className="pt-4">
              <CopyablePrompt 
                prompt={result.upgraded_prompt}
                title="Upgraded version"
              />
              <Button
                variant="outline"
                onClick={handleApplyUpgrade}
                className="w-full mt-3 h-12 text-base"
              >
                Use this version
              </Button>
            </div>

            {/* Why This Works */}
            <div className="pt-4 border-t border-border">
              <p className="text-muted-foreground text-sm leading-relaxed">
                <strong className="text-foreground">Why this works:</strong> {result.why_this_works}
              </p>
            </div>

            {/* Model Hint */}
            {result.model_hint && (
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  <span className="mr-2">🤖</span>
                  {result.model_hint}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
