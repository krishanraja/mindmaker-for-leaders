import React from 'react';
import { Check, Circle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ProgressSidebarProps {
  currentSection: number;
  totalSections: number;
  sections: Array<{
    id: string;
    title: string;
    subtitle: string;
  }>;
  completedSections: boolean[];
}

export const ProgressSidebar: React.FC<ProgressSidebarProps> = ({
  currentSection,
  totalSections,
  sections,
  completedSections
}) => {
  const progress = ((currentSection + 1) / totalSections) * 100;

  return (
    <div className="w-80 bg-gray-900 text-white p-8 flex flex-col min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-6">
        </div>
        
        <h1 className="text-3xl font-bold mb-2">AI Leader</h1>
        <h2 className="text-3xl font-bold mb-3">Mindmaker</h2>
        <p className="text-gray-400 text-lg">Diagnostic assessment</p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <span className="text-lg font-medium">Progress</span>
          <span className="text-lg font-medium">{currentSection + 1}/{totalSections}</span>
        </div>
        <Progress 
          value={progress} 
          className="h-3 bg-gray-800"
        />
      </div>

      {/* Steps */}
      <div className="flex-1 space-y-6">
        {sections.map((section, index) => {
          const isCompleted = completedSections[index];
          const isCurrent = index === currentSection;
          const isUpcoming = index > currentSection;

          return (
            <div 
              key={section.id}
              className={`flex items-center p-4 rounded-lg transition-all duration-300 ${
                isCurrent 
                  ? 'bg-primary/20 border border-primary/30' 
                  : isCompleted
                  ? 'bg-gray-800/50'
                  : 'bg-transparent'
              }`}
            >
              <div className="mr-4 flex-shrink-0">
                {isCompleted ? (
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                ) : isCurrent ? (
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                ) : (
                  <Circle className="w-6 h-6 text-gray-500" />
                )}
              </div>
              
              <div className="flex-1">
                <h3 className={`text-sm font-medium ${
                  isCurrent ? 'text-white' : isCompleted ? 'text-white' : 'text-gray-400'
                }`}>
                  {section.title}
                </h3>
                <p className={`text-xs ${
                  isCurrent ? 'text-primary-foreground/70' : isCompleted ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {section.subtitle}
                </p>
              </div>
              
              {isCurrent && (
                <div className="ml-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};