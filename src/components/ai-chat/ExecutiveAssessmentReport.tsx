import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  DollarSign, 
  Clock, 
  Users, 
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Briefcase,
  Shield,
  Download
} from 'lucide-react';
import { buildProposalPdf } from '@/lib/pdf/buildProposalPdf';

interface ExecutiveInsight {
  id: string;
  type: 'quick_win' | 'strategic_opportunity' | 'risk_mitigation' | 'competitive_advantage';
  title: string;
  description: string;
  businessImpact: string;
  timeframe: string;
  roiEstimate?: string;
  priority: 'critical' | 'high' | 'medium';
  actionSteps: string[];
}

interface ReadinessMatrix {
  business: number;
  technical: number;
  organizational: number;
  strategic: number;
}

interface AssessmentData {
  executiveSummary: string;
  overallScore: number;
  readinessMatrix: ReadinessMatrix;
  industryBenchmark: number;
  competitivePosition: 'leader' | 'advanced' | 'developing' | 'lagging';
}

interface ExecutiveAssessmentReportProps {
  assessmentData: AssessmentData;
  insights: ExecutiveInsight[];
  companyName?: string;
  executiveName?: string;
}

const ExecutiveAssessmentReport: React.FC<ExecutiveAssessmentReportProps> = ({
  assessmentData,
  insights,
  companyName = "Your Organization",
  executiveName = "Executive"
}) => {
  const handleDownloadPDF = async () => {
    try {
      // Set window globals for inference
      (window as any).__HEADER_BRAND__ = "AI Mindmaker";
      (window as any).__PAGE_H1__ = "AI Assessment";
      (window as any).__ROUTE_NAME__ = "ai-assessment";
      
      const quickWins = insights.filter(i => i.type === 'quick_win');
      const strategic = insights.filter(i => i.type === 'strategic_opportunity');
      const risks = insights.filter(i => i.type === 'risk_mitigation');
      const competitive = insights.filter(i => i.type === 'competitive_advantage');

      await buildProposalPdf({
        businessLogo: "/lovable-uploads/0eb86765-1d7a-4d88-aa3f-c4524638c942.png", // AI Mindmaker logo
        context: {
          businessName: "AI Mindmaker",
          toolName: "AI Readiness Assessment",
          audience: companyName
        },
        sections: [
          {
            kind: "exec",
            title: "Executive Summary",
            problem: `${companyName} is positioned as ${assessmentData.competitivePosition} in AI readiness with an overall score of ${assessmentData.overallScore}/100.`,
            solution: assessmentData.executiveSummary,
            roi: `Estimated efficiency gains of 15-40% through strategic AI implementation.`,
            kpis: [
              { label: "Overall Readiness", value: `${assessmentData.overallScore}/100` },
              { label: "Industry Position", value: assessmentData.competitivePosition },
              { label: "Quick Wins Available", value: `${quickWins.length}` },
              { label: "ROI Potential", value: "15-40%" }
            ]
          },
          {
            kind: "analysis",
            title: "AI Readiness Matrix Analysis",
            narrative: `Detailed breakdown of ${companyName}'s AI readiness across four key dimensions:`,
            table: {
              columns: ["Dimension", "Score", "Status", "Priority Action"],
              rows: Object.entries(assessmentData.readinessMatrix).map(([dim, score]) => [
                dim.charAt(0).toUpperCase() + dim.slice(1).replace('_', ' '),
                `${score}%`,
                score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Developing' : 'Needs Attention',
                score < 60 ? 'Immediate focus required' : 'Continue optimization'
              ])
            }
          },
          {
            kind: "plan",
            title: "Strategic Implementation Roadmap",
            priorities: [
              ...quickWins.map(i => ({ level: "HIGH" as const, item: i.title })),
              ...strategic.slice(0, 3).map(i => ({ level: "MEDIUM" as const, item: i.title })),
              ...risks.slice(0, 2).map(i => ({ level: "HIGH" as const, item: i.title }))
            ],
            timeline: [
              "Phase 1 (1-4 weeks): Execute quick wins for immediate impact",
              "Phase 2 (1-6 months): Implement strategic opportunities",
              "Phase 3 (6-12 months): Build competitive advantages",
              "Ongoing: Monitor and optimize AI implementations"
            ],
            nextSteps: [
              "Review and approve recommended quick wins",
              "Allocate resources for priority initiatives",
              "Establish AI governance framework",
              "Schedule quarterly progress reviews"
            ]
          }
        ]
      });
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("PDF generation is temporarily unavailable. Please try refreshing the page and trying again.");
    }
  };
  const getCompetitiveColor = (position: string) => {
    switch (position) {
      case 'leader': return 'text-green-600 bg-green-50 border-green-200';
      case 'advanced': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'developing': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'lagging': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'quick_win': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'strategic_opportunity': return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case 'risk_mitigation': return <Shield className="h-5 w-5 text-amber-600" />;
      case 'competitive_advantage': return <Target className="h-5 w-5 text-purple-600" />;
      default: return <Brain className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-8 bg-background">
      {/* Executive Summary Header */}
      <Card className="p-8 text-center rounded-3xl bg-surface shadow-purple hover-lift border-0" style={{ background: 'var(--gradient-primary)' }}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-display text-primary-foreground">
                AI Readiness Assessment
              </CardTitle>
              <p className="text-lg text-primary-foreground/80 mt-1">
                {companyName} • Executive Summary for {executiveName}
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-primary-foreground">{assessmentData.overallScore}/100</div>
              <div className="text-sm text-primary-foreground/80">Overall Readiness Score</div>
            </div>
          </div>
          <div className="mt-6">
            <Button 
              onClick={handleDownloadPDF}
              data-pdf-button
              className="text-primary-foreground px-8 py-6 rounded-2xl shadow-purple hover-scale"
              style={{ background: 'var(--gradient-accent)' }}
            >
              <Download className="h-5 w-5 mr-2" />
              Download Executive Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-purple"
                     style={{ background: 'var(--gradient-primary)' }}>
                  <BarChart3 className="h-8 w-8 text-primary-foreground" />
                </div>
                <span className="font-heading text-primary-foreground">Industry Position</span>
              </div>
              <span className="px-2 py-1 rounded-lg text-primary-foreground" style={{ background: 'hsl(var(--success))' }}>
                {assessmentData.competitivePosition}
              </span>
              <p className="text-sm text-primary-foreground/80">
                vs. {assessmentData.industryBenchmark}% industry average
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-purple"
                     style={{ background: 'var(--gradient-primary)' }}>
                  <CheckCircle className="h-8 w-8 text-primary-foreground" />
                </div>
                <span className="font-heading text-primary-foreground">Quick Wins</span>
              </div>
              <div className="text-2xl font-bold text-primary-foreground">
                {insights.filter(i => i.type === 'quick_win').length}
              </div>
              <p className="text-sm text-primary-foreground/80">
                Immediate opportunities identified
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-purple"
                     style={{ background: 'var(--gradient-primary)' }}>
                  <DollarSign className="h-8 w-8 text-primary-foreground" />
                </div>
                <span className="font-heading text-primary-foreground">ROI Potential</span>
              </div>
              <div className="text-2xl font-bold text-primary-foreground">15-40%</div>
              <p className="text-sm text-primary-foreground/80">
                Estimated efficiency gains
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Executive Summary */}
      <Card className="p-8 text-center rounded-3xl bg-surface shadow-sm hover-lift">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-purple"
                 style={{ background: 'var(--gradient-primary)' }}>
              <Briefcase className="h-8 w-8 text-primary-foreground" />
            </div>
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg leading-relaxed text-foreground font-body">
            {assessmentData.executiveSummary}
          </p>
        </CardContent>
      </Card>

      {/* Readiness Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            AI Readiness Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(assessmentData.readinessMatrix).map(([dimension, score]) => (
              <div key={dimension} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{dimension.replace('_', ' ')} Readiness</span>
                  <span className="text-lg font-bold text-primary">{score}%</span>
                </div>
                <Progress value={score} className="h-3" />
                <div className="text-sm text-muted-foreground">
                  {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Developing' : 'Needs Attention'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strategic Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Wins */}
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Immediate Quick Wins (1-4 weeks)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.filter(i => i.type === 'quick_win').slice(0, 3).map((insight) => (
              <div key={insight.id} className="p-4 bg-white rounded-lg border border-green-200">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-green-900">{insight.title}</h4>
                  <Badge variant={getPriorityColor(insight.priority)} className="ml-2">
                    {insight.priority}
                  </Badge>
                </div>
                <p className="text-sm text-green-700 mb-3">{insight.description}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-green-800">Impact:</span>
                    <p className="text-green-700">{insight.businessImpact}</p>
                  </div>
                  <div>
                    <span className="font-medium text-green-800">Timeline:</span>
                    <p className="text-green-700">{insight.timeframe}</p>
                  </div>
                </div>
                {insight.roiEstimate && (
                  <div className="mt-2 text-sm">
                    <span className="font-medium text-green-800">ROI:</span>
                    <span className="text-green-700 ml-1">{insight.roiEstimate}</span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Strategic Opportunities */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <TrendingUp className="h-5 w-5" />
              Strategic Opportunities (3-12 months)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.filter(i => i.type === 'strategic_opportunity').slice(0, 3).map((insight) => (
              <div key={insight.id} className="p-4 bg-white rounded-lg border border-blue-200">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-blue-900">{insight.title}</h4>
                  <Badge variant={getPriorityColor(insight.priority)} className="ml-2">
                    {insight.priority}
                  </Badge>
                </div>
                <p className="text-sm text-blue-700 mb-3">{insight.description}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-blue-800">Impact:</span>
                    <p className="text-blue-700">{insight.businessImpact}</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Timeline:</span>
                    <p className="text-blue-700">{insight.timeframe}</p>
                  </div>
                </div>
                {insight.roiEstimate && (
                  <div className="mt-2 text-sm">
                    <span className="font-medium text-blue-800">ROI:</span>
                    <span className="text-blue-700 ml-1">{insight.roiEstimate}</span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Risk Mitigation & Competitive Advantage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Mitigation */}
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <Shield className="h-5 w-5" />
              Risk Mitigation Priorities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.filter(i => i.type === 'risk_mitigation').slice(0, 2).map((insight) => (
              <div key={insight.id} className="p-4 bg-white rounded-lg border border-amber-200">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-amber-900">{insight.title}</h4>
                  <Badge variant={getPriorityColor(insight.priority)} className="ml-2">
                    {insight.priority}
                  </Badge>
                </div>
                <p className="text-sm text-amber-700 mb-3">{insight.description}</p>
                <div className="text-sm">
                  <span className="font-medium text-amber-800">Mitigation Strategy:</span>
                  <p className="text-amber-700">{insight.businessImpact}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Competitive Advantage */}
        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <Target className="h-5 w-5" />
              Competitive Advantage Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.filter(i => i.type === 'competitive_advantage').slice(0, 2).map((insight) => (
              <div key={insight.id} className="p-4 bg-white rounded-lg border border-purple-200">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-purple-900">{insight.title}</h4>
                  <Badge variant={getPriorityColor(insight.priority)} className="ml-2">
                    {insight.priority}
                  </Badge>
                </div>
                <p className="text-sm text-purple-700 mb-3">{insight.description}</p>
                <div className="text-sm">
                  <span className="font-medium text-purple-800">Strategic Value:</span>
                  <p className="text-purple-700">{insight.businessImpact}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Implementation Roadmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Recommended Implementation Roadmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {['immediate', 'short-term', 'medium-term'].map((phase, index) => {
              const phaseInsights = insights.filter(i => {
                if (phase === 'immediate') return i.type === 'quick_win';
                if (phase === 'short-term') return i.type === 'strategic_opportunity' && i.priority === 'high';
                return i.type === 'competitive_advantage' || (i.type === 'strategic_opportunity' && i.priority !== 'high');
              });

              return (
                <div key={phase} className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold capitalize">
                        {phase} Phase ({phase === 'immediate' ? '1-4 weeks' : phase === 'short-term' ? '1-6 months' : '6-12 months'})
                      </h4>
                    </div>
                  </div>
                  <div className="ml-11 space-y-2">
                    {phaseInsights.slice(0, 3).map((insight) => (
                      <div key={insight.id} className="flex items-center gap-2 text-sm">
                        {getTypeIcon(insight.type)}
                        <span>{insight.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExecutiveAssessmentReport;