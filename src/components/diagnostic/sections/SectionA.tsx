import React from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { DiagnosticData } from '../../DiagnosticTool';

interface SectionAProps {
  data: DiagnosticData;
  onUpdate: (data: Partial<DiagnosticData>) => void;
}

const aiCopilotOptions = [
  'None',
  'Document writing/editing',
  'Email triage & responses', 
  'Search & research',
  'Data dashboards & insights'
];

export const SectionA: React.FC<SectionAProps> = ({ data, onUpdate }) => {
  const totalHours = (data.deepWorkHours || 8) + (data.meetingHours || 4) + (data.adminHours || 4);
  
  const handleTimeAllocation = (type: 'deepWork' | 'meetings' | 'admin', value: number[]) => {
    if (type === 'deepWork') {
      onUpdate({ deepWorkHours: value[0] });
    } else if (type === 'meetings') {
      onUpdate({ meetingHours: value[0] });
    } else {
      onUpdate({ adminHours: value[0] });
    }
  };

  const handleCopilotToggle = (copilot: string, checked: boolean) => {
    const current = data.aiCopilots || [];
    if (checked) {
      onUpdate({ aiCopilots: [...current, copilot] });
    } else {
      onUpdate({ aiCopilots: current.filter(c => c !== copilot) });
    }
  };

  return (
    <div className="space-y-8">
      
      {/* 24-hour wheel representation */}
      <Card className="p-6 bg-secondary/10 border-primary/20">
        <h3 className="text-xl font-outfit font-bold tracking-tight mb-6">How do you allocate your average working day?</h3>
        
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="font-medium">Deep Work</label>
              <span className="text-primary font-bold">{data.deepWorkHours || 8}h</span>
            </div>
            <Slider
              value={[data.deepWorkHours || 8]}
              onValueChange={(value) => handleTimeAllocation('deepWork', value)}
              max={16}
              min={0}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="font-medium">Meetings</label>
              <span className="text-primary font-bold">{data.meetingHours || 4}h</span>
            </div>
            <Slider
              value={[data.meetingHours || 4]}
              onValueChange={(value) => handleTimeAllocation('meetings', value)}
              max={12}
              min={0}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="font-medium">Admin Tasks</label>
              <span className="text-primary font-bold">{data.adminHours || 4}h</span>
            </div>
            <Slider
              value={[data.adminHours || 4]}
              onValueChange={(value) => handleTimeAllocation('admin', value)}
              max={12}
              min={0}
              step={1}
              className="w-full"
            />
          </div>

          <div className="text-sm text-muted-foreground text-center">
            Total work hours: {totalHours}h • Remaining: {24 - totalHours}h (personal time)
          </div>
        </div>
      </Card>

      {/* AI Copilots */}
      <Card className="p-6 bg-secondary/10 border-primary/20">
        <h3 className="text-xl font-semibold mb-6">What do you currently use AI copilots for?</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          {aiCopilotOptions.map((copilot) => (
            <div key={copilot} className="flex items-center space-x-3">
              <Checkbox
                id={copilot}
                checked={(data.aiCopilots || []).includes(copilot)}
                onCheckedChange={(checked) => handleCopilotToggle(copilot, checked as boolean)}
              />
              <label 
                htmlFor={copilot}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {copilot}
              </label>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground">
          Selected: {(data.aiCopilots || []).length} out of {aiCopilotOptions.length}
        </div>
      </Card>
    </div>
  );
};