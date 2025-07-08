import React from 'react';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { DiagnosticData } from '../../DiagnosticTool';

interface SectionBProps {
  data: DiagnosticData;
  onUpdate: (data: Partial<DiagnosticData>) => void;
}

export const SectionB: React.FC<SectionBProps> = ({ data, onUpdate }) => {
  const likertOptions = [
    { value: 1, label: 'Strongly Disagree' },
    { value: 2, label: 'Disagree' },
    { value: 3, label: 'Neutral' },
    { value: 4, label: 'Agree' },
    { value: 5, label: 'Strongly Agree' },
  ];

  return (
    <div className="space-y-8">
      
      {/* Personal Decision Speed */}
      <Card className="p-6 bg-secondary/10 border-primary/20">
        <h3 className="text-xl font-semibold mb-6">Personal Decision Speed</h3>
        <p className="text-muted-foreground mb-6">How quickly do you make decisions when you have the information you need?</p>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="font-medium">Hours from having info to making decision</label>
            <span className="text-primary font-bold">{data.hoursToDecision || 24}h</span>
          </div>
          
          <Slider
            value={[data.hoursToDecision || 24]}
            onValueChange={(value) => onUpdate({ hoursToDecision: value[0] })}
            max={72}
            min={0}
            step={1}
            className="w-full"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Instant (0h)</span>
            <span>Same day (8h)</span>
            <span>Next day (24h)</span>
            <span>3 days (72h)</span>
          </div>
        </div>
      </Card>

      {/* Personal AI Decision Support */}
      <Card className="p-6 bg-secondary/10 border-primary/20">
        <h3 className="text-xl font-semibold mb-6">AI-Enhanced Decision Making</h3>
        <p className="text-muted-foreground mb-4">How do you personally use AI to improve your decision-making process?</p>
        
        <div className="space-y-4">
          <p className="text-base">"I regularly use AI to analyze options and validate my decisions"</p>
          
          <RadioGroup
            value={data.aiTrustLevel?.toString() || '3'}
            onValueChange={(value) => onUpdate({ aiTrustLevel: parseInt(value) })}
            className="space-y-3"
          >
            {likertOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-3">
                <RadioGroupItem 
                  value={option.value.toString()} 
                  id={`trust-${option.value}`}
                />
                <Label 
                  htmlFor={`trust-${option.value}`}
                  className="text-sm font-medium cursor-pointer flex-1"
                >
                  <span className="font-bold text-primary">{option.value}</span> - {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
          
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Your selection:</strong> {likertOptions.find(o => o.value === (data.aiTrustLevel || 3))?.label}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};