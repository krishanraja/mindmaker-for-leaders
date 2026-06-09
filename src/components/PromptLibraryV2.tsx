import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EnhancedPromptCard } from '@/components/ui/enhanced-prompt-card';
import { ExecutiveSummaryCard } from '@/components/ui/executive-summary-card';
import { aggregateLeaderResults, isContentLocked, type LeaderPromptSet } from '@/utils/aggregateLeaderResults';
import { Loader2, Copy, CheckCircle, Brain } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ContactData } from './ContactCollectionForm';
import { supabase } from '@/integrations/supabase/client';

interface PromptLibraryV2Props {
  assessmentId: string;
  contactData: ContactData;
}

type PromptSet = LeaderPromptSet & { id?: string };

interface PromptResults {
  promptSets?: PromptSet[];
  hasFullDiagnostic?: boolean;
}

interface PersonalizedInsights {
  yourEdge?: string;
  yourRisk: string;
  yourNextMove: string;
}

interface EnrichedData {
  personalizedInsights?: PersonalizedInsights | null;
}

export const PromptLibraryV2: React.FC<PromptLibraryV2Props> = ({
  assessmentId,
  contactData,
}) => {
  const [results, setResults] = useState<PromptResults | null>(null);
  const [enrichedData, setEnrichedData] = useState<EnrichedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copyingAll, setCopyingAll] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (assessmentId) {
      loadPrompts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]); // loadPrompts is stable, assessmentId is the trigger

  const loadPrompts = async () => {
    setIsLoading(true);
    const data = await aggregateLeaderResults(assessmentId, true);
    setResults(data);
    
    const { data: profileData } = await supabase
      .from('prompt_library_profiles')
      .select('*')
      .eq('session_id', assessmentId)
      .single();
    
    if (profileData?.executive_profile) {
      setEnrichedData({
        personalizedInsights: profileData.executive_profile as unknown as PersonalizedInsights
      });
    }
    setIsLoading(false);
  };

  const handleCopyAll = async () => {
    if (!results || !results.promptSets || results.promptSets.length === 0) {
      toast({
        title: 'No prompts available',
        description: 'Please wait for prompts to generate',
        variant: 'destructive',
      });
      return;
    }
    
    setCopyingAll(true);
    
    const allPromptsText = results.promptSets
      .map((set: PromptSet) => {
        const prompts = Array.isArray(set.prompts_json) ? set.prompts_json : [];
        return `## ${set.title}\n\n${prompts.join('\n\n')}`;
      })
      .join('\n\n---\n\n');

    try {
      await navigator.clipboard.writeText(allPromptsText);
      toast({
        title: 'All Prompts Copied!',
        description: 'Your complete prompt library is ready to use',
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
    
    setCopyingAll(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Crafting your executive AI command center...</p>
        </div>
      </div>
    );
  }

  if (!results || !results.promptSets || results.promptSets.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Brain className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Your prompts are still being generated...</p>
          <p className="text-sm text-muted-foreground mt-2">This usually takes 30-45 seconds. Please refresh in a moment.</p>
        </CardContent>
      </Card>
    );
  }

  const hasEnrichedData = enrichedData?.personalizedInsights;

  return (
    <ScrollArea className="h-[calc(100vh-12rem)]">
      <div className="space-y-6 pr-4">
        {/* Executive Leadership Edge */}
        {hasEnrichedData && enrichedData.personalizedInsights.yourEdge && (
          <ExecutiveSummaryCard
            edge={enrichedData.personalizedInsights.yourEdge}
            risk={enrichedData.personalizedInsights.yourRisk}
            nextMove={enrichedData.personalizedInsights.yourNextMove}
          />
        )}

        {/* AI Command Center */}
        <Card>
        <CardHeader>
          <CardTitle>Your Thinking Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {contactData.fullName.split(' ')[0]}, these are ways to use AI as a thinking partner 
            in your daily work. Each is tailored to your role, priorities, and how you communicate.
          </p>
        </CardContent>
      </Card>

      {/* Copy All Button (Paid users only) */}
      {results.hasFullDiagnostic && (
        <div className="flex justify-end">
          <Button 
            onClick={handleCopyAll} 
            disabled={copyingAll}
            className="gap-2"
          >
            {copyingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            Copy All Tools
          </Button>
        </div>
      )}

      {/* Prompt Cards */}
      <div className="space-y-4">
        {(results?.promptSets || []).map((set: PromptSet, index: number) => (
          <EnhancedPromptCard
            key={set.id}
            title={set.title || 'Untitled Prompt Set'}
            whatItsFor={set.what_its_for || 'Tailored for your role and context'}
            whenToUse={set.when_to_use || 'Use when you need targeted AI support'}
            howToUse={set.how_to_use || 'Copy and adapt to your specific needs'}
            prompts={Array.isArray(set.prompts_json) ? set.prompts_json : []}
            isLocked={isContentLocked(results?.hasFullDiagnostic || false, 'prompt', index)}
          />
        ))}
      </div>

      {/* Quick Start Tips (Always visible) */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">Quick Start Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm">Copy prompts into ChatGPT, Claude, or your preferred AI tool</p>
          </div>
          <div className="flex gap-3">
            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm">Adapt the prompts with your specific data and context</p>
          </div>
          <div className="flex gap-3">
            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm">Start with the prompts marked as highest priority for your role</p>
          </div>
        </CardContent>
      </Card>
      </div>
    </ScrollArea>
  );
};
