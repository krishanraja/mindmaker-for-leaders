import React from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { DiagnosticData } from '../../DiagnosticTool';

interface SectionAProps {
  data: DiagnosticData;
  onUpdate: (data: Partial<DiagnosticData>) => void;
}

const personalAITools = [
  'ChatGPT/GPT-4 for writing & analysis',
  'Claude for deep thinking & research',
  'Perplexity for quick research',
  'Notion AI for note-taking & organization',
  'Grammarly for writing enhancement',
  'Otter.ai for meeting transcription',
  'Midjourney/DALL-E for visual creation',
  'GitHub Copilot for code assistance',
  'Custom AI workflows I have built'
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
      
      {/* Personal AI-Enhanced Daily Allocation */}
      <Card className="p-6 bg-secondary/10 border-primary/20">
        <h3 className="text-xl font-outfit font-bold tracking-tight mb-6">How do you spend your time when AI could help you?</h3>
        <p className="text-muted-foreground mb-6">Show us your current daily time allocation so we can identify AI enhancement opportunities.</p>
        
        <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="font-medium">Deep Work (thinking, creating, analyzing)</label>
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
              <label className="font-medium">Admin Tasks (email, scheduling, reporting)</label>
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

      {/* Personal AI Tools */}
      <Card className="p-6 bg-secondary/10 border-primary/20">
        <h3 className="text-xl font-semibold mb-6">Which personal AI tools do you actively use?</h3>
        <p className="text-muted-foreground mb-6">Select all AI tools you use regularly for your personal productivity and effectiveness.</p>
        
        <div className="grid md:grid-cols-2 gap-4">
          {personalAITools.map((tool) => (
            <div key={tool} className="flex items-center space-x-3">
              <Checkbox
                id={tool}
                checked={(data.aiCopilots || []).includes(tool)}
                onCheckedChange={(checked) => handleCopilotToggle(tool, checked as boolean)}
              />
              <label 
                htmlFor={tool}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {tool}
              </label>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground">
          Selected: {(data.aiCopilots || []).length} personal AI tools
        </div>
      </Card>
    </div>
  );
};