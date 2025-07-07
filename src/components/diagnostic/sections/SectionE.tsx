import React from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { DiagnosticData } from '../../DiagnosticTool';

interface SectionEProps {
  data: DiagnosticData;
  onUpdate: (data: Partial<DiagnosticData>) => void;
}

export const SectionE: React.FC<SectionEProps> = ({ data, onUpdate }) => {
  const getRiskDescription = (level: number): string => {
    if (level <= 2) return 'Very Conservative - Avoid cloud AI';
    if (level <= 4) return 'Cautious - Basic tools only';
    if (level <= 6) return 'Moderate - Some proprietary data OK';
    if (level <= 8) return 'Comfortable - Most use cases';
    return 'Fully Confident - All scenarios';
  };

  return (
    <div className="space-y-8">
      
      {/* AI Safety Playbook */}
      <Card className="p-6 bg-secondary/10 border-primary/20">
        <h3 className="text-xl font-semibold mb-6">AI Safety & Governance</h3>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="safety-playbook" className="text-base font-medium">
                Do you have a personal playbook for AI safety?
              </Label>
              <p className="text-sm text-muted-foreground">
                Guidelines for responsible AI use in your role
              </p>
            </div>
            <Switch
              id="safety-playbook"
              checked={data.hasAiSafetyPlaybook || false}
              onCheckedChange={(checked) => onUpdate({ hasAiSafetyPlaybook: checked })}
            />
          </div>
          
          {data.hasAiSafetyPlaybook && (
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-primary">
                ✓ Great! Having a safety playbook shows governance maturity.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Risk Comfort Level */}
      <Card className="p-6 bg-secondary/10 border-primary/20">
        <h3 className="text-xl font-semibold mb-6">Data Sharing Comfort</h3>
        
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="font-medium">
                Comfort level sharing proprietary data with cloud LLMs
              </label>
              <span className="text-primary font-bold">{data.riskComfortLevel || 5}/10</span>
            </div>
            
            <Slider
              value={[data.riskComfortLevel || 5]}
              onValueChange={(value) => onUpdate({ riskComfortLevel: value[0] })}
              max={10}
              min={0}
              step={1}
              className="w-full"
            />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Never</span>
              <span>Sometimes</span>
              <span>Always</span>
            </div>
          </div>
          
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm">
              <strong>Your stance:</strong> {getRiskDescription(data.riskComfortLevel || 5)}
            </p>
          </div>
        </div>
      </Card>

      {/* Risk Assessment Info */}
      <Card className="p-6 bg-muted/20 border-muted">
        <h4 className="font-semibold mb-3">Risk Management Tips</h4>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>• Use data anonymization when possible</li>
          <li>• Implement approval workflows for sensitive data</li>
          <li>• Consider on-premise AI solutions for critical data</li>
          <li>• Regular audits of AI tool usage and data flows</li>
        </ul>
      </Card>
    </div>
  );
};