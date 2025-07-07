import React from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { DiagnosticData } from '../../DiagnosticTool';

interface SectionCProps {
  data: DiagnosticData;
  onUpdate: (data: Partial<DiagnosticData>) => void;
}

const stakeholderOptions = [
  'Board of Directors',
  'Regulators/Compliance',
  'Key Clients/Customers',
  'Team Members/Direct Reports'
];

export const SectionC: React.FC<SectionCProps> = ({ data, onUpdate }) => {
  const handleStakeholderToggle = (stakeholder: string, checked: boolean) => {
    const current = data.stakeholderAudiences || [];
    if (checked) {
      onUpdate({ stakeholderAudiences: [...current, stakeholder] });
    } else {
      onUpdate({ stakeholderAudiences: current.filter(s => s !== stakeholder) });
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Stakeholder Audiences */}
      <Card className="p-6 bg-secondary/10 border-primary/20">
        <h3 className="text-xl font-semibold mb-6">Key Audiences to Persuade</h3>
        <p className="text-muted-foreground mb-6">
          Which audiences do you need to persuade with AI-backed arguments?
        </p>
        
        <div className="grid md:grid-cols-2 gap-4">
          {stakeholderOptions.map((stakeholder) => (
            <div key={stakeholder} className="flex items-center space-x-3">
              <Checkbox
                id={stakeholder}
                checked={(data.stakeholderAudiences || []).includes(stakeholder)}
                onCheckedChange={(checked) => handleStakeholderToggle(stakeholder, checked as boolean)}
              />
              <label 
                htmlFor={stakeholder}
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {stakeholder}
              </label>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground">
          Selected: {(data.stakeholderAudiences || []).length} audience(s)
        </div>
      </Card>

      {/* Persuasion Challenge */}
      <Card className="p-6 bg-secondary/10 border-primary/20">
        <h3 className="text-xl font-semibold mb-6">Biggest Persuasion Challenge</h3>
        <p className="text-muted-foreground mb-4">
          What's your biggest challenge when persuading stakeholders with data-driven insights?
        </p>
        
        <Textarea
          placeholder="e.g., 'Getting buy-in for AI investments from traditional board members' or 'Explaining complex ML models to non-technical clients'"
          value={data.persuasionChallenge || ''}
          onChange={(e) => onUpdate({ persuasionChallenge: e.target.value })}
          className="min-h-[120px] resize-none"
        />
        
        <div className="mt-2 text-xs text-muted-foreground">
          {(data.persuasionChallenge || '').length}/500 characters
        </div>
      </Card>
    </div>
  );
};