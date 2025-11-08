import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CompassResults } from './CompassResults';
import { RoiEstimate } from '@/types/voice';
import { Award, TrendingUp, CheckCircle2 } from 'lucide-react';

interface VoiceSummaryProps {
  compassResults: any;
  roiEstimate: RoiEstimate | null;
  onUnlock: () => void;
}

export const VoiceSummary: React.FC<VoiceSummaryProps> = ({
  compassResults,
  roiEstimate,
  onUnlock
}) => {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Your AI Leadership Assessment
        </h1>
        <p className="text-muted-foreground">
          Completed in under 2 minutes
        </p>
      </div>

      {/* Leadership Profile */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Award className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold">Your AI Leadership Profile</h2>
        </div>
        <CompassResults results={compassResults} />
      </section>

      {/* Business Case */}
      {roiEstimate && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold">Business Case Snapshot</h2>
          </div>
          
          <Card className="p-6 space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">
                ${roiEstimate.conservativeValue.monthly.toLocaleString()} - ${roiEstimate.likelyValue.monthly.toLocaleString()}/month
              </p>
              <p className="text-muted-foreground mt-1">
                Conservative to likely potential value
              </p>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">90-Day Forecast</h4>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: '30 days', value: roiEstimate.forecast.day30 },
                  { label: '60 days', value: roiEstimate.forecast.day60 },
                  { label: '90 days', value: roiEstimate.forecast.day90 }
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="text-lg font-semibold">${item.value.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Next Steps */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold">Next Steps</h2>
        </div>
        
        <Card className="p-6">
          <ol className="space-y-3">
            {compassResults.quickWins.map((win: string, index: number) => (
              <li key={index} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <p className="text-sm text-foreground">{win}</p>
              </li>
            ))}
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                {compassResults.quickWins.length + 1}
              </span>
              <p className="text-sm text-foreground">
                This quarter: Pilot one AI workflow automation
              </p>
            </li>
          </ol>
        </Card>
      </section>

      {/* Unlock CTA */}
      <Card className="p-8 text-center space-y-4 bg-gradient-to-br from-primary/5 to-primary/10">
        <h3 className="text-xl font-semibold">Unlock Advanced Toolkit</h3>
        <p className="text-muted-foreground">
          Get your editable 90-Day Roadmap, Executive Summary PDF, and priority calendar booking
        </p>
        <Button onClick={onUnlock} size="lg" className="w-full sm:w-auto">
          Unlock Editable Plan & Export →
        </Button>
        <p className="text-sm text-muted-foreground">
          Or continue to explore free tools below
        </p>
      </Card>
    </div>
  );
};
