import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Brain, 
  Users, 
  BookOpen, 
  Target,
  CheckCircle,
  Circle,
  ArrowRight
} from 'lucide-react';
import { AssessmentTopic } from '@/hooks/useConversationFlow';

interface ConversationFlowProps {
  topics: AssessmentTopic[];
  currentTopic: string | null;
  overallProgress: number;
  onTopicSelect: (topicId: string) => void;
  onSuggestedQuestion: (question: string) => void;
  suggestedQuestions: string[];
}

const ConversationFlow: React.FC<ConversationFlowProps> = ({
  topics,
  currentTopic,
  overallProgress,
  onTopicSelect,
  onSuggestedQuestion,
  suggestedQuestions
}) => {
  const getTopicIcon = (topicId: string) => {
    switch (topicId) {
      case 'time_allocation':
        return <Clock className="h-4 w-4" />;
      case 'ai_experience':
        return <Brain className="h-4 w-4" />;
      case 'communication_stakeholders':
        return <Users className="h-4 w-4" />;
      case 'learning_development':
        return <BookOpen className="h-4 w-4" />;
      case 'decision_making':
        return <Target className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const completedCount = topics.filter(topic => topic.completed).length;
  const nextTopic = topics.find(topic => !topic.completed);

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assessment Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span>Overall Progress</span>
            <span className="text-muted-foreground">
              {completedCount}/{topics.length} areas explored
            </span>
          </div>
          <Progress value={overallProgress} className="w-full" />
          
          {nextTopic && (
            <div className="p-3 bg-primary/5 rounded-lg border-l-4 border-primary">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-sm">Next: {nextTopic.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {nextTopic.description}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => onTopicSelect(nextTopic.id)}
                  className="ml-2"
                >
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Topic Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assessment Areas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className={`p-3 rounded-lg border transition-colors ${
                  topic.id === currentTopic
                    ? 'bg-primary/10 border-primary'
                    : topic.completed
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200'
                    : 'bg-muted border-border hover:bg-muted/80'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5">
                      {topic.completed ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        getTopicIcon(topic.id)
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{topic.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {topic.description}
                      </p>
                      {topic.insights.length > 0 && (
                        <div className="mt-2 flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {topic.insights.length} insights
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  {!topic.completed && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onTopicSelect(topic.id)}
                      className="text-xs"
                    >
                      Explore
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Suggested Questions */}
      {suggestedQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Suggested Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suggestedQuestions.slice(0, 4).map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => onSuggestedQuestion(question)}
                  className="w-full text-left justify-start h-auto p-3 text-wrap"
                >
                  <span className="text-xs leading-relaxed">{question}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion Status */}
      {completedCount === topics.length && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
              Assessment Complete!
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              You've explored all key areas. Review your insights and next steps.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConversationFlow;