import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Target } from 'lucide-react';

interface AssessmentProgressProps {
  currentQuestion: number;
  totalQuestions: number;
  phase: string;
  completedAnswers: number;
  estimatedTimeRemaining: number;
}

const AssessmentProgress: React.FC<AssessmentProgressProps> = ({
  currentQuestion,
  totalQuestions,
  phase,
  completedAnswers,
  estimatedTimeRemaining
}) => {
  const progressPercentage = (currentQuestion / totalQuestions) * 100;
  const isComplete = currentQuestion >= totalQuestions;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Assessment Progress
          </span>
          <Badge variant={isComplete ? "default" : "secondary"}>
            {phase}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Question {Math.min(currentQuestion, totalQuestions)} of {totalQuestions}</span>
            <span>{Math.round(progressPercentage)}% complete</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>{completedAnswers} answered</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span>~{estimatedTimeRemaining} min left</span>
          </div>
        </div>

        {isComplete && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <CheckCircle className="h-4 w-4" />
              Assessment Complete!
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AssessmentProgress;