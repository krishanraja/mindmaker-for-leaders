import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LucideIcon } from 'lucide-react';

interface DimensionCardProps {
  icon: LucideIcon;
  title: string;
  score: number;
  maxScore: number;
  insight: string;
  iconClassName?: string;
}

export const DimensionCard = React.memo<DimensionCardProps>(({ 
  icon: Icon, 
  title, 
  score, 
  maxScore,
  insight,
  iconClassName = "text-primary"
}) => {
  const percentage = (score / maxScore) * 100;
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-lg bg-primary/10 ${iconClassName}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-medium text-sm">{title}</h3>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold">{score}</span>
                <span className="text-sm text-muted-foreground">/ {maxScore}</span>
              </div>
            </div>
            <Progress value={percentage} className="h-2" />
            <p className="text-xs text-muted-foreground">{insight}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

DimensionCard.displayName = 'DimensionCard';
