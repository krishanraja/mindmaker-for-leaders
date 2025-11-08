import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { VoiceCapture } from './VoiceCapture';
import { RoiEstimate, RoiInputs } from '@/types/voice';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Edit2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RoiModuleProps {
  sessionId: string;
  onComplete: (estimate: RoiEstimate) => void;
  onGate: () => void;
}

export const RoiModule: React.FC<RoiModuleProps> = ({
  sessionId,
  onComplete,
  onGate
}) => {
  const { toast } = useToast();
  const [transcript, setTranscript] = useState('');
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimate, setEstimate] = useState<RoiEstimate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedInputs, setEditedInputs] = useState<RoiInputs | null>(null);
  const [useConservative, setUseConservative] = useState(true);

  const handleTranscriptReady = (text: string) => {
    setTranscript(text);
  };

  const handleEstimate = async () => {
    if (!transcript) {
      toast({
        title: 'Please record your answer',
        description: 'Describe the process you want to optimize.',
        variant: 'destructive'
      });
      return;
    }

    setIsEstimating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('roi-estimate', {
        body: { sessionId, roiTranscript: transcript, manualOverrides: editedInputs }
      });

      if (error) throw error;

      const results: RoiEstimate = data;
      setEstimate(results);
      setEditedInputs(results.inputs);
      
      if (results.needsClarification) {
        toast({
          title: 'Need more information',
          description: results.clarificationQuestion,
        });
      } else {
        onComplete(results);
      }
    } catch (error) {
      console.error('Error estimating ROI:', error);
      toast({
        title: 'Estimation failed',
        description: 'Failed to calculate ROI. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsEstimating(false);
    }
  };

  const handleRecalculate = async () => {
    if (!editedInputs) return;
    
    setIsEstimating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('roi-estimate', {
        body: { sessionId, roiTranscript: transcript, manualOverrides: editedInputs }
      });

      if (error) throw error;

      const results: RoiEstimate = data;
      setEstimate(results);
      setIsEditing(false);
      onComplete(results);
    } catch (error) {
      console.error('Error recalculating ROI:', error);
      toast({
        title: 'Recalculation failed',
        description: 'Failed to recalculate ROI. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsEstimating(false);
    }
  };

  const handleError = (error: string) => {
    toast({
      title: 'Error',
      description: error,
      variant: 'destructive'
    });
  };

  if (isEstimating) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-12">
        <Card className="p-12 text-center space-y-6">
          <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary" />
          <div>
            <h3 className="text-2xl font-semibold mb-2">
              Calculating your business case...
            </h3>
            <p className="text-muted-foreground">
              Crunching the numbers
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (estimate && !isEditing) {
    const currentValue = useConservative ? estimate.conservativeValue : estimate.likelyValue;
    
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Value headline */}
        <Card className="p-8 text-center space-y-4">
          <h2 className="text-3xl font-bold text-foreground">
            ${currentValue.monthly.toLocaleString()} - ${estimate.likelyValue.monthly.toLocaleString()}/month
          </h2>
          <p className="text-muted-foreground">
            {useConservative ? 'Conservative' : 'Likely'} to likely estimate
          </p>
          
          {/* Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUseConservative(!useConservative)}
          >
            Switch to {useConservative ? 'Likely' : 'Conservative'} estimate
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit assumptions
          </Button>
        </Card>

        {/* Assumptions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Assumptions</h3>
          <ul className="space-y-2">
            {estimate.assumptions.map((assumption, index) => (
              <li key={index} className="text-sm text-foreground flex gap-2">
                <Check className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                {assumption}
              </li>
            ))}
          </ul>
        </Card>

        {/* 90-day forecast */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">90-Day Forecast</h3>
          <div className="space-y-3">
            {[
              { label: '30 days', value: estimate.forecast.day30 },
              { label: '60 days', value: estimate.forecast.day60 },
              { label: '90 days', value: estimate.forecast.day90 }
            ].map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-lg font-semibold text-foreground">
                  ${item.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Export CTA */}
        <Button onClick={onGate} className="w-full" size="lg">
          Export ROI Brief →
        </Button>
      </div>
    );
  }

  if (isEditing && editedInputs) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-2">
              Board-ready estimate
            </h3>
            <p className="text-sm text-muted-foreground">
              Sanity-check these inputs
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="hours">Hours per week</Label>
              <Input
                id="hours"
                type="number"
                value={editedInputs.hoursPerWeek}
                onChange={(e) => setEditedInputs({
                  ...editedInputs,
                  hoursPerWeek: parseFloat(e.target.value)
                })}
              />
            </div>

            <div>
              <Label htmlFor="people">People involved</Label>
              <Input
                id="people"
                type="number"
                value={editedInputs.peopleInvolved}
                onChange={(e) => setEditedInputs({
                  ...editedInputs,
                  peopleInvolved: parseInt(e.target.value)
                })}
              />
            </div>

            <div>
              <Label htmlFor="salary">Average salary ($)</Label>
              <Input
                id="salary"
                type="number"
                value={editedInputs.avgSalary}
                onChange={(e) => setEditedInputs({
                  ...editedInputs,
                  avgSalary: parseFloat(e.target.value)
                })}
              />
            </div>

            <div>
              <Label>Reduction potential: {Math.round(editedInputs.reductionPotential * 100)}%</Label>
              <Slider
                value={[editedInputs.reductionPotential * 100]}
                onValueChange={([value]) => setEditedInputs({
                  ...editedInputs,
                  reductionPotential: value / 100
                })}
                min={20}
                max={80}
                step={5}
                className="mt-2"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecalculate}
              className="flex-1"
            >
              Confirm & recalculate
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-2">
          Let's quantify the value
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Tell me about a time-consuming process. How many hours per week? How many people? Approximate salary range?
        </p>
      </Card>

      <VoiceCapture
        promptHint="Describe the process in 30-45 seconds"
        timeLimit={45}
        onTranscriptReady={handleTranscriptReady}
        onError={handleError}
        sessionId={sessionId}
        moduleName="roi"
      />

      <Button
        onClick={handleEstimate}
        disabled={!transcript}
        className="w-full"
        size="lg"
      >
        Calculate ROI →
      </Button>
    </div>
  );
};
