import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FirstMovesCard } from '@/components/ui/first-moves-card';
import { QuickWinsCard } from '@/components/ui/quick-wins-card';
import { AILiteracyRealities } from '@/components/ui/ai-literacy-realities';
import { UpgradeModal } from '@/components/ui/upgrade-modal';
import { aggregateLeaderResults, type AggregatedLeaderResults } from '@/utils/aggregateLeaderResults';
import { usePayment } from '@/hooks/usePayment';
import { checkPaymentCallback, handlePaymentSuccess } from '@/utils/handlePaymentSuccess';
import { exportDiagnosticPDF, ExportData } from '@/utils/exportPDF';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { ContactData } from './ContactCollectionForm';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import AuthScreen from './auth/AuthScreen';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { enrichCompanyContext } from '@/utils/enrichCompanyContext';
import { ConnectContextUpgrade } from './ConnectContextUpgrade';
import {
  BenchmarkScoreCard,
  ExecutiveSummary,
  BiggestLeverCard,
  RiskSignalsSection,
  LeadershipDimensionsSection,
  OrgScenariosSection,
  UpgradeBanner,
  generateQuickWins,
  dimensionLabels,
} from './benchmark';

interface LeadershipBenchmarkV2Props {
  assessmentId: string;
  contactData: ContactData;
  onUpgrade?: () => void;
}

export const LeadershipBenchmarkV2: React.FC<LeadershipBenchmarkV2Props> = ({
  assessmentId,
  contactData,
  onUpgrade,
}) => {
  const [results, setResults] = useState<AggregatedLeaderResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [enrichingContext, setEnrichingContext] = useState(false);
  const [leaderId, setLeaderId] = useState<string | null>(null);
  const { createPaymentSession } = usePayment();
  const { toast } = useToast();

  // Handle authentication state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // PHASE 1: Sign-in modal instead of redirect
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleAuth = async () => {
    if (user) {
      await supabase.auth.signOut();
      toast({ title: 'Signed out successfully' });
    } else {
      setAuthModalOpen(true); // Open modal instead of redirect
    }
  };

  const handleAuthSuccess = async () => {
    setAuthModalOpen(false);

    // Link assessment to user
    const { linkAssessmentToUser } = await import('@/utils/assessmentPersistence');
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (currentUser) {
      const linked = await linkAssessmentToUser(assessmentId, currentUser.id);
      if (linked) {
        toast({
          title: 'Assessment Saved!',
          description: 'Your results are now linked to your account',
        });
        // Reload results to reflect user ownership
        loadResults();
      }
    }
  };

  useEffect(() => {
    loadResults();

    // Fetch leader_id from assessment
    const fetchLeaderId = async () => {
      try {
        const { data: assessment } = await supabase
          .from('leader_assessments')
          .select('leader_id')
          .eq('id', assessmentId)
          .maybeSingle();

        if (assessment?.leader_id) {
          setLeaderId(assessment.leader_id);
        }
      } catch (error) {
        console.error('Error fetching leader_id:', error);
      }
    };

    fetchLeaderId();

    // Check for payment callback
    const paymentCallback = checkPaymentCallback();
    if (paymentCallback.success && paymentCallback.assessmentId === assessmentId) {
      // Verify and unlock
      if (paymentCallback.sessionId) {
        handlePaymentSuccess(assessmentId, paymentCallback.sessionId).then(verified => {
          if (verified) {
            // Reload results to show unlocked content
            loadResults();
            toast({
              title: 'Diagnostic Unlocked!',
              description: 'Your Full Leadership Diagnostic is now available.',
            });
          }
        });
      }

      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]); // loadResults and toast are stable references

  const loadResults = async (retryCount = 0) => {
    setIsLoading(true);
    try {
      const data = await aggregateLeaderResults(assessmentId, true);

      // If data is null or incomplete, retry up to 3 times with 2s delay
      if (!data || data.dimensionScores.length === 0) {
        if (retryCount < 3) {
          console.log(`⏳ Data not ready, retrying in 2s (attempt ${retryCount + 1}/3)`);
          setTimeout(() => loadResults(retryCount + 1), 2000);
          return;
        }
      }

      // Defensive check: if all dimension scores are zero, show error
      if (data && data.dimensionScores.every(d => (d.score_numeric || 0) === 0)) {
        console.error('❌ All dimension scores are zero - data structure mismatch detected');
        setResults(null);
        toast({
          title: 'Assessment Data Error',
          description: 'Unable to load valid assessment scores. Please retake the assessment.',
          variant: 'destructive',
        });
      } else {
        setResults(data);

        // Trigger passive company context enrichment if company name is available
        if (data && contactData?.companyName && !enrichingContext) {
          triggerPassiveEnrichment(data, contactData);
        }
      }
    } catch (error) {
      console.error('❌ Error loading results:', error);

      // Retry on error as well
      if (retryCount < 3) {
        console.log(`⏳ Error occurred, retrying in 2s (attempt ${retryCount + 1}/3)`);
        setTimeout(() => loadResults(retryCount + 1), 2000);
        return;
      }

      setResults(null);
      toast({
        title: 'Loading Error',
        description: 'Unable to load assessment results. Please refresh the page.',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  // Passive company context enrichment (non-blocking, background)
  const triggerPassiveEnrichment = async (
    assessmentData: AggregatedLeaderResults,
    contact: ContactData
  ) => {
    if (!contact.companyName) return;

    setEnrichingContext(true);

    try {
      // Get leader_id from assessment
      const { data: assessment } = await supabase
        .from('leader_assessments')
        .select('leader_id')
        .eq('id', assessmentId)
        .single();

      if (!assessment?.leader_id) {
        console.warn('⚠️ No leader_id found for assessment, skipping enrichment');
        return;
      }

      // Check if context already exists
      const { data: existingContext } = await supabase
        .from('company_context')
        .select('id, enrichment_status')
        .eq('leader_id', assessment.leader_id)
        .eq('company_name', contact.companyName)
        .maybeSingle();

      // Only enrich if context doesn't exist or is incomplete
      if (!existingContext || existingContext.enrichment_status === 'pending') {
        console.log('🔍 Triggering passive company context enrichment...');

        const result = await enrichCompanyContext({
          company_name: contact.companyName,
          leader_id: assessment.leader_id,
          assessment_id: assessmentId,
        });

        if (result.success) {
          console.log('✅ Company context enriched:', result.enrichment_status);
        } else {
          console.warn('⚠️ Company context enrichment failed:', result.error);
        }
      } else {
        console.log('✅ Company context already exists:', existingContext.enrichment_status);
      }
    } catch (error) {
      console.error('❌ Error in passive enrichment:', error);
      // Fail silently - this is a background enhancement
    } finally {
      setEnrichingContext(false);
    }
  };

  const handleUpgradeClick = () => {
    setUpgradeModalOpen(true);
  };

  const handleUpgrade = async (upgradeType: 'full_diagnostic' | 'deep_context' | 'bundle' = 'full_diagnostic') => {
    // Create Stripe checkout session
    const checkoutUrl = await createPaymentSession(assessmentId, upgradeType);

    if (checkoutUrl) {
      // Open Stripe checkout in new tab
      window.open(checkoutUrl, '_blank');
    }

    setUpgradeModalOpen(false);
  };

  const handleExportPDF = async () => {
    if (!results || !results.hasFullDiagnostic) return;

    const exportData: ExportData = {
      leaderName: contactData.fullName,
      companyName: contactData.companyName,
      benchmarkScore: results.benchmarkScore,
      benchmarkTier: results.benchmarkTier,
      dimensionScores: results.dimensionScores.map(d => ({
        dimension: dimensionLabels[d.dimension_key] || d.dimension_key,
        score: d.score_numeric || 0,
        tier: d.dimension_tier || 'Emerging',
      })),
      firstMoves: results.firstMoves.map(m => m.content),
      riskSignals: results.riskSignals.map(r => ({
        risk_key: r.risk_key,
        level: r.level,
        description: r.description,
      })),
      tensions: results.tensions.map(t => ({
        dimension_key: t.dimension_key,
        summary_line: t.summary_line,
      })),
      scenarios: results.orgScenarios.map(s => ({
        scenario_key: s.scenario_key,
        summary: s.summary,
      })),
      assessmentId, // Include assessmentId for storage upload
    };

    try {
      await exportDiagnosticPDF(exportData);
      toast({
        title: 'PDF Exported',
        description: 'Your diagnostic report has been downloaded.',
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Unable to generate PDF. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!results) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Unable to load assessment results</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subtle enrichment indicator (non-intrusive) */}
      {enrichingContext && contactData?.companyName && (
        <Card className="border-muted bg-muted/30">
          <CardContent className="p-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Enriching company context...</span>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Badge (Free users only) */}
      {!results.hasFullDiagnostic && (
        <UpgradeBanner
          user={user}
          onUpgradeClick={handleUpgradeClick}
          onAuth={handleAuth}
        />
      )}

      {/* Connect Context Upgrade (Optional, post-diagnostic) */}
      {results && contactData?.companyName && !results.hasDeepContext && leaderId && (
        <ConnectContextUpgrade
          assessmentId={assessmentId}
          leaderId={leaderId}
          companyName={contactData.companyName}
          onEnrichmentComplete={(contextId) => {
            // Reload results to show updated context status
            loadResults();
            toast({
              title: 'Context Connected!',
              description: 'Your company context has been enriched.',
            });
          }}
        />
      )}

      {/* Benchmark Score Card */}
      <BenchmarkScoreCard
        results={results}
        firstName={contactData.fullName.split(' ')[0]}
        onExportPDF={handleExportPDF}
      />

      {/* Executive Summary Section */}
      <ExecutiveSummary results={results} />

      {/* Your Biggest Lever Analysis */}
      <BiggestLeverCard results={results} />

      {/* Quick Wins Section - Free Tier Value */}
      {generateQuickWins(results, contactData).length > 0 && (
        <QuickWinsCard wins={generateQuickWins(results, contactData)} />
      )}

      {/* Risk Signals & Execution Gaps */}
      <RiskSignalsSection results={results} />

      {/* Leadership Dimensions */}
      <LeadershipDimensionsSection results={results} />

      {/* Org Scenarios */}
      <OrgScenariosSection results={results} />

      {/* First 3 Moves */}
      <FirstMovesCard
        moves={results.firstMoves.map(m => ({
          moveNumber: m.move_number,
          content: m.content,
        }))}
        showAll={results.hasFullDiagnostic}
      />

      {/* AI Literacy Realities */}
      <AILiteracyRealities />

      {/* Auth Modal */}
      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent>
          <AuthScreen onSuccess={handleAuthSuccess} />
        </DialogContent>
      </Dialog>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        onUpgrade={handleUpgrade}
        upgradeType="full_diagnostic"
      />
    </div>
  );
};
