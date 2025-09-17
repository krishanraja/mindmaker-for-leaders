import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssessmentCardProps {
  title: string;
  description: string;
  estimatedTime: string;
  currentStep?: number;
  totalSteps?: number;
  isActive?: boolean;
  isCompleted?: boolean;
  trackType: "LEADERSHIP" | "IMPLEMENTATION";
  onStart?: () => void;
  className?: string;
}

export function AssessmentCard({
  title,
  description,
  estimatedTime,
  currentStep,
  totalSteps,
  isActive = false,
  isCompleted = false,
  trackType,
  onStart,
  className
}: AssessmentCardProps) {
  const progress = currentStep && totalSteps ? (currentStep / totalSteps) * 100 : 0;

  return (
    <Card className={cn(
      "flex flex-col h-full transition-smooth hover:shadow-lg",
      isActive && "ring-2 ring-primary",
      className
    )}>
      <CardHeader className="min-h-[120px] flex flex-col">
        <div className="flex items-start justify-between mb-2">
          <Badge 
            variant={trackType === "LEADERSHIP" ? "default" : "secondary"}
            className="mb-2"
          >
            {trackType}
          </Badge>
          {isCompleted && (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          )}
        </div>
        <h3 className="font-heading text-xl font-semibold leading-tight">
          {title}
        </h3>
      </CardHeader>

      <CardContent className="flex-1">
        <p className="text-muted-foreground mb-4 leading-relaxed">
          {description}
        </p>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Clock className="h-4 w-4" />
          <span>{estimatedTime}</span>
        </div>

        {isActive && currentStep && totalSteps && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{currentStep} of {totalSteps}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardContent>

      <CardFooter className="mt-auto">
        <Button 
          onClick={onStart}
          className="w-full"
          variant={isActive ? "default" : "outline"}
          disabled={isCompleted}
        >
          {isCompleted ? "Completed" : isActive ? "Continue" : "Start Assessment"}
        </Button>
      </CardFooter>
    </Card>
  );
}