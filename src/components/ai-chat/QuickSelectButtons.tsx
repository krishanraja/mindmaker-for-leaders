import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

interface QuickSelectButtonsProps {
  options: string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  clickingButton?: string | null;
  selectedOption?: string;
}

const QuickSelectButtons: React.FC<QuickSelectButtonsProps> = React.memo(({
  options,
  onSelect,
  disabled = false,
  isLoading = false,
  clickingButton,
  selectedOption
}) => {
  return (
    <div className="grid gap-2 mt-4">
      {options.map((option, index) => {
        const isClickingThis = clickingButton === option;
        const isSelected = selectedOption === option;
        const isLoadingThis = isLoading && isClickingThis;
        
        return (
          <Button
            key={`option-${index}-${option.slice(0, 10)}`}
            variant={isSelected ? "default" : "outline"}
            className={`
              justify-start text-left h-auto p-4 whitespace-normal
              transition-all duration-150 ease-out
              hover:scale-[1.02] hover:shadow-md
              active:scale-[0.98]
              ${isClickingThis ? 'bg-primary/20 border-primary scale-[0.98]' : ''}
              ${isLoadingThis ? 'animate-pulse' : ''}
              cursor-pointer pointer-events-auto
            `}
            onClick={() => onSelect(option)}
            disabled={disabled || isLoading}
          >
            <div className="flex items-start gap-3 w-full">
              {isSelected && (
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
              )}
              {isLoadingThis && !isSelected && (
                <div className="h-4 w-4 mt-0.5 flex-shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
              <span className="text-sm">{option}</span>
            </div>
          </Button>
        );
      })}
    </div>
  );
});

export default QuickSelectButtons;