import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DiagnosticData } from '../DiagnosticTool';
import { SectionA } from './sections/SectionA';
import { SectionC } from './sections/SectionC';
import { SectionD } from './sections/SectionD';
import { SectionE } from './sections/SectionE';
import { SectionF } from './sections/SectionF';
import { ProgressSidebar } from './ProgressSidebar';

interface QuestionFlowProps {
  data: DiagnosticData;
  onDataUpdate: (data: Partial<DiagnosticData>) => void;
  onComplete: () => void;
}

const sections = [
  { id: 'A', title: 'Personal AI Effectiveness', subtitle: 'Time allocation, tools & decision-making', component: SectionA, required: ['deepWorkHours', 'meetingHours', 'adminHours', 'aiUseCases', 'aiTrustLevel'] },
  { id: 'B', title: 'Stakeholder Influence', subtitle: 'Communication reach', component: SectionC, required: ['stakeholderAudiences', 'persuasionChallenge'] },
  { id: 'C', title: 'Learning & Growth', subtitle: 'Skill development', component: SectionD, required: ['upskillPercentage', 'skillGaps'] },
  { id: 'D', title: 'Risk & Governance', subtitle: 'Risk assessment', component: SectionE, required: ['riskComfortLevel'] },
  { id: 'E', title: 'Priority Bottlenecks', subtitle: 'Your key challenges', component: SectionF, required: ['dailyFrictions'] },
];

export const QuestionFlow: React.FC<QuestionFlowProps> = ({ 
  data, 
  onDataUpdate, 
  onComplete 
}) => {
  const [currentSection, setCurrentSection] = useState(0);
  const progress = ((currentSection + 1) / sections.length) * 100;

  const isCurrentSectionComplete = () => {
    const section = sections[currentSection];
    console.log('Checking section completion for:', section.id, 'Required fields:', section.required);
    console.log('Current data:', data);
    
    return section.required.every(field => {
      const value = data[field as keyof typeof data];
      console.log(`Checking field ${field}:`, value);
      
      if (field === 'aiUseCases') {
        console.log('Validating aiUseCases:', value);
        if (!Array.isArray(value) || value.length === 0) {
          console.log('aiUseCases validation failed: empty or not array');
          return false;
        }
        // If "None" is selected, no tool validation needed
        const hasNone = (value as any[]).some(u => u.useCase.startsWith('None -'));
        console.log('Has None option:', hasNone);
        if (hasNone) return true;
        // Otherwise, all selected use cases must have tool names
        const allHaveTools = (value as any[]).every(u => u.tool && u.tool.trim() !== '');
        console.log('All use cases have tools:', allHaveTools);
        return allHaveTools;
      }
      if (field === 'stakeholderAudiences' || field === 'skillGaps' || field === 'dailyFrictions') {
        return Array.isArray(value) && value.length > 0;
      }
      if (field === 'persuasionChallenge') {
        return typeof value === 'string' && value.trim() !== '';
      }
      const isValid = value !== undefined && value !== null && value !== '';
      console.log(`Field ${field} validation result:`, isValid, 'value:', value);
      return isValid;
    });
  };

  const handleNext = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
      // Smooth scroll to top
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      // Smooth scroll to top
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    }
  };

  const CurrentSectionComponent = sections[currentSection].component;
  
  // Calculate completed sections
  const completedSections = sections.map((section, index) => {
    if (index < currentSection) {
      return section.required.every(field => {
        const value = data[field as keyof typeof data];
        if (field === 'aiUseCases') {
          if (!Array.isArray(value) || value.length === 0) return false;
          const hasNone = (value as any[]).some(u => u.useCase.startsWith('None -'));
          if (hasNone) return true;
          return (value as any[]).every(u => u.tool && u.tool.trim() !== '');
        }
        if (field === 'stakeholderAudiences' || field === 'skillGaps' || field === 'dailyFrictions') {
          return Array.isArray(value) && value.length > 0;
        }
        if (field === 'persuasionChallenge') {
          return typeof value === 'string' && value.trim() !== '';
        }
        return value !== undefined && value !== null && value !== '';
      });
    }
    return false;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar Layout - Hidden on mobile */}
      <div className="hidden md:flex">
        <ProgressSidebar 
          currentSection={currentSection}
          totalSections={sections.length}
          sections={sections}
          completedSections={completedSections}
        />
        <div className="flex-1">
          {/* Desktop Header with progress */}
          <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 py-6 border-b border-border/20">
            <div className="diagnostic-container">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-heading font-bold tracking-tight">
                  AI Leader Mindmaker
                </h1>
                <div className="text-sm text-muted-foreground">
                  Section {currentSection + 1} of {sections.length}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {sections[currentSection].title}
                  </span>
                  <span className="text-primary font-medium">
                    {Math.round(progress)}% Complete
                  </span>
                </div>
                <Progress 
                  value={progress} 
                  className="h-2 purple-glow"
                />
              </div>
            </div>
          </div>

          {/* Desktop Current section content */}
          <div className="py-8">
            <div className="diagnostic-container">
              <Card className="question-card">
                <div className="space-y-8">
                  <div className="text-center space-y-2">
                    <h2 className="text-3xl font-heading font-bold tracking-tight">
                      Section {sections[currentSection].id}: {sections[currentSection].title}
                    </h2>
                    <p className="text-muted-foreground">
                      Help us understand your current leadership patterns
                    </p>
                  </div>

                  <CurrentSectionComponent 
                    data={data}
                    onUpdate={onDataUpdate}
                  />
                </div>
              </Card>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm py-6 border-t border-border/20">
            <div className="diagnostic-container">
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentSection === 0}
                  className="px-8 py-3"
                >
                  Previous
                </Button>

                <div className="flex space-x-2">
                  {sections.map((_, index) => (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        index <= currentSection 
                          ? 'bg-primary purple-glow' 
                          : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>

                <Button
                  onClick={handleNext}
                  disabled={!isCurrentSectionComplete()}
                  className="btn-primary px-8 py-3"
                >
                  {currentSection === sections.length - 1 ? 'Get Results' : 'Next'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout - Full width, only visible on mobile */}
      <div className="md:hidden w-full">
        {/* Mobile Header with progress */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-20 px-4 py-3 border-b border-border/20">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-heading font-bold tracking-tight">
                AI Leader Mindmaker
              </h1>
              <div className="text-xs text-muted-foreground">
                {currentSection + 1}/{sections.length}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground truncate">
                  {sections[currentSection].title}
                </span>
                <span className="text-primary font-medium ml-2">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress 
                value={progress} 
                className="h-1.5 purple-glow"
              />
            </div>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="px-4 py-4 pb-28">
          <Card className="question-card border-0 bg-card/30 p-4">
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-heading font-bold tracking-tight">
                  Section {sections[currentSection].id}: {sections[currentSection].title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Help us understand your current leadership patterns
                </p>
              </div>

              <CurrentSectionComponent 
                data={data}
                onUpdate={onDataUpdate}
              />
            </div>
          </Card>
        </div>

        {/* Mobile Navigation - Fixed bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm px-4 py-4 border-t border-border/20 z-20">
          <div className="space-y-3">
            {/* Progress dots */}
            <div className="flex justify-center space-x-1.5">
              {sections.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index <= currentSection 
                      ? 'bg-primary purple-glow' 
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            
            {/* Navigation buttons */}
            <div className="flex justify-between items-center gap-3">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentSection === 0}
                className="flex-1 py-3 text-sm min-h-[44px] font-medium"
              >
                Previous
              </Button>

              <Button
                onClick={handleNext}
                disabled={!isCurrentSectionComplete()}
                className="btn-primary flex-1 py-3 text-sm min-h-[44px] font-medium"
              >
                {currentSection === sections.length - 1 ? 'Get Results' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
