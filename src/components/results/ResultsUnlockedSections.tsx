import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronDown,
  TrendingUp,
  AlertTriangle,
  Brain,
  Shield,
  Copy,
  Check,
  BarChart3,
} from 'lucide-react';
import { BenchmarkComparison } from '../BenchmarkComparison';
import { TensionCard } from '@/components/ui/tension-card';
import { RiskSignalCard } from '@/components/ui/risk-signal-card';
import { ConsentManager } from '../ConsentManager';
import { AggregatedLeaderResults, type LeaderPromptSet } from '@/utils/aggregateLeaderResults';

interface ResultsUnlockedSectionsProps {
  data: AggregatedLeaderResults | null;
  sessionId: string | null;
  expandedSections: Record<string, boolean>;
  toggleSection: (section: string) => void;
  copiedPromptIdx: string | null;
  onCopyPrompt: (prompt: string, idx: string) => void;
  onDownloadPrompts: (promptSets: LeaderPromptSet[]) => void;
}

export const ResultsUnlockedSections: React.FC<ResultsUnlockedSectionsProps> = ({
  data,
  sessionId,
  expandedSections,
  toggleSection,
  copiedPromptIdx,
  onCopyPrompt,
  onDownloadPrompts,
}) => {
  const topRisks = data?.riskSignals?.slice(0, 3) || [];

  return (
    <>
      {/* 4. Visual Peer Comparison - FOMO-inducing Graph (UNLOCKED) */}
      {data?.leadershipComparison && (
        <Card className="mb-6 shadow-sm border rounded-xl overflow-hidden animate-fade-in">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Your Position Among 500+ Executives</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <BenchmarkComparison
              userScore={data.benchmarkScore || 0}
              userTier={data.benchmarkTier || ''}
              leadershipComparison={data.leadershipComparison}
              showCohortToggle={false}
            />
          </CardContent>
        </Card>
      )}

      {/* Expandable Sections (UNLOCKED) */}
      <div className="space-y-4">

        {/* All Tensions - Rich Cards */}
        {data?.tensions && data.tensions.length > 1 && (
          <Collapsible open={expandedSections.tensions} onOpenChange={() => toggleSection('tensions')}>
            <Card className="shadow-sm border rounded-xl">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="flex flex-row items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-amber-500" />
                    <CardTitle className="text-base font-semibold">Strategic Tensions ({data.tensions.length})</CardTitle>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedSections.tensions ? 'rotate-180' : ''}`} />
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4 px-4 space-y-3">
                  {data.tensions.slice(1).map((tension, idx) => (
                    <TensionCard
                      key={idx}
                      tension={{
                        dimension_key: tension.dimension_key || 'general',
                        summary_line: tension.summary_line,
                        priority_rank: tension.priority_rank || idx + 2
                      }}
                    />
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Risks - Rich Signal Cards */}
        {topRisks.length > 0 && (
          <Collapsible open={expandedSections.risks} onOpenChange={() => toggleSection('risks')}>
            <Card className="shadow-sm border rounded-xl">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="flex flex-row items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <CardTitle className="text-base font-semibold">Risk Signals ({topRisks.length})</CardTitle>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedSections.risks ? 'rotate-180' : ''}`} />
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4 px-4 space-y-3">
                  {topRisks.map((risk, idx) => (
                    <RiskSignalCard
                      key={idx}
                      signal={{
                        risk_key: risk.risk_key || 'shadow_ai',
                        level: (risk.level as 'low' | 'medium' | 'high') || 'medium',
                        description: risk.description,
                        priority_rank: risk.priority_rank || idx + 1
                      }}
                    />
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Prompt Library - Expandable with Copy */}
        {data?.promptSets && data.promptSets.length > 0 && (
          <Collapsible open={expandedSections.prompts} onOpenChange={() => toggleSection('prompts')}>
            <Card className="shadow-sm border rounded-xl">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="flex flex-row items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base font-semibold">Your Prompt Library ({data.promptSets.length} sets)</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownloadPrompts(data.promptSets);
                      }}
                      className="h-8 px-2 text-xs"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Download
                    </Button>
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedSections.prompts ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4 px-4 space-y-4">
                  {data.promptSets.map((set, setIdx) => {
                    const prompts = Array.isArray(set.prompts_json) ? set.prompts_json : [];
                    return (
                      <Collapsible key={setIdx}>
                        <Card className="border bg-card">
                          <CollapsibleTrigger className="w-full">
                            <CardHeader className="p-4 cursor-pointer hover:bg-secondary/20 transition-colors">
                              <div className="flex items-start justify-between">
                                <div className="text-left">
                                  <h4 className="font-semibold text-foreground">{set.title}</h4>
                                  <p className="text-sm text-muted-foreground mt-1">{set.description}</p>
                                  {set.what_its_for && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      <strong>What it's for:</strong> {set.what_its_for}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge variant="outline" className="text-xs">
                                    {prompts.length} prompts
                                  </Badge>
                                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform" />
                                </div>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0 pb-4 px-4 space-y-3">
                              {set.when_to_use && (
                                <p className="text-sm text-muted-foreground">
                                  <strong className="text-foreground">When to use:</strong> {set.when_to_use}
                                </p>
                              )}
                              {set.how_to_use && (
                                <p className="text-sm text-muted-foreground">
                                  <strong className="text-foreground">How to use:</strong> {set.how_to_use}
                                </p>
                              )}
                              <div className="space-y-2 mt-4">
                                {prompts.map((prompt: string | { text?: string; prompt?: string }, promptIdx: number) => {
                                  const promptText = typeof prompt === 'string' ? prompt : (prompt?.text || prompt?.prompt || '');
                                  const uniqueKey = `${setIdx}-${promptIdx}`;
                                  return (
                                    <div
                                      key={promptIdx}
                                      className="p-3 bg-secondary/30 rounded-lg border border-border/50 group"
                                    >
                                      <div className="flex items-start gap-3">
                                        <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                                          {promptIdx + 1}
                                        </span>
                                        <p className="flex-1 text-sm text-foreground leading-relaxed font-mono">
                                          {promptText}
                                        </p>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onCopyPrompt(promptText, uniqueKey);
                                          }}
                                          className="shrink-0 h-8 w-8 p-0 opacity-60 hover:opacity-100 transition-opacity"
                                        >
                                          {copiedPromptIdx === uniqueKey ? (
                                            <Check className="h-4 w-4 text-emerald-500" />
                                          ) : (
                                            <Copy className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Privacy Settings */}
        <Collapsible open={expandedSections.privacy} onOpenChange={() => toggleSection('privacy')}>
          <Card className="shadow-sm border rounded-xl">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors rounded-t-xl">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  <CardTitle className="text-base font-semibold">Privacy Settings</CardTitle>
                </div>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedSections.privacy ? 'rotate-180' : ''}`} />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4 px-4">
                <ConsentManager
                  userId={sessionId || undefined}
                  onUpdate={(consent) => console.log('Consent updated:', consent)}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </>
  );
};
