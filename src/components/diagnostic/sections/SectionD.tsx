import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { DiagnosticData } from '../../../types/diagnostic';

interface SectionDProps {
  data: DiagnosticData;
  onUpdate: (data: Partial<DiagnosticData>) => void;
}

const aiMasterySkills = [
  'Advanced prompt engineering and AI conversation',
  'Building custom AI workflows and automations',
  'Using AI for strategic thinking and analysis',
  'AI-powered content creation and writing',
  'Leveraging AI for research and information synthesis',
  'Creating AI-enhanced presentations and visuals',
  'Using AI for personal productivity optimization',
  'AI-assisted decision making and problem solving'
];

export const SectionD: React.FC<SectionDProps> = ({ data, onUpdate }) => {
  const [customSkillGap, setCustomSkillGap] = useState('');

  const handleSkillGapToggle = (skill: string, checked: boolean) => {
    const current = data.skillGaps || [];
    if (checked && current.length < 3) {
      onUpdate({ skillGaps: [...current, skill] });
    } else if (!checked) {
      onUpdate({ skillGaps: current.filter(s => s !== skill) });
    }
  };

  const handleCustomSkillGapAdd = () => {
    if (customSkillGap.trim() && (data.skillGaps || []).length < 3) {
      const current = data.skillGaps || [];
      onUpdate({ skillGaps: [...current, customSkillGap.trim()] });
      setCustomSkillGap('');
    }
  };

  const getAllSkillOptions = () => {
    const customSkills = (data.skillGaps || []).filter(skill => !aiMasterySkills.includes(skill));
    return [...aiMasterySkills, ...customSkills];
  };

  return (
    <div className="space-y-8">
      
      {/* AI Learning Time */}
      <Card className="p-6 bg-secondary/10 border-primary/20">
        <h3 className="text-xl font-semibold mb-6">AI Learning Investment</h3>
        <p className="text-muted-foreground mb-6">How much time do you invest in staying current with AI tools and capabilities?</p>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="font-medium">% of weekly time spent learning AI tools & techniques</label>
            <span className="text-primary font-bold">{data.upskillPercentage || 10}%</span>
          </div>
          
          <Slider
            value={[data.upskillPercentage || 10]}
            onValueChange={(value) => onUpdate({ upskillPercentage: value[0] })}
            max={50}
            min={0}
            step={5}
            className="w-full"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0% (None)</span>
            <span>10% (4h/week)</span>
            <span>25% (10h/week)</span>
            <span>50% (20h/week)</span>
          </div>
        </div>
      </Card>

      {/* AI Mastery Gaps */}
      <Card className="p-6 bg-secondary/10 border-primary/20">
        <h3 className="text-xl font-semibold mb-6">AI Mastery Development Areas</h3>
        <p className="text-muted-foreground mb-6">
          Which AI skills would most help you become a 10X leader? (Select up to 3)
        </p>
        
        <div className="space-y-4">
          {getAllSkillOptions().map((skill) => {
            const isSelected = (data.skillGaps || []).includes(skill);
            const selectionCount = (data.skillGaps || []).length;
            const isDisabled = !isSelected && selectionCount >= 3;
            
            return (
              <div 
                key={skill} 
                className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 ${
                  isSelected 
                    ? 'border-primary/50 bg-primary/10' 
                    : isDisabled 
                      ? 'border-muted bg-muted/20 opacity-50' 
                      : 'border-border hover:border-primary/30'
                }`}
              >
                <Checkbox
                  id={skill}
                  checked={isSelected}
                  disabled={isDisabled}
                  onCheckedChange={(checked) => handleSkillGapToggle(skill, checked as boolean)}
                />
                <label 
                  htmlFor={skill}
                  className={`text-sm font-medium leading-none cursor-pointer flex-1 ${
                    isDisabled ? 'cursor-not-allowed' : ''
                  }`}
                >
                  {skill}
                </label>
                {isSelected && (
                  <div className="text-xs text-primary font-bold">
                    #{(data.skillGaps || []).indexOf(skill) + 1}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        
        {/* Custom Skill Gap Input */}
        <div className="mt-6 p-4 border border-dashed border-primary/30 rounded-lg">
          <div className="space-y-3">
            <label className="text-sm font-medium">Add your own AI mastery area:</label>
            <div className="flex space-x-2">
              <Input
                value={customSkillGap}
                onChange={(e) => setCustomSkillGap(e.target.value)}
                placeholder="Enter a custom AI skill you want to develop..."
                className="flex-1"
                disabled={(data.skillGaps || []).length >= 3}
              />
              <button
                onClick={handleCustomSkillGapAdd}
                disabled={!customSkillGap.trim() || (data.skillGaps || []).length >= 3}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          Selected: {(data.skillGaps || []).length} out of 3 AI mastery areas
        </div>
      </Card>
    </div>
  );
};