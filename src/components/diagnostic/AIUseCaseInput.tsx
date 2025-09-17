import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { AIUseCase } from '../../types/diagnostic';

interface AIUseCaseInputProps {
  useCase: string;
  value: AIUseCase | null;
  onChange: (value: AIUseCase | null) => void;
}

export const AIUseCaseInput: React.FC<AIUseCaseInputProps> = ({ 
  useCase, 
  value, 
  onChange 
}) => {
  const isChecked = value !== null;
  
  const handleCheckboxChange = (checked: boolean) => {
    if (checked) {
      onChange({ useCase, tool: '', frequency: 'weekly' });
    } else {
      onChange(null);
    }
  };

  const handleToolChange = (tool: string) => {
    if (value) {
      onChange({ ...value, tool });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-3">
        <Checkbox
          id={useCase}
          checked={isChecked}
          onCheckedChange={handleCheckboxChange}
        />
        <label 
          htmlFor={useCase}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
        >
          {useCase}
        </label>
      </div>
      
      {isChecked && !useCase.startsWith('None -') && (
        <div className="ml-6 space-y-1">
          <Input
            placeholder="Which tool do you use? (e.g., ChatGPT, Claude, etc.)"
            value={value?.tool || ''}
            onChange={(e) => handleToolChange(e.target.value)}
            className={`text-sm ${(!value?.tool || value?.tool.trim() === '') ? 'border-amber-400 ring-amber-100' : ''}`}
          />
          {(!value?.tool || value?.tool.trim() === '') && (
            <p className="text-xs text-amber-600 ml-1">Tool name required</p>
          )}
        </div>
      )}
    </div>
  );
};