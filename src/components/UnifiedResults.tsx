import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, Sparkles, Shield, TrendingUp } from 'lucide-react';
import AILeadershipBenchmark from './AILeadershipBenchmark';
import { PromptLibraryResults } from './PromptLibraryResults';
import { ConsentManager } from './ConsentManager';
import { BenchmarkComparison } from './BenchmarkComparison';
import { MomentumDashboard } from './MomentumDashboard';
import { ContactData } from './ContactCollectionForm';
import { DeepProfileData } from './DeepProfileQuestionnaire';

interface UnifiedResultsProps {
  assessmentData: any;
  promptLibrary: any;
  contactData: ContactData;
  deepProfileData: DeepProfileData | null;
  sessionId: string | null;
  onBack?: () => void;
}

export const UnifiedResults: React.FC<UnifiedResultsProps> = ({
  assessmentData,
  promptLibrary,
  contactData,
  deepProfileData,
  sessionId,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<string>("benchmark");
  const [leadershipComparison, setLeadershipComparison] = useState<any>(null);

  return (
    <div className="bg-background min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-4xl mx-auto grid-cols-4 mb-12 gap-2 h-auto p-1.5 bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-2xl shadow-xl shadow-primary/5 border border-primary/10">
            <TabsTrigger 
              value="benchmark"
              className="relative inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-medium text-center tracking-tight transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 data-[state=inactive]:bg-white/60 data-[state=inactive]:dark:bg-white/5 data-[state=inactive]:backdrop-blur-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:border data-[state=inactive]:border-primary/10 data-[state=inactive]:hover:bg-white/80 data-[state=inactive]:dark:hover:bg-white/10 data-[state=inactive]:hover:border-primary/20 data-[state=inactive]:hover:scale-[1.02] data-[state=inactive]:active:scale-[0.98]"
            >
              <Award className="h-4 w-4 flex-shrink-0" />
              <span className="text-center hidden sm:inline">Score</span>
            </TabsTrigger>
            <TabsTrigger 
              value="library"
              className="relative inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-medium text-center tracking-tight transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 data-[state=inactive]:bg-white/60 data-[state=inactive]:dark:bg-white/5 data-[state=inactive]:backdrop-blur-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:border data-[state=inactive]:border-primary/10 data-[state=inactive]:hover:bg-white/80 data-[state=inactive]:dark:hover:bg-white/10 data-[state=inactive]:hover:border-primary/20 data-[state=inactive]:hover:scale-[1.02] data-[state=inactive]:active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4 flex-shrink-0" />
              <span className="text-center hidden sm:inline">Prompts</span>
            </TabsTrigger>
            <TabsTrigger 
              value="benchmarks"
              className="relative inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-medium text-center tracking-tight transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 data-[state=inactive]:bg-white/60 data-[state=inactive]:dark:bg-white/5 data-[state=inactive]:backdrop-blur-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:border data-[state=inactive]:border-primary/10 data-[state=inactive]:hover:bg-white/80 data-[state=inactive]:dark:hover:bg-white/10 data-[state=inactive]:hover:border-primary/20 data-[state=inactive]:hover:scale-[1.02] data-[state=inactive]:active:scale-[0.98]"
            >
              <TrendingUp className="h-4 w-4 flex-shrink-0" />
              <span className="text-center hidden sm:inline">Compare</span>
            </TabsTrigger>
            <TabsTrigger 
              value="privacy"
              className="relative inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-medium text-center tracking-tight transition-all duration-300 data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 data-[state=inactive]:bg-white/60 data-[state=inactive]:dark:bg-white/5 data-[state=inactive]:backdrop-blur-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:border data-[state=inactive]:border-primary/10 data-[state=inactive]:hover:bg-white/80 data-[state=inactive]:dark:hover:bg-white/10 data-[state=inactive]:hover:border-primary/20 data-[state=inactive]:hover:scale-[1.02] data-[state=inactive]:active:scale-[0.98]"
            >
              <Shield className="h-4 w-4 flex-shrink-0" />
              <span className="text-center hidden sm:inline">Privacy</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-0">
            <PromptLibraryResults
              library={promptLibrary}
              contactData={contactData}
            />
          </TabsContent>

          <TabsContent value="benchmark" className="mt-0">
            <AILeadershipBenchmark
              assessmentData={assessmentData}
              sessionId={sessionId}
              contactData={contactData}
              deepProfileData={deepProfileData}
              onBack={onBack}
              onViewToolkit={() => setActiveTab("library")}
              onLeadershipComparisonReady={setLeadershipComparison}
            />
          </TabsContent>

          <TabsContent value="benchmarks" className="mt-0">
            <div className="space-y-6">
              <BenchmarkComparison
                userScore={assessmentData?.totalScore || 0}
                userTier={assessmentData?.tier || 'emerging'}
                companySize={contactData?.companySize}
                role={contactData?.roleTitle}
                leadershipComparison={leadershipComparison}
              />
              {contactData?.companyName && (
                <MomentumDashboard companyHash={contactData.companyName} />
              )}
            </div>
          </TabsContent>

          <TabsContent value="privacy" className="mt-0">
            <div className="max-w-3xl mx-auto">
              <ConsentManager
                userId={sessionId || undefined}
                onUpdate={(consent) => console.log('Consent updated:', consent)}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
