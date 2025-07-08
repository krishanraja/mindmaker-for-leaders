import React from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { DiagnosticData } from '../../DiagnosticTool';

interface SectionEProps {
  data: DiagnosticData;
  onUpdate: (data: Partial<DiagnosticData>) => void;
}

export const SectionE: React.FC<SectionEProps> = ({ data, onUpdate }) => {
  const getRiskDescription = (level: number): string => {
    if (level <= 2) return 'Very Cautious - Minimal AI interaction';
    if (level <= 4) return 'Careful - Basic AI assistance only';
    if (level <= 6) return 'Balanced - Strategic AI collaboration';
    if (level <= 8) return 'Confident - Advanced AI partnership';
    return 'Fully Integrated - AI as thinking partner';
  };

  return (
    <div className="space-y-8">
      
      {/* Personal AI Ethics */}
      <Card className="p-6 bg-secondary/10 border-primary/20">
        <h3 className="text-xl font-semibold mb-6">Personal AI Ethics & Responsibility</h3>
        <p className="text-muted-foreground mb-6">How do you approach responsible AI use in your daily work?</p>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="safety-playbook" className="text-base font-medium">
                Do you have personal guidelines for AI usage?
              </Label>
              <p className="text-sm text-muted-foreground">
                Your own principles for when and how to use AI responsibly
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
                ✓ Excellent! Having personal AI ethics shows mature AI leadership.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Personal AI Balance */}
      <Card className="p-6 bg-secondary/10 border-primary/20">
        <h3 className="text-xl font-semibold mb-6">AI-Human Balance</h3>
        <p className="text-muted-foreground mb-6">How do you balance AI assistance with maintaining your own judgment and skills?</p>
        
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <label className="font-medium">
                  Comfort level with AI handling your personal work content
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        How comfortable are you with AI tools processing your ideas, documents, and creative work to help you be more effective?
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
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
              <strong>Your AI balance:</strong> {getRiskDescription(data.riskComfortLevel || 5)}
            </p>
          </div>
        </div>
      </Card>

      {/* AI Balance Tips */}
      <Card className="p-6 bg-muted/20 border-muted">
        <h4 className="font-semibold mb-3">Healthy AI Usage Tips</h4>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>• Keep developing your own critical thinking skills</li>
          <li>• Use AI to enhance, not replace, your judgment</li>
          <li>• Regularly evaluate AI outputs for accuracy and bias</li>
          <li>• Maintain human oversight on important decisions</li>
          <li>• Stay updated on AI capabilities and limitations</li>
        </ul>
      </Card>
    </div>
  );
};