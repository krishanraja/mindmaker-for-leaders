import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp } from 'lucide-react';

interface RoadmapCardProps {
  title: string;
  description: string;
  timeline: string;
  impact: string;
  growthMetric?: string;
  basedOn?: string[];
}

export const RoadmapCard = React.memo<RoadmapCardProps>(({ 
  title, 
  description, 
  timeline,
  impact,
  growthMetric,
  basedOn
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-lg mb-2">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {timeline}
          </Badge>
          {growthMetric && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {growthMetric}
            </Badge>
          )}
        </div>
        
        <div className="pt-3 border-t border-border">
          <p className="text-sm font-medium mb-2">Expected Impact:</p>
          <p className="text-sm text-muted-foreground">{impact}</p>
        </div>
        
        {basedOn && basedOn.length > 0 && (
          <div className="pt-2">
            <p className="text-xs text-muted-foreground">
              Based on: {basedOn.join(', ')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

RoadmapCard.displayName = 'RoadmapCard';
