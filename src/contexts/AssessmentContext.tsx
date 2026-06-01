import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ContactData } from '@/components/ContactCollectionForm';
import { DeepProfileData } from '@/components/DeepProfileQuestionnaire';
import { supabase } from '@/integrations/supabase/client';

// Assessment insights summary for cross-feature intelligence
export interface AssessmentInsights {
  benchmarkScore: number;
  benchmarkTier: string;
  topTension: string | null;
  topGap: string | null;
  learningStyle: string | null;
  primaryBottleneck: string | null;
  suggestedPromptCategories: string[];
}

interface AssessmentContextValue {
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  
  contactData: ContactData | null;
  setContactData: (data: ContactData | null) => void;
  
  deepProfileData: DeepProfileData | null;
  setDeepProfileData: (data: DeepProfileData | null) => void;
  
  promptLibrary: any;
  setPromptLibrary: (library: any) => void;
  
  companyHash: string | null;
  setCompanyHash: (hash: string | null) => void;
  
  // Phase 3: Connected Intelligence
  assessmentInsights: AssessmentInsights | null;
  setAssessmentInsights: (insights: AssessmentInsights | null) => void;
  
  assessmentId: string | null;
  setAssessmentId: (id: string | null) => void;
}

const AssessmentContext = createContext<AssessmentContextValue | undefined>(undefined);

export const AssessmentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [contactData, setContactData] = useState<ContactData | null>(null);
  const [deepProfileData, setDeepProfileData] = useState<DeepProfileData | null>(null);
  const [promptLibrary, setPromptLibrary] = useState<any>(null);
  const [companyHash, setCompanyHash] = useState<string | null>(null);
  const [assessmentInsights, setAssessmentInsights] = useState<AssessmentInsights | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  // Client-server sync: Reconcile state with server on mount
  useEffect(() => {
    const syncWithServer = async () => {
      if (!assessmentId) return;

      try {
        // Fetch assessment from server
        const { data: assessment, error } = await supabase
          .from('leader_assessments')
          .select('*, leaders(*)')
          .eq('id', assessmentId)
          .single();

        if (error) {
          console.warn('⚠️ Failed to sync assessment with server:', error);
          return;
        }

        if (assessment) {
          // Sync contact data if available
          if (assessment.leaders && !contactData) {
            const leader = assessment.leaders as any;
            setContactData({
              fullName: leader.name || '',
              email: leader.email || '',
              department: leader.role || '',
              primaryFocus: leader.primary_focus || '',
              consentToInsights: true,
            });
          }

          // Sync generation status
          const generationStatus = assessment.generation_status as any;
          if (generationStatus) {
            // Update insights if available
            if (generationStatus.insights_generated && !assessmentInsights) {
              // Fetch insights from related tables
              const { data: scores } = await supabase
                .from('leader_dimension_scores')
                .select('*')
                .eq('assessment_id', assessmentId)
                .order('score_numeric', { ascending: false })
                .limit(1);

              if (scores && scores.length > 0) {
                setAssessmentInsights({
                  benchmarkScore: assessment.benchmark_score || 0,
                  benchmarkTier: assessment.benchmark_tier || 'AI-Emerging',
                  topTension: null,
                  topGap: scores[0]?.dimension_key || null,
                  learningStyle: assessment.learning_style || null,
                  primaryBottleneck: null,
                  suggestedPromptCategories: [],
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error syncing with server:', error);
      }
    };

    syncWithServer();
  }, [assessmentId]); // Only sync when assessmentId changes

  const value = {
    sessionId,
    setSessionId,
    contactData,
    setContactData,
    deepProfileData,
    setDeepProfileData,
    promptLibrary,
    setPromptLibrary,
    companyHash,
    setCompanyHash,
    assessmentInsights,
    setAssessmentInsights,
    assessmentId,
    setAssessmentId,
  };

  return (
    <AssessmentContext.Provider value={value}>
      {children}
    </AssessmentContext.Provider>
  );
};

export const useAssessment = (): AssessmentContextValue => {
  const context = useContext(AssessmentContext);
  if (context === undefined) {
    throw new Error('useAssessment must be used within an AssessmentProvider');
  }
  return context;
};
