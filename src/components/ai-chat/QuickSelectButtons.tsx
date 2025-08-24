import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

interface QuickSelectButtonsProps {
  options: string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
  selectedOption?: string;
}

const QuickSelectButtons: React.FC<QuickSelectButtonsProps> = ({
  options,
  onSelect,
  disabled = false,
  selectedOption
}) => {
  return (
    <div className="grid gap-2 mt-4">
      {options.map((option, index) => (
        <Button
          key={index}
          variant={selectedOption === option ? "default" : "outline"}
          className="justify-start text-left h-auto p-4 whitespace-normal"
          onClick={() => onSelect(option)}
          disabled={disabled}
        >
          <div className="flex items-start gap-3 w-full">
            {selectedOption === option && (
              <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
            )}
            <span className="text-sm">{option}</span>
          </div>
        </Button>
      ))}
    </div>
  );
};

export default QuickSelectButtons;