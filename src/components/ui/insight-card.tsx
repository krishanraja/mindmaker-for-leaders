import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';

interface InsightCardProps {
  icon: LucideIcon;
  title: string;
  preview: string;
  details?: string;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'outline';
  };
  iconClassName?: string;
  expanded?: boolean;
  onToggle?: () => void;
}

export const InsightCard = React.memo<InsightCardProps>(({ 
  icon: Icon, 
  title, 
  preview, 
  details,
  badge,
  iconClassName = "text-primary",
  expanded = false,
  onToggle
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg bg-primary/10 ${iconClassName}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{title}</h3>
              {badge && (
                <Badge variant={badge.variant || 'default'}>
                  {badge.text}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">{preview}</p>
            {details && onToggle && (
              <button
                onClick={onToggle}
                className="text-sm text-primary hover:underline"
              >
                {expanded ? 'Show less' : 'Learn more'}
              </button>
            )}
            {expanded && details && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-foreground whitespace-pre-line">{details}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

InsightCard.displayName = 'InsightCard';
