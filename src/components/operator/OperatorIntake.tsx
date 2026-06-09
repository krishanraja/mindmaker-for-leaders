import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VoiceInput } from '@/components/ui/voice-input';
import { ArrowRight, ArrowLeft, Check, Mic, Plus, X, Briefcase, Brain, Loader2, Zap, Target, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DualPercentageSlider } from './DualPercentageSlider';
import { VoiceFirstInput } from './VoiceFirstInput';
import { ToolCheckboxGrid } from './ToolCheckboxGrid';
import { haptic } from '@/utils/haptic';

export interface BusinessLine {
  name: string;
  revenuePercentage: number;
  timePercentage: number;
  painPoints: string[];
}

export interface OperatorIntakeData {
  businessLines: BusinessLine[];
  inboxCount: number;
  technicalComfort: number;
  monthlyBudget: string;
  topPainPoints: string[];
  toolsTried: string[];
  decisionsStuckOn: string[];
  failedLeadMagnets: string[];
}

interface OperatorIntakeProps {
  onComplete: () => void;
  onBack?: () => void;
}

export const OperatorIntake: React.FC<OperatorIntakeProps> = ({ onComplete, onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  
  const [intakeData, setIntakeData] = useState<OperatorIntakeData>({
    businessLines: [],
    inboxCount: 1,
    technicalComfort: 3,
    monthlyBudget: '$0',
    topPainPoints: [],
    toolsTried: [],
    decisionsStuckOn: [],
    failedLeadMagnets: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [newBusinessLine, setNewBusinessLine] = useState({ name: '', revenuePercentage: 50, timePercentage: 50, painPoints: [] as string[] });
  const [voiceInputForTools, setVoiceInputForTools] = useState('');
  const [voiceInputForDecisions, setVoiceInputForDecisions] = useState('');

  const commonBusinessTypes = [
    'Life Coaching',
    'Brand Partnerships',
    'Consulting',
    'Online Courses',
    'Group Coaching',
    'Agency Services',
    'E-commerce',
    'SaaS',
    'Affiliate Marketing',
    'Digital Products'
  ];

  const handleNext = async () => {
    haptic.double();
    if (currentStep >= totalSteps) {
      await handleSubmit();
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    haptic.light();
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Create anonymous session if needed
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
          if (anonError) {
            console.error('Error creating anonymous session:', anonError);
            throw new Error(`Authentication failed: ${anonError.message}`);
          }
          if (!anonData.user) throw new Error('Failed to create anonymous session');
        }
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('No user session available');

      // Create operator profile
      const { data: profile, error: profileError } = await supabase
        .from('operator_profiles')
        .insert({
          user_id: currentUser.id,
          business_lines: intakeData.businessLines,
          inbox_count: intakeData.inboxCount,
          technical_comfort: intakeData.technicalComfort,
          monthly_budget: intakeData.monthlyBudget,
          top_pain_points: intakeData.topPainPoints,
          decision_stuck_on: intakeData.decisionsStuckOn,
          tools_tried: intakeData.toolsTried,
          failed_lead_magnets: intakeData.failedLeadMagnets
        })
        .select()
        .single();

      if (profileError) {
        console.error('Database error creating operator profile:', profileError);
        throw new Error(`Failed to save profile: ${profileError.message}`);
      }

      if (!profile) {
        throw new Error('Profile created but no data returned');
      }

      onComplete();
    } catch (error) {
      console.error('Error creating operator profile:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to save your profile. Please try again.';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addBusinessLine = () => {
    if (newBusinessLine.name.trim() && newBusinessLine.revenuePercentage + newBusinessLine.timePercentage === 100) {
      haptic.double();
      setIntakeData(prev => ({
        ...prev,
        businessLines: [...prev.businessLines, { ...newBusinessLine }]
      }));
      setNewBusinessLine({ name: '', revenuePercentage: 50, timePercentage: 50, painPoints: [] });
    }
  };

  const removeBusinessLine = (index: number) => {
    haptic.light();
    setIntakeData(prev => ({
      ...prev,
      businessLines: prev.businessLines.filter((_, i) => i !== index)
    }));
  };

  const commonPainPoints = [
    'Email overwhelm',
    'Lead qualification',
    'Appointment booking',
    'Content creation',
    'Client onboarding',
    'Social media management',
    'Invoice/payment tracking',
    'Customer support'
  ];

  const renderQuestion = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <Brain className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span className="text-[10px] font-medium text-primary">Learning about your business</span>
            </div>
            <h3 className="text-base font-semibold text-foreground shrink-0">
              What are your revenue streams?
            </h3>
            <p className="text-xs text-muted-foreground shrink-0 leading-tight">
              List all the ways you make money. Each answer helps me understand your unique business mix.
            </p>

            {/* Existing business lines - compact grid */}
            {intakeData.businessLines.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5">
                {intakeData.businessLines.map((line, index) => (
                  <Card key={index} className="p-1.5 relative">
                    <div className="pr-6">
                      <div className="font-medium text-xs text-foreground truncate mb-0.5">{line.name}</div>
                      <div className="text-[9px] text-muted-foreground">
                        {line.revenuePercentage}% rev • {line.timePercentage}% time
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBusinessLine(index)}
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}

            {/* Add new business line */}
            <Card className="p-3 border-dashed shrink-0">
              <div className="space-y-3">
                {/* Business Line Name - Voice First */}
                <div>
                  <VoiceFirstInput
                    value={newBusinessLine.name}
                    onValueChange={(value) => setNewBusinessLine(prev => ({ ...prev, name: value }))}
                    placeholder="Say your business line name"
                    label="Business line name"
                    showTextFallback={true}
                  />
                  
                  {/* Quick-select chips - compact grid */}
                  <div className="mt-2">
                    <p className="text-[10px] text-muted-foreground mb-1.5">Or choose:</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {commonBusinessTypes.slice(0, 6).map(type => (
                        <Button
                          key={type}
                          type="button"
                          variant={newBusinessLine.name === type ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            haptic.light();
                            setNewBusinessLine(prev => ({ ...prev, name: type }));
                          }}
                          className="h-8 text-[10px] px-2"
                        >
                          {type}
                        </Button>
                      ))}
                    </div>
                    {commonBusinessTypes.length > 6 && (
                      <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                        {commonBusinessTypes.slice(6).map(type => (
                          <Button
                            key={type}
                            type="button"
                            variant={newBusinessLine.name === type ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              haptic.light();
                              setNewBusinessLine(prev => ({ ...prev, name: type }));
                            }}
                            className="h-8 text-[10px] px-2"
                          >
                            {type}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Revenue & Time Percentages - Dual Slider */}
                {newBusinessLine.name && (
                  <div>
                    <DualPercentageSlider
                      revenuePercentage={newBusinessLine.revenuePercentage}
                      timePercentage={newBusinessLine.timePercentage}
                      onRevenueChange={(value) => setNewBusinessLine(prev => ({ ...prev, revenuePercentage: value }))}
                      onTimeChange={(value) => setNewBusinessLine(prev => ({ ...prev, timePercentage: value }))}
                    />
                  </div>
                )}

                {/* Add Button */}
                <Button
                  variant="cta"
                  size="sm"
                  onClick={addBusinessLine}
                  disabled={!newBusinessLine.name.trim() || newBusinessLine.revenuePercentage + newBusinessLine.timePercentage !== 100}
                  className="w-full h-10 rounded-xl"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add business line
                </Button>
              </div>
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            <div className="flex items-center gap-1.5 shrink-0">
              <Zap className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span className="text-[10px] font-medium text-primary">Personalizing your experience</span>
            </div>
            <h3 className="text-base font-semibold text-foreground shrink-0">
              Tell us about your setup
            </h3>
            
            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div>
                <Label className="text-sm">How many email inboxes?</Label>
                <div className="mt-1.5">
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={[intakeData.inboxCount]}
                    onValueChange={(value) => {
                      haptic.medium();
                      setIntakeData(prev => ({ ...prev, inboxCount: value[0] }));
                    }}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>1</span>
                    <span className="font-medium text-foreground text-xs">{intakeData.inboxCount} inboxes</span>
                    <span>10+</span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm">Technical comfort level</Label>
                <p className="text-[10px] text-muted-foreground mb-1.5 leading-tight">
                  How comfortable connecting tools and building automations?
                </p>
                <div className="mt-1.5">
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={[intakeData.technicalComfort]}
                    onValueChange={(value) => {
                      haptic.medium();
                      setIntakeData(prev => ({ ...prev, technicalComfort: value[0] }));
                    }}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span className="text-[9px]">Not technical</span>
                    <span className="font-medium text-foreground text-xs">
                      {intakeData.technicalComfort === 1 ? 'Not technical' :
                       intakeData.technicalComfort === 2 ? 'A little' :
                       intakeData.technicalComfort === 3 ? 'Moderate' :
                       intakeData.technicalComfort === 4 ? 'Comfortable' :
                       'Very technical'}
                    </span>
                    <span className="text-[9px]">Very technical</span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm">Monthly budget for AI tools</Label>
                <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                  {['$0', '$50', '$100', '$200+'].map(budget => (
                    <Button
                      key={budget}
                      variant={intakeData.monthlyBudget === budget ? 'default' : 'outline'}
                      onClick={() => {
                        haptic.light();
                        setIntakeData(prev => ({ ...prev, monthlyBudget: budget }));
                      }}
                      className="w-full h-10 text-xs"
                    >
                      {budget}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <Target className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span className="text-[10px] font-medium text-primary">Identifying your priorities</span>
            </div>
            <div className="flex items-center justify-between shrink-0">
              <Badge variant="secondary" className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/20 px-1.5 py-0.5">
                Select top 3
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {intakeData.topPainPoints.length}/3 selected
              </span>
            </div>
            <h3 className="text-base font-semibold text-foreground shrink-0">
              What are your biggest bottlenecks?
            </h3>
            <p className="text-xs text-muted-foreground shrink-0 leading-tight mb-1">
              Select your top 3 pain points. I'll prioritize decisions for your business.
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {commonPainPoints.map(point => (
                <Button
                  key={point}
                  variant={intakeData.topPainPoints.includes(point) ? 'default' : 'outline'}
                  className="w-full justify-start h-9 text-xs px-2"
                  onClick={() => {
                    haptic.light();
                    if (intakeData.topPainPoints.includes(point)) {
                      setIntakeData(prev => ({
                        ...prev,
                        topPainPoints: prev.topPainPoints.filter(p => p !== point)
                      }));
                    } else if (intakeData.topPainPoints.length < 3) {
                      setIntakeData(prev => ({
                        ...prev,
                        topPainPoints: [...prev.topPainPoints, point]
                      }));
                    }
                  }}
                  disabled={!intakeData.topPainPoints.includes(point) && intakeData.topPainPoints.length >= 3}
                >
                  {intakeData.topPainPoints.includes(point) && (
                    <Check className="h-3 w-3 mr-1" />
                  )}
                  <span className="truncate">{point}</span>
                </Button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            <h3 className="text-base font-semibold text-foreground shrink-0">
              What AI tools have you tried?
            </h3>
            <p className="text-xs text-muted-foreground shrink-0 leading-tight">
              Select tools you've experimented with (optional)
            </p>

            {/* Checkbox Grid */}
            <div className="flex-1 min-h-0 flex flex-col">
              <ToolCheckboxGrid
                selectedTools={intakeData.toolsTried}
                onToolsChange={(tools) => setIntakeData(prev => ({ ...prev, toolsTried: tools }))}
                className="mb-2"
              />
            </div>

            {/* Voice Input for Other Tools */}
            <div className="shrink-0">
              <VoiceFirstInput
                value={voiceInputForTools}
                onValueChange={(transcript) => {
                  setVoiceInputForTools(transcript);
                }}
                placeholder="Or say other tools"
                label="Other tools"
                showTextFallback={true}
              />
              {voiceInputForTools && (
                <div className="mt-2 flex gap-1.5">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => {
                      haptic.double();
                      const toolNames = voiceInputForTools
                        .split(/[,\n]/)
                        .map(t => t.trim())
                        .filter(t => t.length > 0);
                      
                      if (toolNames.length > 0) {
                        setIntakeData(prev => ({
                          ...prev,
                          toolsTried: [...new Set([...prev.toolsTried, ...toolNames])]
                        }));
                        setVoiceInputForTools('');
                      }
                    }}
                    className="h-9 text-xs flex-1"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      haptic.light();
                      setVoiceInputForTools('');
                    }}
                    className="h-9 text-xs"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>

            {/* Selected Tools Display */}
            {intakeData.toolsTried.length > 0 && (
              <div className="shrink-0">
                <p className="text-[10px] text-muted-foreground mb-1">Selected ({intakeData.toolsTried.length}):</p>
                <div className="flex flex-wrap gap-1 max-h-12 overflow-hidden">
                  {intakeData.toolsTried.slice(0, 8).map(tool => (
                    <Badge
                      key={tool}
                      variant="secondary"
                      className="px-1.5 py-0.5 text-[9px]"
                    >
                      {tool}
                    </Badge>
                  ))}
                  {intakeData.toolsTried.length > 8 && (
                    <Badge variant="secondary" className="px-1.5 py-0.5 text-[9px]">
                      +{intakeData.toolsTried.length - 8}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 5: {
        const exampleQuestions = [
          "Should I get ChatGPT Pro or Business?",
          "Should I use Zapier or Make?",
          "Build my own tool or use SaaS?",
          "Focus on automation or content?"
        ];

        return (
          <div className="flex-1 flex flex-col min-h-0 space-y-2">
            <h3 className="text-base font-semibold text-foreground shrink-0">
              What decisions are you stuck on?
            </h3>
            <p className="text-xs text-muted-foreground shrink-0 leading-tight">
              Tell us about any "should I do X or Y" questions (optional)
            </p>
            
            {/* Smart Suggestions - compact */}
            <div className="shrink-0">
              <p className="text-[10px] text-muted-foreground mb-1.5">Quick examples:</p>
              <div className="grid grid-cols-2 gap-1.5">
                {exampleQuestions.map((question, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left h-10 text-xs px-2"
                    onClick={() => {
                      haptic.light();
                      setIntakeData(prev => ({
                        ...prev,
                        decisionsStuckOn: [...prev.decisionsStuckOn, question]
                      }));
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    <span className="truncate">{question}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Voice Input for Decisions */}
            <div className="shrink-0">
              <VoiceFirstInput
                value={voiceInputForDecisions}
                onValueChange={(transcript) => {
                  setVoiceInputForDecisions(transcript);
                }}
                placeholder="Say your decision questions"
                label="Your decision questions"
                showTextFallback={true}
              />
              {voiceInputForDecisions && (
                <div className="mt-2 flex gap-1.5">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => {
                      haptic.double();
                      const questions = voiceInputForDecisions
                        .split(/[.\n]/)
                        .map(q => q.trim())
                        .filter(q => q.length > 0 && q.length > 10);
                      
                      if (questions.length > 0) {
                        setIntakeData(prev => ({
                          ...prev,
                          decisionsStuckOn: [...prev.decisionsStuckOn, ...questions]
                        }));
                        setVoiceInputForDecisions('');
                      } else {
                        setIntakeData(prev => ({
                          ...prev,
                          decisionsStuckOn: [...prev.decisionsStuckOn, voiceInputForDecisions]
                        }));
                        setVoiceInputForDecisions('');
                      }
                    }}
                    className="h-9 text-xs flex-1"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      haptic.light();
                      setVoiceInputForDecisions('');
                    }}
                    className="h-9 text-xs"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>

            {/* Display Selected Questions - compact grid */}
            {intakeData.decisionsStuckOn.length > 0 && (
              <div className="shrink-0">
                <Label className="text-xs font-medium mb-1">Your questions:</Label>
                <div className="grid grid-cols-1 gap-1.5">
                  {intakeData.decisionsStuckOn.map((question, index) => (
                    <Card key={index} className="p-1.5 relative">
                      <div className="pr-6">
                        <p className="text-xs text-foreground leading-tight line-clamp-2">{question}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          haptic.light();
                          setIntakeData(prev => ({
                            ...prev,
                            decisionsStuckOn: prev.decisionsStuckOn.filter((_, i) => i !== index)
                          }));
                        }}
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Failed Lead Magnets */}
            <div className="shrink-0 pt-2 border-t">
              <Label className="text-xs font-medium mb-1 block">Failed lead magnets/workflows</Label>
              <p className="text-[10px] text-muted-foreground mb-2 leading-tight">
                Any free workflows or templates that didn't work? (optional)
              </p>
              <VoiceFirstInput
                value={intakeData.failedLeadMagnets.join('\n')}
                onValueChange={(transcript) => {
                  const items = transcript
                    .split(/[,\n]/)
                    .map(item => item.trim())
                    .filter(item => item.length > 0);
                  
                  setIntakeData(prev => ({
                    ...prev,
                    failedLeadMagnets: items.length > 0 ? items : []
                  }));
                }}
                placeholder="Say what didn't work"
                showTextFallback={true}
              />
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return intakeData.businessLines.length > 0;
      case 2: return true; // Always allow
      case 3: return intakeData.topPainPoints.length === 3;
      case 4: return true; // Optional
      case 5: return true; // Optional
      default: return true;
    }
  };

  return (
    <div className="bg-background h-[var(--mobile-vh)] overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col px-3 sm:px-4 lg:px-6 pt-safe-top pb-safe-bottom overflow-hidden">
        {/* Brand Header + Progress */}
        <div className="max-w-2xl mx-auto w-full shrink-0 py-1.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-foreground">Operator Setup</span>
                {currentStep > 1 && (
                  <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20 px-1 py-0">
                    <Brain className="h-2.5 w-2.5 mr-0.5" />
                    Learning
                  </Badge>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">Step {currentStep}/{totalSteps}</span>
            </div>
          
          <Card className="shadow-sm border rounded-xl">
            <CardContent className="p-1.5">
              <Progress value={(currentStep / totalSteps) * 100} className="h-1" />
            </CardContent>
          </Card>
        </div>

        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col min-h-0 overflow-hidden">
          <Card className="shadow-sm border rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardContent className="p-3 flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 flex flex-col min-h-0">
                {renderQuestion()}
              </div>

              {submitError && (
                <Alert variant="destructive" className="mb-2 mt-1.5 shrink-0">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <AlertDescription className="flex items-center justify-between text-xs">
                    <span>{submitError}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSubmitError(null)}
                      className="h-6 px-1.5 ml-1.5"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-2 border-t shrink-0 mt-1.5 bg-card">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="rounded-xl text-xs h-10 min-w-[44px]"
                  size="sm"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Back
                </Button>
                <Button
                  variant="cta"
                  onClick={handleNext}
                  disabled={!canProceed() || isSubmitting}
                  className="flex-1 rounded-xl text-xs h-10 group"
                  size="sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Preparing...
                    </>
                  ) : currentStep === totalSteps ? (
                    <>
                      Complete Setup
                      <ArrowRight className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-1" />
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
