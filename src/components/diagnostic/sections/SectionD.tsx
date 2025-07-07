import React from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { DiagnosticData } from '../../DiagnosticTool';

interface SectionDProps {
  data: DiagnosticData;
  onUpdate: (data: Partial<DiagnosticData>) => void;
}

const skillGapOptions = [
  'AI prompting & optimization',
  'Data fluency & interpretation', 
  'Storytelling with AI insights',
  'AI ethics & governance',
  'Automation design & workflow'
];

export const SectionD: React.FC<SectionDProps> = ({ data, onUpdate }) => {
  const handleSkillGapToggle = (skill: string, checked: boolean) => {
    const current = data.skillGaps || [];
    if (checked && current.length < 3) {
      onUpdate({ skillGaps: [...current, skill] });
    } else if (!checked) {
      onUpdate({ skillGaps: current.filter(s => s !== skill) });
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Upskilling Time */}
      <Card className="p-6 bg-secondary/10 border-primary/20">
        <h3 className="text-xl font-semibold mb-6">Learning Investment</h3>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="font-medium">% of weekly time spent upskilling</label>
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

      {/* Top 3 Skill Gaps */}
      <Card className="p-6 bg-secondary/10 border-primary/20">
        <h3 className="text-xl font-semibold mb-6">Top 3 Skill Gaps</h3>
        <p className="text-muted-foreground mb-6">
          Select your top 3 skill gaps to focus on (maximum 3 selections)
        </p>
        
        <div className="space-y-4">
          {skillGapOptions.map((skill) => {
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
        
        <div className="mt-4 text-sm text-muted-foreground">
          Selected: {(data.skillGaps || []).length} out of 3 skill gaps
        </div>
      </Card>
    </div>
  );
};