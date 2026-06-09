import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Loader2, Download, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ContactData } from './ContactCollectionForm';
import { exportDiagnosticPDF } from '@/utils/exportPDF';

interface MeetingPrepTabProps {
  assessmentId: string;
  contactData: ContactData;
  hasDeepContext?: boolean;
}

interface PrepMaterials {
  prep_sections: Array<{
    title: string;
    content: string;
    priority: 'high' | 'medium' | 'low';
    diagnostic_tie?: string;
  }>;
  talking_points: string[];
  strategic_questions: string[];
  risk_considerations: string[];
  recommended_actions: string[];
}

interface PrepSession {
  id: string;
  meeting_title: string;
  meeting_date: string | null;
  agenda_text: string;
  prep_materials: PrepMaterials;
  generated_at: string;
}

export const MeetingPrepTab: React.FC<MeetingPrepTabProps> = ({
  assessmentId,
  contactData,
  hasDeepContext = false,
}) => {
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [agendaText, setAgendaText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPrep, setCurrentPrep] = useState<PrepSession | null>(null);
  const [prepHistory, setPrepHistory] = useState<PrepSession[]>([]);
  const [companyContextId, setCompanyContextId] = useState<string | null>(null);
  const { toast } = useToast();

  // Load company context if available
  useEffect(() => {
    const loadCompanyContext = async () => {
      try {
        // Get leader_id from assessment
        const { data: assessment } = await supabase
          .from('leader_assessments')
          .select('leader_id')
          .eq('id', assessmentId)
          .single();

        if (assessment?.leader_id && contactData?.companyName) {
          const { data: context } = await supabase
            .from('company_context')
            .select('id')
            .eq('leader_id', assessment.leader_id)
            .eq('company_name', contactData.companyName)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (context) {
            setCompanyContextId(context.id);
          }
        }
      } catch (error) {
        console.error('Error loading company context:', error);
      }
    };

    loadCompanyContext();
  }, [assessmentId, contactData?.companyName]);

  // Load prep history
  useEffect(() => {
    const loadPrepHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('meeting_prep_sessions')
          .select('*')
          .eq('assessment_id', assessmentId)
          .order('generated_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        if (data && data.length > 0) {
          setPrepHistory(data as PrepSession[]);
          // Set most recent as current if no current prep
          if (!currentPrep) {
            setCurrentPrep(data[0] as PrepSession);
          }
        }
      } catch (error) {
        console.error('Error loading prep history:', error);
      }
    };

    loadPrepHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

  const handleGeneratePrep = async () => {
    if (!meetingTitle.trim() || !agendaText.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a meeting title and agenda.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-meeting-prep', {
        body: {
          assessment_id: assessmentId,
          company_context_id: companyContextId,
          meeting_title: meetingTitle,
          meeting_date: meetingDate || null,
          agenda_text: agendaText,
        },
      });

      if (error) throw error;

      if (data?.success && data?.prep_materials) {
        const newPrep: PrepSession = {
          id: data.prep_session_id,
          meeting_title: meetingTitle,
          meeting_date: meetingDate || null,
          agenda_text: agendaText,
          prep_materials: data.prep_materials,
          generated_at: new Date().toISOString(),
        };

        setCurrentPrep(newPrep);
        setPrepHistory(prev => [newPrep, ...prev]);
        
        toast({
          title: 'Prep Materials Generated!',
          description: 'Your personalized meeting prep is ready.',
        });
      } else {
        throw new Error('Failed to generate prep materials');
      }
    } catch (error: unknown) {
      console.error('Error generating prep:', error);
      toast({
        title: 'Generation Failed',
        description: (error instanceof Error ? error.message : '') || 'Failed to generate meeting prep. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = async () => {
    if (!currentPrep) return;

    try {
      // Create export data structure
      const exportData = {
        contactData,
        meetingTitle: currentPrep.meeting_title,
        meetingDate: currentPrep.meeting_date,
        prepMaterials: currentPrep.prep_materials,
      };

      await exportDiagnosticPDF(exportData, `meeting-prep-${currentPrep.meeting_title.replace(/\s+/g, '-')}.pdf`);
      
      toast({
        title: 'PDF Exported',
        description: 'Your meeting prep has been exported as PDF.',
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export PDF. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const priorityColors = {
    high: 'border-red-500 bg-red-50 dark:bg-red-950/20',
    medium: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
    low: 'border-blue-500 bg-blue-50 dark:bg-blue-950/20',
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Context Notice */}
      {!hasDeepContext && (
        <Card className="border-muted bg-muted/30">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Enhanced with Company Context</p>
              <p className="text-xs text-muted-foreground mt-1">
                Connect your company context for more personalized meeting prep materials.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate New Prep */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Generate Meeting Prep
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meeting-title">Meeting Title</Label>
            <Input
              id="meeting-title"
              placeholder="e.g., Q1 Board Meeting - AI Strategy"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting-date">Meeting Date (Optional)</Label>
            <Input
              id="meeting-date"
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agenda">Agenda</Label>
            <Textarea
              id="agenda"
              placeholder="Paste your meeting agenda here...&#10;&#10;1. Review Q1 results&#10;2. Discuss AI strategy&#10;3. Budget allocation..."
              value={agendaText}
              onChange={(e) => setAgendaText(e.target.value)}
              disabled={isGenerating}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Paste your meeting agenda. The AI will analyze it and generate personalized prep materials.
            </p>
          </div>

          <Button
            onClick={handleGeneratePrep}
            disabled={isGenerating || !meetingTitle.trim() || !agendaText.trim()}
            className="w-full gap-2"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Prep Materials...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Generate Prep Materials
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Current Prep Display */}
      {currentPrep && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{currentPrep.meeting_title}</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
            </div>
            {currentPrep.meeting_date && (
              <p className="text-sm text-muted-foreground mt-1">
                Meeting Date: {new Date(currentPrep.meeting_date).toLocaleDateString()}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Prep Sections */}
            {currentPrep.prep_materials.prep_sections && currentPrep.prep_materials.prep_sections.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Prep Sections</h3>
                {currentPrep.prep_materials.prep_sections.map((section, index) => (
                  <Card
                    key={index}
                    className={`border-l-4 ${priorityColors[section.priority] || priorityColors.medium}`}
                  >
                    <CardHeader>
                      <CardTitle className="text-base">{section.title}</CardTitle>
                      {section.diagnostic_tie && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Related to: {section.diagnostic_tie}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{section.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Talking Points */}
            {currentPrep.prep_materials.talking_points && currentPrep.prep_materials.talking_points.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Talking Points</h3>
                <ul className="space-y-2">
                  {currentPrep.prep_materials.talking_points.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Strategic Questions */}
            {currentPrep.prep_materials.strategic_questions && currentPrep.prep_materials.strategic_questions.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Strategic Questions</h3>
                <ul className="space-y-2">
                  {currentPrep.prep_materials.strategic_questions.map((question, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="font-semibold text-primary">{index + 1}.</span>
                      <span>{question}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risk Considerations */}
            {currentPrep.prep_materials.risk_considerations && currentPrep.prep_materials.risk_considerations.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Risk Considerations</h3>
                <ul className="space-y-2">
                  {currentPrep.prep_materials.risk_considerations.map((risk, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended Actions */}
            {currentPrep.prep_materials.recommended_actions && currentPrep.prep_materials.recommended_actions.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Recommended Actions</h3>
                <ul className="space-y-2">
                  {currentPrep.prep_materials.recommended_actions.map((action, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="font-semibold text-primary">{index + 1}.</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Prep History */}
      {prepHistory.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Prep Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {prepHistory.slice(1).map((prep) => (
                <Button
                  key={prep.id}
                  variant="ghost"
                  className="w-full justify-start text-left h-auto py-3"
                  onClick={() => setCurrentPrep(prep)}
                >
                  <div className="flex-1">
                    <p className="font-medium">{prep.meeting_title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(prep.generated_at).toLocaleDateString()}
                    </p>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
