import React from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { DiagnosticData } from '../../DiagnosticTool';

interface SectionCProps {
  data: DiagnosticData;
  onUpdate: (data: Partial<DiagnosticData>) => void;
}

const communicationAudiences = [
  'Senior executives and board members',
  'Peers and colleagues',
  'Direct reports and team members',
  'External clients and partners',
  'Industry networks and conferences',
  'Social media and thought leadership'
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
      
      {/* Communication Enhancement */}
      <Card className="p-6 bg-secondary/10 border-primary/20">
        <h3 className="text-xl font-semibold mb-6">AI-Enhanced Communication</h3>
        <p className="text-muted-foreground mb-4">
          Which audiences do you communicate with regularly OR want to better communicate with using AI?
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          Select either current communication audiences or those you'd like to improve your communication with using AI assistance.
        </p>
        
        <div className="grid md:grid-cols-2 gap-4">
          {communicationAudiences.map((audience) => (
            <div key={audience} className="flex items-center space-x-3">
              <Checkbox
                id={audience}
                checked={(data.stakeholderAudiences || []).includes(audience)}
                onCheckedChange={(checked) => handleStakeholderToggle(audience, checked as boolean)}
              />
              <label 
                htmlFor={audience}
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {audience}
              </label>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground">
          Selected: {(data.stakeholderAudiences || []).length} audience(s)
        </div>
      </Card>

      {/* Communication Challenge */}
      <Card className="p-6 bg-secondary/10 border-primary/20">
        <h3 className="text-xl font-semibold mb-6">Personal Communication Challenge</h3>
        <p className="text-muted-foreground mb-4">
          What's your biggest challenge when communicating ideas or building influence? Where could AI help you be more effective?
        </p>
        
        <Textarea
          placeholder="e.g., 'I want to craft compelling presentations that resonate with executives' or 'I need help creating thought leadership content that stands out' or 'I want to better explain complex topics in simple terms to my team'"
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