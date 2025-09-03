import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Target,
  Zap,
  Users,
  DollarSign,
  Calendar,
  Lightbulb
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ExecutiveInsight {
  id: string;
  type: 'quick_win' | 'strategic_opportunity' | 'risk_mitigation' | 'competitive_advantage' | 'leadership_differentiation';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  timeline: '1-2 weeks' | '1-3 months' | '3-6 months' | '6+ months';
  roi_estimate: string;
  implementation_steps: string[];
  success_metrics: string[];
}

interface LLMInsightEngineProps {
  conversationData: any;
  assessmentData: Record<string, any>;
  sessionId: string | null;
  isComplete: boolean;
}

const LLMInsightEngine: React.FC<LLMInsightEngineProps> = ({ 
  conversationData, 
  assessmentData, 
  sessionId,
  isComplete 
}) => {
  const [insights, setInsights] = useState<ExecutiveInsight[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [overallScore, setOverallScore] = useState(0);

  useEffect(() => {
    if (isComplete && sessionId && Object.keys(assessmentData).length > 5) {
      generateExecutiveInsights();
    }
  }, [isComplete, sessionId, assessmentData]);

  const generateExecutiveInsights = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-assessment-chat', {
        body: {
          message: `PERSONAL AI LEADERSHIP DEVELOPMENT ANALYSIS:

Analyze this executive's responses to generate personalized AI leadership development insights focused on HUMAN CAPABILITY ENHANCEMENT, not enterprise systems.

CONVERSATION DATA:
${JSON.stringify(conversationData, null, 2)}

ASSESSMENT DATA: 
${JSON.stringify(assessmentData, null, 2)}

Generate insights in this JSON format:
{
  "insights": [
    {
      "type": "quick_win|strategic_opportunity|risk_mitigation|leadership_differentiation",
      "title": "Clear leadership development title",
      "description": "How this develops the PERSON as an AI-forward leader",
      "impact": "high|medium|low",
      "effort": "low|medium|high",
      "timeline": "1-2 weeks|1-3 months|3-6 months|6+ months", 
      "roi_estimate": "Personal productivity/leadership impact",
      "implementation_steps": ["Personal action 1", "Personal action 2", "Personal action 3"],
      "success_metrics": ["Leadership metric 1", "Personal metric 2"]
    }
  ],
  "overall_readiness_score": 75,
  "leadership_summary": "Executive summary of their AI leadership potential and development path"
}

FOCUS ON PERSONAL AI LEADERSHIP DEVELOPMENT:
- AI-enhanced decision making and strategic thinking
- AI literacy and communication credibility  
- Personal productivity and time management with AI
- Leading teams through AI transformation
- Building AI-forward leadership presence
- Risk: Leadership credibility in AI era
- Opportunity: Becoming an AI-savvy executive who can guide others

AVOID: Enterprise infrastructure, technical implementations, IT systems

Generate 4-6 insights focused on developing THIS PERSON as an AI-forward leader.

Return ONLY the JSON, no other text.`,
          sessionId: sessionId,
          userId: null,
          context: {
            isInsightGeneration: true,
            ...conversationData
          }
        }
      });

      if (error) throw error;

      try {
        // Extract JSON from response
        const response = data.response;
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const parsedData = JSON.parse(jsonMatch[0]);
          
          if (parsedData.insights && Array.isArray(parsedData.insights)) {
            const formattedInsights = parsedData.insights.map((insight: any, index: number) => ({
              id: `llm-insight-${Date.now()}-${index}`,
              ...insight
            }));
            
            setInsights(formattedInsights);
            setOverallScore(parsedData.overall_readiness_score || 0);
          }
        } else {
          // Fallback: try to parse the entire response
          const fallbackData = JSON.parse(response);
          if (fallbackData.insights) {
            setInsights(fallbackData.insights.map((insight: any, index: number) => ({
              id: `llm-insight-${Date.now()}-${index}`,
              ...insight
            })));
            setOverallScore(fallbackData.overall_readiness_score || 0);
          }
        }
      } catch (parseError) {
        console.error('Failed to parse insight response:', parseError);
        // Fallback to basic insights if LLM parsing fails
        generateFallbackInsights();
      }

    } catch (error) {
      console.error('Error generating LLM insights:', error);
      generateFallbackInsights();
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFallbackInsights = () => {
    const fallbackInsights: ExecutiveInsight[] = [
      {
        id: 'fallback-1',
        type: 'quick_win',
        title: 'Master AI-Enhanced Communication',
        description: 'Develop your ability to articulate AI concepts and strategy to stakeholders with confidence',
        impact: 'high',
        effort: 'low',
        timeline: '1-2 weeks',
        roi_estimate: 'Increased leadership credibility and stakeholder confidence',
        implementation_steps: ['Practice AI terminology in meetings', 'Share AI insights in leadership updates', 'Ask strategic AI questions'],
        success_metrics: ['Stakeholder confidence in AI discussions', 'Quality of AI-related decisions']
      },
      {
        id: 'fallback-2',
        type: 'strategic_opportunity',
        title: 'AI-Powered Strategic Thinking',
        description: 'Use AI tools to enhance your strategic analysis and decision-making processes',
        impact: 'high',
        effort: 'medium',
        timeline: '1-3 months',
        roi_estimate: '25-40% improvement in strategic decision quality and speed',
        implementation_steps: ['Integrate AI into daily planning', 'Use AI for market analysis', 'Apply AI insights to strategy sessions'],
        success_metrics: ['Decision cycle time', 'Strategic outcome quality', 'Personal productivity gains']
      },
      {
        id: 'fallback-3',
        type: 'leadership_differentiation',
        title: 'Become the AI-Forward Leader',
        description: 'Position yourself as a leader who can guide others through AI transformation with confidence',
        impact: 'high',
        effort: 'medium',
        timeline: '3-6 months',
        roi_estimate: 'Enhanced leadership presence and team performance',
        implementation_steps: ['Develop AI leadership narrative', 'Mentor others on AI adoption', 'Lead by example in AI usage'],
        success_metrics: ['Team AI adoption rates', 'Leadership effectiveness scores', 'Innovation outcomes']
      }
    ];
    
    setInsights(fallbackInsights);
    setOverallScore(65);
  };

  const getTypeIcon = (type: ExecutiveInsight['type']) => {
    switch (type) {
      case 'quick_win':
        return <Zap className="h-5 w-5 text-blue-500" />;
      case 'strategic_opportunity':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'risk_mitigation':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'competitive_advantage':
      case 'leadership_differentiation':
        return <Target className="h-5 w-5 text-purple-500" />;
      default:
        return <Brain className="h-5 w-5" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isGenerating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 animate-pulse" />
            Generating Executive Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <div>
              <p className="font-medium">Analyzing your assessment...</p>
              <p className="text-sm text-muted-foreground">Our AI is generating personalized strategic insights</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            Complete Assessment for Insights
          </h3>
          <p className="text-sm text-muted-foreground">
            Continue through the assessment to unlock personalized strategic insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  const quickWins = insights.filter(i => i.type === 'quick_win');
  const strategicOps = insights.filter(i => i.type === 'strategic_opportunity');
  const riskMitigation = insights.filter(i => i.type === 'risk_mitigation');
  const leadershipDiff = insights.filter(i => i.type === 'competitive_advantage' || i.type === 'leadership_differentiation');

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Executive AI Readiness Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="text-3xl font-bold text-primary">{overallScore}%</div>
              <div className="text-sm text-muted-foreground">AI Readiness Score</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{quickWins.length}</div>
              <div className="text-sm text-muted-foreground">Quick Wins</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{strategicOps.length}</div>
              <div className="text-sm text-muted-foreground">Strategic Opportunities</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{leadershipDiff.length}</div>
              <div className="text-sm text-muted-foreground">Leadership Opportunities</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Wins */}
      {quickWins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Quick Wins (Start This Week)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quickWins.map((insight) => (
                <div key={insight.id} className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">{insight.title}</h4>
                    <div className="flex gap-2">
                      <Badge variant={getImpactColor(insight.impact)}>
                        {insight.impact} impact
                      </Badge>
                      <Badge className={getEffortColor(insight.effort)}>
                        {insight.effort} effort
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">{insight.description}</p>
                  <div className="grid md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="font-medium mb-1">Implementation:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {insight.implementation_steps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="font-medium mb-1">Success Metrics:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {insight.success_metrics.map((metric, idx) => (
                          <li key={idx}>{metric}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {insight.timeline}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ROI: {insight.roi_estimate}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategic Opportunities */}
      {strategicOps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Strategic Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {strategicOps.map((insight) => (
                <div key={insight.id} className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border-l-4 border-green-500">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-green-900 dark:text-green-100">{insight.title}</h4>
                    <div className="flex gap-2">
                      <Badge variant={getImpactColor(insight.impact)}>
                        {insight.impact} impact
                      </Badge>
                      <Badge className={getEffortColor(insight.effort)}>
                        {insight.effort} effort
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-3">{insight.description}</p>
                  <div className="grid md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="font-medium mb-1">Implementation:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {insight.implementation_steps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="font-medium mb-1">Success Metrics:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {insight.success_metrics.map((metric, idx) => (
                          <li key={idx}>{metric}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {insight.timeline}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ROI: {insight.roi_estimate}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Mitigation */}
      {riskMitigation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Leadership Credibility Risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {riskMitigation.map((insight) => (
                <div key={insight.id} className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border-l-4 border-orange-500">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-orange-900 dark:text-orange-100">{insight.title}</h4>
                    <div className="flex gap-2">
                      <Badge variant={getImpactColor(insight.impact)}>
                        {insight.impact} impact
                      </Badge>
                      <Badge className={getEffortColor(insight.effort)}>
                        {insight.effort} effort
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">{insight.description}</p>
                  <div className="grid md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="font-medium mb-1">Implementation:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {insight.implementation_steps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="font-medium mb-1">Success Metrics:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {insight.success_metrics.map((metric, idx) => (
                          <li key={idx}>{metric}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {insight.timeline}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ROI: {insight.roi_estimate}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leadership Differentiation */}
      {leadershipDiff.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              Leadership Differentiation Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leadershipDiff.map((insight) => (
                <div key={insight.id} className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border-l-4 border-purple-500">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100">{insight.title}</h4>
                    <div className="flex gap-2">
                      <Badge variant={getImpactColor(insight.impact)}>
                        {insight.impact} impact
                      </Badge>
                      <Badge className={getEffortColor(insight.effort)}>
                        {insight.effort} effort
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">{insight.description}</p>
                  <div className="grid md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="font-medium mb-1">Implementation:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {insight.implementation_steps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="font-medium mb-1">Success Metrics:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {insight.success_metrics.map((metric, idx) => (
                          <li key={idx}>{metric}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {insight.timeline}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ROI: {insight.roi_estimate}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LLMInsightEngine;