import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Shield
} from 'lucide-react';

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
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                AI Readiness Assessment
              </CardTitle>
              <p className="text-lg text-muted-foreground mt-1">
                {companyName} • Executive Summary for {executiveName}
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-primary">{assessmentData.overallScore}/100</div>
              <div className="text-sm text-muted-foreground">Overall Readiness Score</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <span className="font-semibold">Industry Position</span>
              </div>
              <div className={`inline-flex px-3 py-1 rounded-lg border font-medium capitalize ${getCompetitiveColor(assessmentData.competitivePosition)}`}>
                {assessmentData.competitivePosition}
              </div>
              <p className="text-sm text-muted-foreground">
                vs. {assessmentData.industryBenchmark}% industry average
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold">Quick Wins</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {insights.filter(i => i.type === 'quick_win').length}
              </div>
              <p className="text-sm text-muted-foreground">
                Immediate opportunities identified
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="font-semibold">ROI Potential</span>
              </div>
              <div className="text-2xl font-bold text-primary">15-40%</div>
              <p className="text-sm text-muted-foreground">
                Estimated efficiency gains
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg leading-relaxed text-foreground">
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