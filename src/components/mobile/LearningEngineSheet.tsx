import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Mic, TrendingUp, Target } from 'lucide-react';
import { DailyProvocation } from '@/components/dashboard/DailyProvocation';
import { PatternInsight } from '@/components/dashboard/PatternInsight';
import { motion } from 'framer-motion';

interface DailyPrompt {
  id: string;
  question: string;
  category: string;
}

interface DimensionScore {
  score_numeric: number;
  dimension_key: string;
  dimension_tier: string;
}

interface BaselineData {
  dimensionScores?: DimensionScore[];
  benchmarkTier?: string;
}

interface LearningEngineSheetProps {
  dailyPrompt: DailyPrompt | null;
  baselineData?: BaselineData;
  onNavigate: (path: string) => void;
}

export const LearningEngineSheet: React.FC<LearningEngineSheetProps> = ({
  dailyPrompt,
  baselineData,
  onNavigate,
}) => {
  // Calculate capability roadmap from baseline
  const capabilityRoadmap = React.useMemo(() => {
    if (!baselineData?.dimensionScores) return null;

    const dimensions = baselineData.dimensionScores;
    const currentTier = baselineData.benchmarkTier || 'Emerging';
    
    // Find dimensions that need improvement
    const needsImprovement = dimensions
      .filter((dim: DimensionScore) => dim.score_numeric < 70)
      .slice(0, 3)
      .map((dim: DimensionScore) => ({
        name: dim.dimension_key.replace('_', ' '),
        currentScore: Math.round(dim.score_numeric),
        targetScore: 70,
        tier: dim.dimension_tier,
      }));

    return {
      currentTier,
      nextTier: currentTier === 'Emerging' ? 'Establishing' : currentTier === 'Establishing' ? 'Advancing' : 'Leading',
      improvements: needsImprovement,
    };
  }, [baselineData]);

  return (
    <div className="px-6 py-4 space-y-4">
      {/* Daily Provocation */}
      {dailyPrompt ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DailyProvocation
            prompt={dailyPrompt}
            onResponseSubmitted={() => {
              // Reload prompt
              window.location.reload();
            }}
          />
        </motion.div>
      ) : (
        <Card className="border rounded-2xl">
          <CardContent className="p-6 text-center">
            <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              No daily provocation available. Check back tomorrow!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pattern Insight */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <PatternInsight />
      </motion.div>

      {/* Capability Roadmap */}
      {capabilityRoadmap && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <Card className="border rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Capability Roadmap</h3>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Current Tier</span>
                  <Badge variant="outline">{capabilityRoadmap.currentTier}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Next Milestone</span>
                  <Badge>{capabilityRoadmap.nextTier}</Badge>
                </div>
              </div>

              {capabilityRoadmap.improvements.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Focus Areas to Reach {capabilityRoadmap.nextTier}:
                  </p>
                  {capabilityRoadmap.improvements.map((improvement, index: number) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground capitalize">
                          {improvement.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {improvement.currentScore} → {improvement.targetScore}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${improvement.currentScore}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};
