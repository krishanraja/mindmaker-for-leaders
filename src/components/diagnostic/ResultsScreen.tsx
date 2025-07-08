import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DiagnosticData, DiagnosticScores } from '../DiagnosticTool';
import { generatePersonalizedQuickWins } from '@/utils/quickWinsGenerator';
import { 
  calculateROIMetrics, 
  calculateImpactAreas, 
  getROIPersonaDescription,
  formatCurrency 
} from '@/utils/roiCalculator';
import { TrendingDown, TrendingUp, DollarSign, Clock, Users } from 'lucide-react';

interface ResultsScreenProps {
  data: DiagnosticData;
  scores: DiagnosticScores;
  onRestart: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({ 
  data, 
  scores, 
  onRestart 
}) => {
  const quickWins = generatePersonalizedQuickWins(data, scores);
  const roiMetrics = calculateROIMetrics(data, scores);
  const impactAreas = calculateImpactAreas(data, scores);
  const personaDescription = getROIPersonaDescription(scores, roiMetrics);

  return (
    <div className="min-h-screen bg-background">
      <div className="diagnostic-container py-12">
        
        {/* Header */}
        <div className="text-center space-y-6 mb-12">
          <h1 className="text-5xl md:text-7xl font-display font-black tracking-tight leading-[0.9]">
            Your <span className="text-primary font-black underline decoration-primary decoration-4 underline-offset-4">AI Mindmaker</span> Results
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-body font-light">
            {personaDescription}
          </p>
        </div>

        {/* Opportunity Cost Calculator - Main Visual */}
        <Card className="question-card text-center mb-8 border-2 border-opportunity-red/30 bg-gradient-to-br from-opportunity-red/5 to-background">
          <div className="space-y-6">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <TrendingDown className="w-8 h-8 text-opportunity-red" />
              <h2 className="text-2xl font-heading font-bold tracking-tight">
                Opportunity Cost Analysis
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-opportunity-red mb-2">
                  {formatCurrency(roiMetrics.monthlyOpportunityCost)}
                </div>
                <div className="text-sm text-muted-foreground">Monthly opportunity cost</div>
              </div>
              
              <div className="text-center">
                <div className="text-4xl font-bold text-opportunity-amber mb-2">
                  {roiMetrics.timeWastedHours}h
                </div>
                <div className="text-sm text-muted-foreground">Hours wasted weekly</div>
              </div>
              
              <div className="text-center">
                <div className="text-4xl font-bold text-success-green mb-2">
                  {formatCurrency(roiMetrics.annualImpactPotential)}
                </div>
                <div className="text-sm text-muted-foreground">Annual optimization potential</div>
              </div>
            </div>
            
            <div className="bg-muted/20 rounded-lg p-4 mt-6">
              <p className="text-lg font-medium text-opportunity-red">
                You're leaving <span className="text-2xl font-bold">{formatCurrency(roiMetrics.monthlyOpportunityCost)}/month</span> on the table
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Based on productivity gaps, decision delays, and missed AI optimization opportunities
              </p>
            </div>
          </div>
        </Card>

        {/* Impact Opportunity Areas */}
        <div className="space-y-6 mb-8">
          <h2 className="text-3xl font-heading font-bold tracking-tight text-center">
            Impact Opportunity Areas
          </h2>
          
          <div className="grid lg:grid-cols-2 gap-6">
            {impactAreas.map((area, index) => (
              <Card key={index} className="question-card hover:border-primary/50 transition-all duration-300">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-heading font-bold">{area.name}</h3>
                    <div className="text-right">
                      <div className="text-xl font-bold text-success-green">
                        {formatCurrency(area.monthlyValue)}/mo
                      </div>
                      <div className="text-xs text-muted-foreground">potential value</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-opportunity-red">Current: {area.currentWaste}</span>
                      <span className="text-sm text-success-green">Optimized: {area.potentialSavings}</span>
                    </div>
                    <div className="relative">
                      <Progress value={area.progressValue} className="h-3" />
                      <div className="absolute right-2 top-0 h-3 w-1 bg-success-green/50 rounded"></div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">{area.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Business Impact Calculator */}
        <Card className="question-card mb-8 border-2 border-success-green/30 bg-gradient-to-br from-success-green/5 to-background">
          <div className="space-y-6">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <TrendingUp className="w-8 h-8 text-success-green" />
              <h2 className="text-2xl font-heading font-bold tracking-tight text-center">
                Business Impact Calculator
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center space-y-3">
                <Clock className="w-12 h-12 text-primary mx-auto" />
                <div>
                  <div className="text-2xl font-bold text-primary">12+ hours</div>
                  <div className="text-sm text-muted-foreground">Reclaimed weekly through AI optimization</div>
                </div>
              </div>
              
              <div className="text-center space-y-3">
                <DollarSign className="w-12 h-12 text-revenue-blue mx-auto" />
                <div>
                  <div className="text-2xl font-bold text-revenue-blue">{formatCurrency(roiMetrics.annualImpactPotential)}</div>
                  <div className="text-sm text-muted-foreground">Annual value through faster decisions</div>
                </div>
              </div>
              
              <div className="text-center space-y-3">
                <Users className="w-12 h-12 text-success-green mx-auto" />
                <div>
                  <div className="text-2xl font-bold text-success-green">5x</div>
                  <div className="text-sm text-muted-foreground">Team productivity multiplier</div>
                </div>
              </div>
            </div>
            
            <div className="bg-muted/20 rounded-lg p-4 text-center">
              <p className="text-lg font-medium">
                Leaders who optimize with AI save an average of <span className="text-success-green font-bold">$47K in their first 90 days</span>
              </p>
            </div>
          </div>
        </Card>

        {/* Quick Wins with ROI */}
        <Card className="question-card mt-8 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-background">
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-heading font-bold tracking-tight">
                Your ROI-Mapped Quick Wins
              </h2>
              <p className="text-muted-foreground">
                5 AI optimizations tailored to your biggest frictions
              </p>
              <div className="inline-flex items-center space-x-2 bg-success-green/10 text-success-green px-4 py-2 rounded-lg">
                <DollarSign className="w-4 h-4" />
                <span className="font-bold">Total Value: {formatCurrency(quickWins.length * 1400)}/month</span>
              </div>
            </div>
            
            <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-4">
              {quickWins.map((win, index) => (
                <div 
                  key={index}
                  className="bg-muted/10 p-4 rounded-lg border border-success-green/20 hover:border-success-green/40 transition-all duration-300 hover:shadow-lg"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-success-green rounded-full flex items-center justify-center text-sm font-bold text-white">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm leading-relaxed">{win}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-primary/10 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Combined ROI impact: <span className="text-primary font-bold">Reclaim 15+ hours/week</span> • 
                <span className="text-success-green font-bold"> Save {formatCurrency(quickWins.length * 1400 * 12)}/year</span>
              </p>
            </div>
          </div>
        </Card>

        {/* ROI-Focused CTA Section */}
        <div className="text-center space-y-8 mt-12">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tight">
              Stop leaving <span className="text-opportunity-red">{formatCurrency(roiMetrics.monthlyOpportunityCost)}/month</span> on the table
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Book a 30-minute AI Mindmaker consultation to unlock your <span className="text-success-green font-bold">{formatCurrency(roiMetrics.annualImpactPotential)}</span> annual optimization potential through a tailored 90-day sprint.
            </p>
          </div>
          
          <div className="bg-muted/20 rounded-xl p-6 max-w-2xl mx-auto">
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div>
                <div className="text-2xl font-bold text-primary">90 days</div>
                <div className="text-xs text-muted-foreground">Implementation</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-success-green">15x ROI</div>
                <div className="text-xs text-muted-foreground">Average return</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-opportunity-amber">12+ hours</div>
                <div className="text-xs text-muted-foreground">Weekly savings</div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              className="btn-primary text-lg px-8 py-4"
              onClick={() => window.open('https://calendly.com/krish-raja/krish-raja', '_blank')}
            >
              Claim Your {formatCurrency(roiMetrics.annualImpactPotential)} Opportunity
            </Button>
            <Button variant="outline" onClick={onRestart} className="text-lg px-8 py-4">
              Retake Diagnostic
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};