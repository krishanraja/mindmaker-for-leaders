import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Target,
  Zap,
  Users
} from 'lucide-react';

interface Insight {
  id: string;
  type: 'opportunity' | 'risk' | 'quick_win' | 'strategic';
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  actionable: boolean;
}

interface AssessmentProgress {
  overallScore: number;
  topicScores: Record<string, number>;
  completedTopics: number;
  totalTopics: number;
  engagementLevel: 'high' | 'medium' | 'low';
}

interface InsightEngineProps {
  insights: Insight[];
  progress: AssessmentProgress;
}

const InsightEngine: React.FC<InsightEngineProps> = ({ insights, progress }) => {
  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'opportunity':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'risk':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'quick_win':
        return <Zap className="h-4 w-4 text-blue-500" />;
      case 'strategic':
        return <Target className="h-4 w-4 text-purple-500" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: Insight['priority']) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const groupedInsights = insights.reduce((acc, insight) => {
    if (!acc[insight.type]) {
      acc[insight.type] = [];
    }
    acc[insight.type].push(insight);
    return acc;
  }, {} as Record<string, Insight[]>);

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Assessment Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">
              {progress.completedTopics}/{progress.totalTopics} topics completed
            </span>
          </div>
          
          <Progress 
            value={(progress.completedTopics / progress.totalTopics) * 100} 
            className="w-full"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{progress.overallScore}%</div>
              <div className="text-xs text-muted-foreground">AI Readiness</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">{insights.filter(i => i.type === 'quick_win').length}</div>
              <div className="text-xs text-muted-foreground">Quick Wins</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{insights.filter(i => i.priority === 'high').length}</div>
              <div className="text-xs text-muted-foreground">Priority Items</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Wins Section */}
      {groupedInsights.quick_win && groupedInsights.quick_win.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Quick Wins (Implement This Week)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {groupedInsights.quick_win.map((insight) => (
                <div key={insight.id} className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">{insight.title}</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">{insight.content}</p>
                    </div>
                    <Badge variant={getPriorityColor(insight.priority)} className="ml-2">
                      {insight.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategic Opportunities */}
      {groupedInsights.opportunity && groupedInsights.opportunity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Strategic Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {groupedInsights.opportunity.map((insight) => (
                <div key={insight.id} className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border-l-4 border-green-500">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-green-900 dark:text-green-100">{insight.title}</h4>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">{insight.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {insight.category}
                        </Badge>
                        {insight.actionable && (
                          <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Actionable
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge variant={getPriorityColor(insight.priority)} className="ml-2">
                      {insight.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Areas */}
      {groupedInsights.risk && groupedInsights.risk.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Areas Requiring Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {groupedInsights.risk.map((insight) => (
                <div key={insight.id} className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border-l-4 border-yellow-500">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-yellow-900 dark:text-yellow-100">{insight.title}</h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">{insight.content}</p>
                    </div>
                    <Badge variant={getPriorityColor(insight.priority)} className="ml-2">
                      {insight.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategic Recommendations */}
      {groupedInsights.strategic && groupedInsights.strategic.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              Strategic Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {groupedInsights.strategic.map((insight) => (
                <div key={insight.id} className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border-l-4 border-purple-500">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-purple-900 dark:text-purple-100">{insight.title}</h4>
                      <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">{insight.content}</p>
                    </div>
                    <Badge variant={getPriorityColor(insight.priority)} className="ml-2">
                      {insight.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {insights.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Building Your Insights
            </h3>
            <p className="text-sm text-muted-foreground">
              Continue chatting to generate personalized insights and recommendations.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InsightEngine;