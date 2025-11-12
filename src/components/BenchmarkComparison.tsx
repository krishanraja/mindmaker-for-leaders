import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Target, Award } from 'lucide-react';

interface BenchmarkData {
  avg_readiness_score: number;
  median_readiness_score: number;
  tier_emerging_pct: number;
  tier_establishing_pct: number;
  tier_advancing_pct: number;
  tier_leading_pct: number;
  industry_benchmarks: any;
  company_size_benchmarks: any;
  role_benchmarks: any;
}

interface BenchmarkComparisonProps {
  userScore: number;
  userTier: string;
  industry?: string;
  companySize?: string;
  role?: string;
}

export const BenchmarkComparison: React.FC<BenchmarkComparisonProps> = ({
  userScore,
  userTier,
  industry,
  companySize,
  role,
}) => {
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBenchmark = async () => {
      try {
        const { data, error } = await supabase
          .from('ai_leadership_index_snapshots')
          .select('*')
          .order('published_at', { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;
        setBenchmark(data);
      } catch (error) {
        console.error('Error fetching benchmark:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBenchmark();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center text-muted-foreground">Loading benchmarks...</div>
        </CardContent>
      </Card>
    );
  }

  if (!benchmark) {
    return null;
  }

  const percentile = ((userScore - benchmark.avg_readiness_score) / benchmark.avg_readiness_score) * 100;
  const isAboveAverage = userScore > benchmark.avg_readiness_score;

  const getIndustryBenchmark = () => {
    if (!industry || !benchmark.industry_benchmarks) return null;
    return benchmark.industry_benchmarks[industry];
  };

  const getCompanySizeBenchmark = () => {
    if (!companySize || !benchmark.company_size_benchmarks) return null;
    return benchmark.company_size_benchmarks[companySize];
  };

  const getRoleBenchmark = () => {
    if (!role || !benchmark.role_benchmarks) return null;
    return benchmark.role_benchmarks[role];
  };

  const industryBench = getIndustryBenchmark();
  const sizeBench = getCompanySizeBenchmark();
  const roleBench = getRoleBenchmark();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            How You Compare
          </CardTitle>
          <CardDescription>Your score vs. industry benchmarks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-6 rounded-lg bg-primary/5 border-2 border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-muted-foreground">Your Score</div>
                <div className="text-4xl font-bold">{userScore}</div>
              </div>
              <Badge variant={isAboveAverage ? 'default' : 'secondary'} className="text-lg px-4 py-1">
                {isAboveAverage ? '↑' : '↓'} {Math.abs(percentile).toFixed(0)}%
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Global Average</span>
                <span className="font-medium">{benchmark.avg_readiness_score.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Global Median</span>
                <span className="font-medium">{benchmark.median_readiness_score.toFixed(0)}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Award className="h-4 w-4" />
              Distribution by Tier
            </h4>
            <div className="space-y-3">
              {[
                { label: 'Leading', pct: benchmark.tier_leading_pct, color: 'bg-green-500' },
                { label: 'Advancing', pct: benchmark.tier_advancing_pct, color: 'bg-blue-500' },
                { label: 'Establishing', pct: benchmark.tier_establishing_pct, color: 'bg-yellow-500' },
                { label: 'Emerging', pct: benchmark.tier_emerging_pct, color: 'bg-orange-500' },
              ].map(({ label, pct, color }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium flex items-center gap-2">
                      {label}
                      {userTier.toLowerCase() === label.toLowerCase() && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
                    </span>
                    <span className="text-sm text-muted-foreground">{pct?.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(industryBench || sizeBench || roleBench) && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Segment Comparisons
              </h4>
              <div className="space-y-2">
                {industryBench && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{industry} Average</span>
                    <span className="font-medium">{industryBench.avg_score?.toFixed(0)}</span>
                  </div>
                )}
                {sizeBench && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{companySize} Companies</span>
                    <span className="font-medium">{sizeBench.avg_score?.toFixed(0)}</span>
                  </div>
                )}
                {roleBench && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{role}s</span>
                    <span className="font-medium">{roleBench.avg_score?.toFixed(0)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
