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
  const [customFriction, setCustomFriction] = useState('');

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

  const handleCustomFrictionAdd = () => {
    if (customFriction.trim() && (data.dailyFrictions || []).length < 3) {
      const current = data.dailyFrictions || [];
      const updated = [...current, customFriction.trim()];
      setDraggedItems(updated);
      onUpdate({ dailyFrictions: updated });
      setCustomFriction('');
    }
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    const updated = [...draggedItems];
    const [removed] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, removed);
    setDraggedItems(updated);
    onUpdate({ dailyFrictions: updated });
  };

  const getAllFrictionOptions = () => {
    const customFrictions = (data.dailyFrictions || []).filter(friction => !frictionOptions.includes(friction));
    return [...frictionOptions, ...customFrictions];
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
          {getAllFrictionOptions().map((friction) => {
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
        
        
        {/* Custom Friction Point Input */}
        <div className="mt-6 p-4 border border-dashed border-primary/30 rounded-lg">
          <div className="space-y-3">
            <label className="text-sm font-medium">Add your own friction point:</label>
            <div className="flex space-x-2">
              <Input
                value={customFriction}
                onChange={(e) => setCustomFriction(e.target.value)}
                placeholder="Enter a custom friction point..."
                className="flex-1"
                disabled={(data.dailyFrictions || []).length >= 3}
              />
              <button
                onClick={handleCustomFrictionAdd}
                disabled={!customFriction.trim() || (data.dailyFrictions || []).length >= 3}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          Selected: {(data.dailyFrictions || []).length} out of 3 friction points
        </div>
      </Card>

      {/* Contact Information */}
      <Card className="p-6 bg-secondary/10 border-primary/20">
        <h3 className="text-xl font-semibold mb-6">Contact</h3>
        
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
          
          <div className="space-y-2">
            <Label htmlFor="company" className="text-base font-medium">
              Company
            </Label>
            <Input
              id="company"
              type="text"
              placeholder="Your company name"
              value={data.company || ''}
              onChange={(e) => onUpdate({ company: e.target.value })}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-medium">
              Title
            </Label>
            <Input
              id="title"
              type="text"
              placeholder="Your job title"
              value={data.title || ''}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="linkedin" className="text-base font-medium">
              LinkedIn Profile URL
            </Label>
            <Input
              id="linkedin"
              type="url"
              placeholder="https://linkedin.com/in/yourprofile"
              value={data.linkedinUrl || ''}
              onChange={(e) => onUpdate({ linkedinUrl: e.target.value })}
              className="w-full"
            />
          </div>
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