import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { DiagnosticData, AIUseCase } from '../../DiagnosticTool';
import { AIUseCaseInput } from '../AIUseCaseInput';

interface SectionAProps {
  data: DiagnosticData;
  onUpdate: (data: Partial<DiagnosticData>) => void;
}

const aiUseCases = [
  'None - I don\'t actively use AI yet',
  'Writing & analysis',
  'Quick research',
  'Deep thinking & research',
  'Note-taking & organization',
  'Writing enhancement',
  'Meeting transcription',
  'Visual creation',
  'Code assistance',
  'Email drafting',
  'Data analysis'
];

export const SectionA: React.FC<SectionAProps> = ({ data, onUpdate }) => {
  const [customUseCase, setCustomUseCase] = useState('');
  
  // Initialize default values if they don't exist
  React.useEffect(() => {
    const updates: Partial<DiagnosticData> = {};
    if (data.deepWorkHours === undefined) updates.deepWorkHours = 8;
    if (data.meetingHours === undefined) updates.meetingHours = 4;
    if (data.adminHours === undefined) updates.adminHours = 4;
    
    if (Object.keys(updates).length > 0) {
      onUpdate(updates);
    }
  }, []);
  
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

  const handleUseCaseChange = (useCase: string, value: AIUseCase | null) => {
    const current = data.aiUseCases || [];
    const filtered = current.filter(u => u.useCase !== useCase);
    
    if (value) {
      // If "None" is selected, clear all other selections
      if (useCase.startsWith('None -')) {
        onUpdate({ aiUseCases: [value] });
      } else {
        // If any other option is selected, remove "None" if it exists
        const withoutNone = filtered.filter(u => !u.useCase.startsWith('None -'));
        onUpdate({ aiUseCases: [...withoutNone, value] });
      }
    } else {
      onUpdate({ aiUseCases: filtered });
    }
  };

  const handleCustomUseCaseAdd = () => {
    if (customUseCase.trim()) {
      const current = data.aiUseCases || [];
      const newUseCase: AIUseCase = { useCase: customUseCase.trim(), tool: '' };
      onUpdate({ aiUseCases: [...current, newUseCase] });
      setCustomUseCase('');
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

      {/* AI Use Cases */}
      <Card className="p-6 bg-secondary/10 border-primary/20">
        <h3 className="text-xl font-semibold mb-6">What do you actively use AI for?</h3>
        <p className="text-muted-foreground mb-6">Select what you use AI for and specify which tools you use for each task.</p>
        
        <div className="space-y-4">
          {aiUseCases.map((useCase) => (
            <AIUseCaseInput
              key={useCase}
              useCase={useCase}
              value={data.aiUseCases?.find(u => u.useCase === useCase) || null}
              onChange={(value) => handleUseCaseChange(useCase, value)}
            />
          ))}
          
          {/* Custom use case input */}
          <div className="border-t pt-4 mt-6">
            <div className="flex space-x-2">
              <Input
                placeholder="Add your own AI use case..."
                value={customUseCase}
                onChange={(e) => setCustomUseCase(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCustomUseCaseAdd()}
                className="flex-1"
              />
              <button
                onClick={handleCustomUseCaseAdd}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
          
          {/* Show custom use cases */}
          {data.aiUseCases?.filter(u => !aiUseCases.includes(u.useCase)).map((customCase) => (
            <AIUseCaseInput
              key={customCase.useCase}
              useCase={customCase.useCase}
              value={customCase}
              onChange={(value) => handleUseCaseChange(customCase.useCase, value)}
            />
          ))}
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="text-sm text-muted-foreground">
            Selected: {(data.aiUseCases || []).length} AI use cases
          </div>
          {(data.aiUseCases || []).some(u => !u.useCase.startsWith('None -') && (!u.tool || u.tool.trim() === '')) && 
           !(data.aiUseCases || []).some(u => u.useCase.startsWith('None -')) && (
            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
              ⚠️ Please fill in the tool name for all selected use cases to continue
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};