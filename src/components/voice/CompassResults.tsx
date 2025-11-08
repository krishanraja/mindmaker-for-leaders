import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import { CompassResults as CompassResultsType } from '@/types/voice';

interface CompassResultsProps {
  results: CompassResultsType;
}

export const CompassResults: React.FC<CompassResultsProps> = ({ results }) => {
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Leading':
        return 'bg-[hsl(var(--tier-orchestrator))] text-white';
      case 'Advancing':
        return 'bg-[hsl(var(--tier-confident))] text-white';
      case 'Establishing':
        return 'bg-[hsl(var(--tier-aware))] text-white';
      default:
        return 'bg-[hsl(var(--tier-emerging))] text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Tier Badge */}
      <div className="text-center space-y-3">
        <Badge 
          className={`text-lg px-6 py-3 ${getTierColor(results.tier)}`}
        >
          {results.tier} Strategist
        </Badge>
        <p className="text-muted-foreground">
          {results.tierDescription}
        </p>
      </div>

      {/* Focus Areas */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Your Top 3 Focus Areas</h3>
        <div className="space-y-3">
          {results.focusAreas.map((area, index) => (
            <div key={index} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                {index + 1}
              </span>
              <p className="text-sm text-foreground">{area}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Wins */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Wins</h3>
        <div className="space-y-3">
          {results.quickWins.map((win, index) => (
            <div key={index} className="flex gap-3 items-start">
              <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{win}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Scores Radar Chart Placeholder */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Leadership Dimensions</h3>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(results.scores).map(([dimension, score]) => (
            <div key={dimension} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="capitalize text-foreground">
                  {dimension.replace(/_/g, ' ')}
                </span>
                <span className="font-medium text-primary">{score}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary"
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
