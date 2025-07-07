import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DiagnosticData } from '../../DiagnosticTool';

interface SectionFProps {
  data: DiagnosticData;
  onUpdate: (data: Partial<DiagnosticData>) => void;
}

const frictionOptions = [
  'Context-switching between tools',
  'Information overload & filtering',
  'Slow approval processes',
  'Manual slide-building & presentations',
  'Email management & responses'
];

export const SectionF: React.FC<SectionFProps> = ({ data, onUpdate }) => {
  const [draggedItems, setDraggedItems] = useState<string[]>(data.dailyFrictions || []);

  const handleFrictionToggle = (friction: string, checked: boolean) => {
    const current = data.dailyFrictions || [];
    if (checked && current.length < 3) {
      const updated = [...current, friction];
      setDraggedItems(updated);
      onUpdate({ dailyFrictions: updated });
    } else if (!checked) {
      const updated = current.filter(f => f !== friction);
      setDraggedItems(updated);
      onUpdate({ dailyFrictions: updated });
    }
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    const updated = [...draggedItems];
    const [removed] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, removed);
    setDraggedItems(updated);
    onUpdate({ dailyFrictions: updated });
  };

  return (
    <div className="space-y-8">
      
      {/* Daily Frictions Ranking */}
      <Card className="p-6 bg-secondary/10 border-primary/20">
        <h3 className="text-xl font-semibold mb-6">Priority Friction Points</h3>
        <p className="text-muted-foreground mb-6">
          Rank your top 3 daily frictions you'd eliminate first (drag to reorder)
        </p>
        
        <div className="space-y-4">
          {frictionOptions.map((friction) => {
            const isSelected = (data.dailyFrictions || []).includes(friction);
            const selectionCount = (data.dailyFrictions || []).length;
            const isDisabled = !isSelected && selectionCount >= 3;
            const rank = isSelected ? (data.dailyFrictions || []).indexOf(friction) + 1 : null;
            
            return (
              <div 
                key={friction} 
                className={`flex items-center space-x-3 p-4 rounded-lg border transition-all duration-200 ${
                  isSelected 
                    ? 'border-primary/50 bg-primary/10 cursor-move' 
                    : isDisabled 
                      ? 'border-muted bg-muted/20 opacity-50' 
                      : 'border-border hover:border-primary/30'
                }`}
              >
                <Checkbox
                  id={friction}
                  checked={isSelected}
                  disabled={isDisabled}
                  onCheckedChange={(checked) => handleFrictionToggle(friction, checked as boolean)}
                />
                <label 
                  htmlFor={friction}
                  className={`text-sm font-medium leading-none cursor-pointer flex-1 ${
                    isDisabled ? 'cursor-not-allowed' : ''
                  }`}
                >
                  {friction}
                </label>
                {rank && (
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                      #{rank}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {rank === 1 ? 'Highest' : rank === 2 ? 'Medium' : 'Lower'} priority
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground">
          Selected: {(data.dailyFrictions || []).length} out of 3 friction points
        </div>
      </Card>

      {/* Email & Consent */}
      <Card className="p-6 bg-secondary/10 border-primary/20">
        <h3 className="text-xl font-semibold mb-6">Contact & Consent</h3>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base font-medium">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@company.com"
              value={data.email || ''}
              onChange={(e) => onUpdate({ email: e.target.value })}
              className="w-full"
            />
          </div>
          
          <div className="flex items-start space-x-3 p-4 border border-border rounded-lg">
            <Checkbox
              id="gdpr-consent"
              checked={data.gdprConsent || false}
              onCheckedChange={(checked) => onUpdate({ gdprConsent: checked as boolean })}
            />
            <div className="space-y-1">
              <Label htmlFor="gdpr-consent" className="text-sm font-medium cursor-pointer">
                GDPR Consent & Marketing Permission
              </Label>
              <p className="text-xs text-muted-foreground">
                I consent to receive the diagnostic results, personalized recommendations, 
                and occasional updates about AI leadership resources. You can unsubscribe anytime.
              </p>
            </div>
          </div>
          
          {data.gdprConsent && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-xs text-primary">
                ✓ Thank you! We'll send your results and keep you updated on AI leadership insights.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Data Usage Notice */}
      <Card className="p-6 bg-muted/20 border-muted">
        <h4 className="font-semibold mb-3">Your Data & Privacy</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Your responses are used only for generating personalized recommendations</li>
          <li>• Data is stored securely and never shared with third parties</li>
          <li>• You can request data deletion at any time</li>
          <li>• GDPR compliant data processing</li>
        </ul>
      </Card>
    </div>
  );
};