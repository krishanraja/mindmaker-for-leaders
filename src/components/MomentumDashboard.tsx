import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Users, Calendar, Award, Zap } from 'lucide-react';

interface MomentumData {
  momentum_score: number;
  momentum_tier: 'experimenting' | 'scaling' | 'institutionalizing';
  total_assessments: number;
  total_unique_users: number;
  days_between_first_last: number;
  repeat_rate_capped: number;
  team_growth_sqrt: number;
  referral_quality_score: number;
  recency_decay: number;
}

interface MomentumDashboardProps {
  companyHash: string;
}

export const MomentumDashboard: React.FC<MomentumDashboardProps> = ({ companyHash }) => {
  const [momentum, setMomentum] = useState<MomentumData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMomentum = async () => {
      try {
        const { data, error } = await supabase
          .from('adoption_momentum')
          .select('*')
          .eq('company_identifier_hash', companyHash)
          .single();

        if (error) throw error;
        setMomentum(data);
      } catch (error) {
        console.error('Error fetching momentum:', error);
      } finally {
        setLoading(false);
      }
    };

    if (companyHash) {
      fetchMomentum();
    }
  }, [companyHash]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center text-muted-foreground">Loading momentum data...</div>
        </CardContent>
      </Card>
    );
  }

  if (!momentum) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center text-muted-foreground">No momentum data available yet</div>
        </CardContent>
      </Card>
    );
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'institutionalizing':
        return 'bg-green-500';
      case 'scaling':
        return 'bg-blue-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getTierBadgeVariant = (tier: string): 'default' | 'secondary' | 'outline' => {
    switch (tier) {
      case 'institutionalizing':
        return 'default';
      case 'scaling':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Adoption Momentum
              </CardTitle>
              <CardDescription>Your organization's AI adoption trajectory</CardDescription>
            </div>
            <Badge variant={getTierBadgeVariant(momentum.momentum_tier)} className="text-lg px-4 py-1">
              {momentum.momentum_tier.charAt(0).toUpperCase() + momentum.momentum_tier.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Momentum Score</span>
              <span className="text-2xl font-bold">{momentum.momentum_score}</span>
            </div>
            <Progress value={momentum.momentum_score} className="h-3" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Users className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="text-sm text-muted-foreground">Team Engagement</div>
                <div className="text-xl font-bold">{momentum.total_unique_users}</div>
                <div className="text-xs text-muted-foreground">unique participants</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="text-sm text-muted-foreground">Total Assessments</div>
                <div className="text-xl font-bold">{momentum.total_assessments}</div>
                <div className="text-xs text-muted-foreground">completed</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="text-sm text-muted-foreground">Activity Period</div>
                <div className="text-xl font-bold">{momentum.days_between_first_last}</div>
                <div className="text-xs text-muted-foreground">days active</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Award className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="text-sm text-muted-foreground">Repeat Rate</div>
                <div className="text-xl font-bold">{momentum.repeat_rate_capped.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">assessments/month</div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Momentum Components</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Repeat Rate (40%)</span>
                <span className="font-medium">{(momentum.repeat_rate_capped * 4).toFixed(0)} pts</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Team Growth (30%)</span>
                <span className="font-medium">{(momentum.team_growth_sqrt * 6).toFixed(0)} pts</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Referral Quality (20%)</span>
                <span className="font-medium">{(momentum.referral_quality_score * 20).toFixed(0)} pts</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Recency (10%)</span>
                <span className="font-medium">{(momentum.recency_decay * 10).toFixed(0)} pts</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
