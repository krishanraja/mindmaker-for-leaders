import React, { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, TrendingUp, Brain, Zap, Users, MessageSquare, ArrowRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LeadershipBenchmarkV2 } from './LeadershipBenchmarkV2';
import { PromptLibraryV2 } from './PromptLibraryV2';
import { TensionsView } from './TensionsView';
import { BenchmarkComparison } from './BenchmarkComparison';
import { ConsentManager } from './ConsentManager';
import { MeetingPrepTab } from './MeetingPrepTab';
import { ContactData } from './ContactCollectionForm';
import { DeepProfileData } from './DeepProfileQuestionnaire';
import { aggregateLeaderResults, type AggregatedLeaderResults } from '@/utils/aggregateLeaderResults';
import { supabase } from '@/integrations/supabase/client';

interface UnifiedResultsProps {
  assessmentData: unknown;
  promptLibrary: unknown;
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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [aggregatedData, setAggregatedData] = useState<AggregatedLeaderResults | null>(null);
  const [hasDeepContext, setHasDeepContext] = useState(false);

  const [isLoadingId, setIsLoadingId] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // UUID validation helper
  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Restore assessment ID from persistence with retry logic
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1500;

    const checkForAssessmentId = async (): Promise<boolean> => {
      const { getPersistedAssessmentId } = await import('@/utils/assessmentPersistence');
      const { assessmentId: storedId, source } = getPersistedAssessmentId();
      
      if (storedId && isValidUUID(storedId)) {
        console.log('📊 Assessment ID restored from:', source, storedId);
        setAssessmentId(storedId);
        setIsLoadingId(false);
        return true;
      } else if (storedId && !isValidUUID(storedId)) {
        console.error('❌ Invalid assessment ID format:', storedId);
      }
      return false;
    };
    
    const attemptLoad = async () => {
      const found = await checkForAssessmentId();
      if (!found && retryCount < maxRetries) {
        retryCount++;
        console.log(`⏳ Assessment ID not found, retrying (${retryCount}/${maxRetries})...`);
        setTimeout(attemptLoad, retryDelay);
      } else if (!found) {
        setLoadError('Unable to find assessment data. Please complete an assessment first.');
        setIsLoadingId(false);
      }
    };

    attemptLoad();
  }, []);

  // Fetch aggregated data for Compare tab and check deep context status
  useEffect(() => {
    const fetchAggregatedData = async () => {
      if (!assessmentId) return;
      try {
        const data = await aggregateLeaderResults(assessmentId, false);
        setAggregatedData(data);
        setHasDeepContext(data.hasDeepContext || false);
      } catch (error) {
        console.error('❌ Failed to fetch aggregated data:', error);
      }
    };
    fetchAggregatedData();
  }, [assessmentId]);

  return (
    <div className="bg-background min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-4xl mx-auto grid-cols-6 mb-12 bg-secondary/50 p-1 rounded-lg">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center justify-center gap-2"
            >
              <Brain className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger 
              value="tensions" 
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center justify-center gap-2"
            >
              <TrendingUp className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Tensions</span>
            </TabsTrigger>
            <TabsTrigger 
              value="compare" 
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center justify-center gap-2"
            >
              <Users className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Compare</span>
            </TabsTrigger>
            <TabsTrigger 
              value="tools" 
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center justify-center gap-2"
            >
              <Zap className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Tools</span>
            </TabsTrigger>
            <TabsTrigger 
              value="meeting-prep" 
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center justify-center gap-2"
            >
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Meeting Prep</span>
            </TabsTrigger>
            <TabsTrigger 
              value="privacy" 
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center justify-center gap-2"
            >
              <Shield className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            {loadError ? (
              <div className="text-center py-12">
                <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{loadError}</p>
              </div>
            ) : isLoadingId ? (
              <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Loading diagnostic data...</p>
              </div>
            ) : assessmentId ? (
              <LeadershipBenchmarkV2 
                assessmentId={assessmentId}
                contactData={contactData}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No assessment data found</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tensions" className="mt-0">
            {assessmentId ? (
              <TensionsView 
                assessmentId={assessmentId}
                contactData={contactData}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading diagnostic data...</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="compare" className="mt-0">
            {assessmentId && aggregatedData?.leadershipComparison ? (
              <BenchmarkComparison 
                userScore={aggregatedData.benchmarkScore}
                userTier={aggregatedData.benchmarkTier}
                industry={contactData.companyName}
                companySize={contactData.companyName}
                role={contactData.role || 'Leader'}
                leadershipComparison={aggregatedData.leadershipComparison}
                showCohortToggle={true}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading peer comparison data...</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tools" className="mt-0">
            {assessmentId ? (
              <PromptLibraryV2 
                assessmentId={assessmentId}
                contactData={contactData}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading thinking tools...</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="meeting-prep" className="mt-0">
            {assessmentId ? (
              <MeetingPrepTab 
                assessmentId={assessmentId}
                contactData={contactData}
                hasDeepContext={hasDeepContext}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading diagnostic data...</p>
              </div>
            )}
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

        {/* Prompt Coach CTA */}
        <div className="max-w-2xl mx-auto mt-12 p-6 bg-secondary/30 rounded-xl border border-border">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-shrink-0 p-3 bg-primary/10 rounded-full">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-semibold text-foreground">Practice Your Prompts</h3>
              <p className="text-sm text-muted-foreground">
                Test any AI prompt before you use it. Get instant feedback on what's working and what to improve.
              </p>
            </div>
            <Button 
              onClick={() => navigate('/coach')}
              className="group whitespace-nowrap"
            >
              Try Prompt Coach
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
