import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Brain, ArrowRight, ArrowLeft } from 'lucide-react';

export interface DeepProfileData {
  thinkingProcess: string;
  communicationStyle: string[];
  workBreakdown: {
    writing: number;
    presentations: number;
    planning: number;
    decisions: number;
    coaching: number;
  };
  informationNeeds: string[];
  transformationGoal: string;
  timeWaste: number;
  timeWasteExamples: string;
  delegateTasks: string[];
  biggestChallenge: string;
  stakeholders: string[];
}

interface DeepProfileQuestionnaireProps {
  onComplete: (data: DeepProfileData) => void;
  onBack?: () => void;
}

export const DeepProfileQuestionnaire: React.FC<DeepProfileQuestionnaireProps> = ({ onComplete, onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 10;
  
  const [profileData, setProfileData] = useState<DeepProfileData>({
    thinkingProcess: '',
    communicationStyle: [],
    workBreakdown: {
      writing: 20,
      presentations: 20,
      planning: 20,
      decisions: 20,
      coaching: 20
    },
    informationNeeds: [],
    transformationGoal: '',
    timeWaste: 30,
    timeWasteExamples: '',
    delegateTasks: [],
    biggestChallenge: '',
    stakeholders: []
  });

  const handleNext = () => {
    console.log('handleNext called - currentStep:', currentStep, 'totalSteps:', totalSteps);
    
    if (currentStep === totalSteps) {
      console.log('Completing questionnaire with data:', profileData);
      onComplete(profileData);
    } else if (currentStep < totalSteps) {
      console.log('Moving to next step:', currentStep + 1);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const updateWorkBreakdown = (field: keyof typeof profileData.workBreakdown, value: number) => {
    const otherFields = Object.keys(profileData.workBreakdown).filter(k => k !== field) as (keyof typeof profileData.workBreakdown)[];
    const remaining = 100 - value;
    const currentOtherTotal = otherFields.reduce((sum, key) => sum + profileData.workBreakdown[key], 0);
    
    const newBreakdown = { ...profileData.workBreakdown, [field]: value };
    
    if (currentOtherTotal > 0) {
      otherFields.forEach(key => {
        const proportion = profileData.workBreakdown[key] / currentOtherTotal;
        newBreakdown[key] = Math.round(remaining * proportion);
      });
    } else {
      const equalShare = Math.round(remaining / otherFields.length);
      otherFields.forEach(key => {
        newBreakdown[key] = equalShare;
      });
    }
    
    setProfileData(prev => ({
      ...prev,
      workBreakdown: newBreakdown
    }));
  };

  const toggleArrayOption = (field: 'communicationStyle' | 'informationNeeds' | 'delegateTasks' | 'stakeholders', value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const renderQuestion = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              How do you think through complex problems?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Understanding your thinking style helps us create prompts that match your natural workflow.
            </p>
            <div className="space-y-3">
              {[
                { value: 'verbal', label: 'I think out loud and benefit from talking through ideas' },
                { value: 'internal', label: 'I process internally first, then share structured thoughts' },
                { value: 'written', label: 'I need to write things down to organize my thinking' },
                { value: 'visual', label: 'I prefer visual frameworks and diagrams' },
                { value: 'pattern', label: 'I jump between multiple ideas and connect patterns' }
              ].map(option => (
                <Button
                  key={option.value}
                  variant={profileData.thinkingProcess === option.value ? 'default' : 'outline'}
                  className="w-full min-h-[44px] h-auto text-left justify-start rounded-xl py-3 px-4 whitespace-normal"
                  onClick={() => {
                    setProfileData(prev => ({ ...prev, thinkingProcess: option.value }));
                    console.log('Question 1 answered, auto-advancing in 800ms');
                    setTimeout(() => handleNext(), 800);
                  }}
                >
                  <span className="text-sm sm:text-base leading-snug">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              How would your team describe your communication style?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select all that apply. This helps us match your tone and structure.
            </p>
            <div className="space-y-3">
              {[
                'Direct and concise',
                'Detail-oriented and thorough',
                'Story-driven and contextual',
                'Data-focused and analytical',
                'Inspirational and big-picture'
              ].map(option => (
                <Button
                  key={option}
                  variant={profileData.communicationStyle.includes(option) ? 'default' : 'outline'}
                  className="w-full min-h-[44px] h-auto text-left justify-start rounded-xl py-3 px-4 whitespace-normal"
                  onClick={() => toggleArrayOption('communicationStyle', option)}
                >
                  <span className="text-sm sm:text-base leading-snug">{option}</span>
                </Button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              How do you spend your work time?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Adjust the sliders to reflect your typical work breakdown. Total should equal 100%.
            </p>
            <div className="space-y-4">
              {Object.entries({
                writing: 'Writing emails/messages',
                presentations: 'Creating presentations/reports',
                planning: 'Strategic planning/analysis',
                decisions: 'Decision-making/problem-solving',
                coaching: 'Team coaching/feedback'
              }).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <Label>{label}</Label>
                    <span className="text-primary font-medium">{profileData.workBreakdown[key as keyof typeof profileData.workBreakdown]}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={profileData.workBreakdown[key as keyof typeof profileData.workBreakdown]}
                    onChange={(e) => updateWorkBreakdown(key as keyof typeof profileData.workBreakdown, parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              ))}
              <div className={`text-sm font-medium mt-4 ${
                Object.values(profileData.workBreakdown).reduce((a, b) => a + b, 0) === 100 
                  ? 'text-green-600' 
                  : 'text-orange-600'
              }`}>
                Total: {Object.values(profileData.workBreakdown).reduce((a, b) => a + b, 0)}%
                {Object.values(profileData.workBreakdown).reduce((a, b) => a + b, 0) === 100 && ' ✓'}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              What information do you typically need for important decisions?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select all that apply. This determines what context to include in your prompts.
            </p>
            <div className="space-y-3">
              {[
                'Market data and competitive intelligence',
                'Financial models and ROI analysis',
                'Team input and diverse perspectives',
                'Industry trends and case studies',
                'Historical performance and patterns'
              ].map(option => (
                <Button
                  key={option}
                  variant={profileData.informationNeeds.includes(option) ? 'default' : 'outline'}
                  className="w-full min-h-[44px] h-auto text-left justify-start rounded-xl py-3 px-4 whitespace-normal"
                  onClick={() => toggleArrayOption('informationNeeds', option)}
                >
                  <span className="text-sm sm:text-base leading-snug">{option}</span>
                </Button>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              What transformation do you most need from AI?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Choose the statement that resonates most with your current situation.
            </p>
            <div className="space-y-3">
              {[
                { value: 'focus', label: 'I have too many ideas and need help focusing' },
                { value: 'articulate', label: 'I know what needs doing but struggle to articulate it' },
                { value: 'speed', label: 'I need to process information faster' },
                { value: 'quality', label: 'I want to elevate the quality of my thinking' },
                { value: 'communicate', label: 'I need to communicate more effectively with different audiences' }
              ].map(option => (
                <Button
                  key={option.value}
                  variant={profileData.transformationGoal === option.value ? 'default' : 'outline'}
                  className="w-full min-h-[44px] h-auto text-left justify-start rounded-xl py-3 px-4 whitespace-normal"
                  onClick={() => {
                    setProfileData(prev => ({ ...prev, transformationGoal: option.value }));
                    console.log('Question 5 answered, auto-advancing in 800ms');
                    setTimeout(() => handleNext(), 800);
                  }}
                >
                  <span className="text-sm sm:text-base leading-snug">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              What percentage of your time is spent on work that doesn't require YOUR unique expertise?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Be honest - this helps us identify where AI can create the most value.
            </p>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <Label>Time on non-critical tasks</Label>
                <span className="text-primary font-medium">{profileData.timeWaste}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={profileData.timeWaste}
                onChange={(e) => setProfileData(prev => ({ ...prev, timeWaste: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Describe 1-2 specific tasks that felt like a waste of your time recently
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Be specific - this helps us create targeted AI workflows for you.
            </p>
            <Textarea
              value={profileData.timeWasteExamples}
              onChange={(e) => setProfileData(prev => ({ ...prev, timeWasteExamples: e.target.value }))}
              placeholder="Example: Spent 3 hours reformatting a deck for different audiences, manually summarizing meeting notes..."
              className="min-h-[120px] rounded-xl"
            />
          </div>
        );

      case 8:
        return (
          <div className="space-y-4">
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  Select exactly 3 priorities
                </h3>
                <div className="flex gap-2">
                  {[1, 2, 3].map(num => (
                    <div 
                      key={num}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        profileData.delegateTasks.length >= num 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {num}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {profileData.delegateTasks.length}/3 selected
                {profileData.delegateTasks.length === 3 && ' ✓ Click Next to continue'}
              </p>
            </div>
            <h4 className="text-lg font-semibold text-foreground">
              If you could delegate 3 types of work to AI, what would they be?
            </h4>
            <div className="space-y-3">
              {[
                'Drafting initial content (emails, reports, proposals)',
                'Research and information synthesis',
                'Meeting preparation and follow-up',
                'Strategic analysis and scenario planning',
                'Communication with different stakeholders',
                'Decision documentation and rationale',
                'Presentation creation and refinement',
                'Coaching conversations and feedback'
              ].map(option => (
                <Button
                  key={option}
                  variant={profileData.delegateTasks.includes(option) ? 'default' : 'outline'}
                  className="w-full min-h-[44px] h-auto text-left justify-start rounded-xl py-3 px-4 whitespace-normal"
                  onClick={() => {
                    if (profileData.delegateTasks.includes(option) || profileData.delegateTasks.length < 3) {
                      toggleArrayOption('delegateTasks', option);
                    }
                  }}
                  disabled={!profileData.delegateTasks.includes(option) && profileData.delegateTasks.length >= 3}
                  title={!profileData.delegateTasks.includes(option) && profileData.delegateTasks.length >= 3 ? "Unselect one to choose this option" : ""}
                >
                  <span className="text-sm sm:text-base leading-snug">{option}</span>
                </Button>
              ))}
            </div>
          </div>
        );

      case 9:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              What's your biggest communication challenge?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              This helps us design AI prompts that strengthen your weakest areas.
            </p>
            <div className="space-y-3">
              {[
                { value: 'simplify', label: 'Explaining complex concepts simply' },
                { value: 'tailor', label: 'Tailoring messages for different audiences' },
                { value: 'tone', label: 'Maintaining consistent tone across communications' },
                { value: 'structure', label: 'Structuring thoughts coherently under pressure' },
                { value: 'brevity', label: 'Balancing detail with brevity' },
                { value: 'persuade', label: 'Persuading skeptics or managing resistance' }
              ].map(option => (
                <Button
                  key={option.value}
                  variant={profileData.biggestChallenge === option.value ? 'default' : 'outline'}
                  className="w-full min-h-[44px] h-auto text-left justify-start rounded-xl py-3 px-4 whitespace-normal"
                  onClick={() => {
                    setProfileData(prev => ({ ...prev, biggestChallenge: option.value }));
                    console.log('Question 9 answered, auto-advancing in 800ms');
                    setTimeout(() => handleNext(), 800);
                  }}
                >
                  <span className="text-sm sm:text-base leading-snug">{option.label}</span>
                </Button>
              ))}
            </div>
          </div>
        );

      case 10:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Who are the key audiences you regularly communicate with?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select all that apply. We'll create audience-specific project templates.
            </p>
            <div className="space-y-3">
              {[
                'Board / Investors',
                'Executive team / C-suite peers',
                'Direct reports / Team',
                'Cross-functional partners',
                'Customers / External stakeholders',
                'Industry peers / Partners'
              ].map(option => (
                <Button
                  key={option}
                  variant={profileData.stakeholders.includes(option) ? 'default' : 'outline'}
                  className="w-full min-h-[44px] h-auto text-left justify-start rounded-xl py-3 px-4 whitespace-normal"
                  onClick={() => toggleArrayOption('stakeholders', option)}
                >
                  <span className="text-sm sm:text-base leading-snug">{option}</span>
                </Button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!profileData.thinkingProcess;
      case 2: return profileData.communicationStyle.length > 0;
      case 3: {
        const total = Object.values(profileData.workBreakdown).reduce((a, b) => a + b, 0);
        return total >= 95 && total <= 105;
      }
      case 4: return profileData.informationNeeds.length > 0;
      case 5: return !!profileData.transformationGoal;
      case 6: return true; // Always allow
      case 7: return profileData.timeWasteExamples.trim().length > 10;
      case 8: return profileData.delegateTasks.length === 3;
      case 9: return !!profileData.biggestChallenge;
      case 10: return profileData.stakeholders.length > 0;
      default: return true;
    }
  };

  return (
    <div className="bg-background min-h-screen relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-6 sm:py-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 pt-12 sm:pt-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm mb-6">
            <Brain className="h-4 w-4" />
            Unlock Your Personal AI Command Center
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4 leading-tight">
            Deep Profile
          </h1>
          
          <p className="text-sm sm:text-base text-muted-foreground max-w-md sm:max-w-2xl mx-auto leading-relaxed">
            Answer 10 questions to receive custom ChatGPT/Claude project instructions tailored to your thinking style
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <Card className="mb-6 shadow-sm border rounded-xl">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">Question {currentStep} of {totalSteps}</span>
                <span className="text-sm text-muted-foreground">{Math.round((currentStep / totalSteps) * 100)}%</span>
              </div>
              <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
            </CardContent>
          </Card>

          {/* Question Card */}
          <Card className="shadow-sm border rounded-xl">
            <CardContent className="p-6 sm:p-8">
              {renderQuestion()}

              {/* Navigation */}
              <div className="flex gap-3 mt-8 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="rounded-xl"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  variant="cta"
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex-1 rounded-xl text-sm sm:text-base"
                >
                  {currentStep === totalSteps ? (
                    <>
                      <span className="hidden sm:inline">Generate My AI Toolkit</span>
                      <span className="sm:hidden">Generate Toolkit</span>
                    </>
                  ) : (
                    'Next'
                  )}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};