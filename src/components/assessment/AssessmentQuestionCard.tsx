import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Brain } from 'lucide-react';

interface QuestionData {
  id: number;
  question: string;
  options: string[];
  phase: string;
}

interface AssessmentQuestionCardProps {
  currentQuestion: QuestionData;
  totalQuestions: number;
  completedAnswers: number;
  isProcessingAnswer: boolean;
  isComplete: boolean;
  onOptionSelect: (option: string) => void;
}

export const AssessmentQuestionCard: React.FC<AssessmentQuestionCardProps> = ({
  currentQuestion,
  totalQuestions,
  completedAnswers,
  isProcessingAnswer,
  isComplete,
  onOptionSelect,
}) => {
  return (
    <Card className="shadow-sm border rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden">
      <CardContent className="p-3 sm:p-4 flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="mb-2 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm sm:text-base font-semibold text-foreground leading-tight">
              Question {currentQuestion.id} of {totalQuestions}
            </h3>
            {completedAnswers > 0 && (
              <span className="text-[10px] text-primary flex items-center gap-1">
                <Brain className="h-3 w-3 animate-pulse" />
                <span className="hidden sm:inline">Personalizing...</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {currentQuestion.question}
          </p>
        </div>

        {/* Answer options with internal scroll if needed */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
          <h4 className="font-medium text-foreground mb-1 text-xs shrink-0">
            Select your answer:
          </h4>
          {isProcessingAnswer && currentQuestion.id === totalQuestions ? (
            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
              <div className="h-4 w-4 mr-2 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="flex items-center gap-2">
                Processing your responses...
                <Brain className="h-4 w-4 text-primary animate-pulse" />
              </span>
            </div>
          ) : (
            currentQuestion.options.map((option, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full h-auto text-left justify-start hover:bg-primary/10 transition-colors rounded-xl p-2.5 sm:p-3 min-h-[42px] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => onOptionSelect(option)}
                aria-label={`Select option: ${option}`}
                disabled={isProcessingAnswer || isComplete || (currentQuestion.id === totalQuestions && completedAnswers >= totalQuestions)}
              >
                <ArrowRight className="h-3.5 w-3.5 mr-2 flex-shrink-0 text-primary" />
                <span className="text-xs sm:text-sm text-foreground leading-relaxed text-left">{option}</span>
              </Button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
