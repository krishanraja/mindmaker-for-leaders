import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Brain, User, ArrowRight, Clock, Target, Lightbulb, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { DiagnosticData, DiagnosticScores, AIUseCase } from './DiagnosticTool';
import { generatePersonalizedQuickWins } from '@/utils/personalAIQuickWins';
import { useExecutiveInsights } from '@/hooks/useExecutiveInsights';
import { useLeadQualification } from '@/hooks/useLeadQualification';
import ExecutiveLoadingScreen from './ai-chat/ExecutiveLoadingScreen';
import ContactCollectionModal from './ContactCollectionModal';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: Partial<DiagnosticData>;
}

interface RichConversationalAssessmentProps {
  onComplete?: (sessionData: any) => void;
}

const RichConversationalAssessment: React.FC<RichConversationalAssessmentProps> = ({ onComplete }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentPhase, setCurrentPhase] = useState<'intro' | 'time-ai' | 'communication-skills' | 'decision-ethics' | 'bottlenecks' | 'insights' | 'results'>('intro');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData>({});
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insightProgress, setInsightProgress] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactActionType, setContactActionType] = useState<'learn_more' | 'book_call'>('book_call');
  const [customUseCase, setCustomUseCase] = useState('');
  const [customSkillGap, setCustomSkillGap] = useState('');
  const [customBottleneck, setCustomBottleneck] = useState('');
  const { toast } = useToast();
  
  const { generateExecutiveInsights, insights, assessmentData } = useExecutiveInsights();
  const { calculateLeadScore, leadScore } = useLeadQualification();

  const aiUseCases = [
    'Writing & analysis', 'Quick research', 'Deep thinking & research',
    'Note-taking & organization', 'Writing enhancement', 'Meeting transcription',
    'Visual creation', 'Code assistance', 'Email drafting', 'Data analysis'
  ];

  const communicationAudiences = [
    'Board members', 'Investors', 'Direct reports', 'Peers',
    'Customers', 'Industry experts', 'Media', 'Partners'
  ];

  const skillGaps = [
    'Advanced prompt engineering and AI conversation',
    'Building custom AI workflows and automations',
    'Using AI for strategic thinking and analysis',
    'AI-powered content creation and writing',
    'AI data analysis and visualization',
    'Leading AI transformation initiatives'
  ];

  const personalBottlenecks = [
    'Writing and content creation taking too long',
    'Information research and synthesis',
    'Decision-making with incomplete information',
    'Preparing presentations and reports',
    'Managing email and communications',
    'Staying current with industry trends',
    'Creative problem-solving and ideation',
    'Time management and prioritization'
  ];

  useEffect(() => {
    initializeAssessment();
  }, []);

  const initializeAssessment = async () => {
    try {
      const { data: session, error } = await supabase
        .from('conversation_sessions')
        .insert({
          user_id: null,
          session_title: 'Rich AI Leadership Assessment',
          status: 'active',
          business_context: {}
        })
        .select()
        .single();

      if (error) throw error;
      setSessionId(session.id);

      const welcomeMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Welcome to your personalized AI Leadership Assessment. I'm here to understand your unique situation and create actionable insights just for you.\n\nThis isn't a generic quiz - we'll explore your actual time allocation, specific AI tools, communication challenges, and personal bottlenecks to generate truly personalized recommendations.\n\nLet's start by understanding how you currently spend your time, so I can identify where AI could have the biggest impact on your productivity.`,
        timestamp: new Date()
      };

      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Error initializing assessment:', error);
      toast({
        title: "Error",
        description: "Failed to initialize assessment. Please refresh and try again.",
        variant: "destructive",
      });
    }
  };

  const sendAIMessage = async (userInput: string, data?: Partial<DiagnosticData>) => {
    if (!sessionId) return;

    try {
      const contextMessage = data ? 
        `User updated their data: ${JSON.stringify(data, null, 2)}\n\nUser message: ${userInput}` : 
        userInput;

      const { data: response, error } = await supabase.functions.invoke('ai-assessment-chat', {
        body: {
          message: contextMessage,
          sessionId: sessionId,
          userId: null,
          context: {
            currentPhase,
            diagnosticData: { ...diagnosticData, ...data },
            phaseProgress: getPhaseProgress()
          }
        }
      });

      if (error) throw error;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending AI message:', error);
    }
  };

  const getPhaseProgress = () => {
    const phases = ['intro', 'time-ai', 'communication-skills', 'decision-ethics', 'bottlenecks'];
    const currentIndex = phases.indexOf(currentPhase);
    return ((currentIndex + 1) / phases.length) * 100;
  };

  const updateDiagnosticData = (updates: Partial<DiagnosticData>) => {
    setDiagnosticData(prev => ({ ...prev, ...updates }));
  };

  const handlePhaseComplete = (userResponse: string, data?: Partial<DiagnosticData>) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userResponse,
      timestamp: new Date(),
      data
    };

    setMessages(prev => [...prev, userMessage]);

    if (data) {
      updateDiagnosticData(data);
    }

    // Move to next phase
    const phases: Array<typeof currentPhase> = ['intro', 'time-ai', 'communication-skills', 'decision-ethics', 'bottlenecks', 'insights', 'results'];
    const currentIndex = phases.indexOf(currentPhase);
    
    if (currentIndex < phases.length - 1) {
      const nextPhase = phases[currentIndex + 1];
      setCurrentPhase(nextPhase);

      if (nextPhase === 'insights') {
        startInsightGeneration();
      } else {
        sendAIMessage(userResponse, data);
      }
    }
  };

  const startInsightGeneration = async () => {
    setIsGeneratingInsights(true);
    setInsightProgress(15);

    // Generate insights based on collected data
    const progressInterval = setInterval(() => {
      setInsightProgress(prev => {
        if (prev < 90) return prev + 8;
        return prev;
      });
    }, 1000);

    setTimeout(() => {
      setInsightProgress(100);
      clearInterval(progressInterval);
      setIsGeneratingInsights(false);
      setCurrentPhase('results');
    }, 6000);
  };

  const calculateScores = (): DiagnosticScores => {
    const aiUseCaseCount = diagnosticData.aiUseCases?.length || 0;
    const aiToolFluency = Math.min((aiUseCaseCount * 20) + (diagnosticData.deepWorkHours || 0) * 2, 100);
    
    const aiDecisionMaking = (diagnosticData.aiTrustLevel || 3) * 20;
    
    const communicationScore = (diagnosticData.stakeholderAudiences?.length || 0) * 12.5;
    
    const learningScore = (diagnosticData.upskillPercentage || 0) * 5 + (diagnosticData.skillGaps?.length || 0) * 15;
    
    const ethicsScore = diagnosticData.hasAiSafetyPlaybook ? 50 : 20;
    const riskScore = (diagnosticData.riskComfortLevel || 3) * 20;
    const aiEthicsBalance = (ethicsScore + riskScore) / 2;
    
    const aiMindmakerScore = (aiToolFluency + aiDecisionMaking + communicationScore + learningScore + aiEthicsBalance) / 5;

    return {
      aiToolFluency,
      aiDecisionMaking,
      aiCommunication: communicationScore,
      aiLearningGrowth: learningScore,
      aiEthicsBalance,
      aiMindmakerScore
    };
  };

  const handleContactAction = (actionType: 'learn_more' | 'book_call') => {
    setContactActionType(actionType);
    setShowContactModal(true);
  };

  if (isGeneratingInsights) {
    return (
      <ExecutiveLoadingScreen 
        progress={insightProgress} 
        phase="generating"
      />
    );
  }

  if (currentPhase === 'results') {
    const scores = calculateScores();
    const quickWins = generatePersonalizedQuickWins(diagnosticData, scores);

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Your Personalized AI Leadership Insights
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Based on your specific data, here are your custom recommendations and scores.
            </p>
          </div>

          {/* AI Mindmaker Score */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 mb-2">
                  <Brain className="h-8 w-8 text-primary" />
                  <h2 className="text-2xl font-bold">AI Mindmaker Score</h2>
                </div>
                <div className="text-5xl font-bold text-primary mb-2">
                  {Math.round(scores.aiMindmakerScore)}
                </div>
                <Progress value={scores.aiMindmakerScore} className="h-3 max-w-md mx-auto" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{Math.round(scores.aiToolFluency)}</div>
                  <div className="text-sm text-muted-foreground">AI Tool Fluency</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{Math.round(scores.aiDecisionMaking)}</div>
                  <div className="text-sm text-muted-foreground">AI Decision Making</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{Math.round(scores.aiCommunication)}</div>
                  <div className="text-sm text-muted-foreground">AI Communication</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{Math.round(scores.aiLearningGrowth)}</div>
                  <div className="text-sm text-muted-foreground">AI Learning Growth</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{Math.round(scores.aiEthicsBalance)}</div>
                  <div className="text-sm text-muted-foreground">AI Ethics Balance</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personalized Quick Wins */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-6">
                <Lightbulb className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Your Personalized Quick Wins</h2>
              </div>
              
              <div className="space-y-4">
                {quickWins.map((win, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg">{win.title}</h3>
                      <Badge variant="outline">{win.impact}</Badge>
                    </div>
                    <p className="text-muted-foreground mb-2">{win.description}</p>
                    <p className="text-sm text-primary italic">{win.reason}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <div className="text-center">
            <div className="max-w-2xl mx-auto bg-card p-8 rounded-lg border shadow-sm">
              <h3 className="text-2xl font-semibold mb-4">Ready to Implement Your AI Leadership Plan?</h3>
              <p className="text-muted-foreground mb-6">
                These insights are tailored specifically to your current situation and goals. Let's discuss how to turn these recommendations into results.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => handleContactAction('book_call')}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <Target className="h-5 w-5" />
                  Book Strategy Call
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => handleContactAction('learn_more')}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <Brain className="h-5 w-5" />
                  Learn About Programs
                </Button>
              </div>
            </div>
          </div>
        </div>

        <ContactCollectionModal
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
          actionType={contactActionType}
        />
      </div>
    );
  }

  const renderPhaseContent = () => {
    switch (currentPhase) {
      case 'time-ai':
        return (
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold mb-4">Let's understand your time allocation and AI usage</h3>
              <p className="text-muted-foreground mb-6">Move the sliders to show how you spend your day, then select your current AI tools.</p>
              
              <div className="space-y-6">
                {/* Time Allocation */}
                <div className="space-y-4">
                  <h4 className="font-medium">Daily Time Allocation</h4>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="font-medium">Deep Work (thinking, creating, analyzing)</label>
                      <span className="text-primary font-bold">{diagnosticData.deepWorkHours || 8}h</span>
                    </div>
                    <Slider
                      value={[diagnosticData.deepWorkHours || 8]}
                      onValueChange={(value) => updateDiagnosticData({ deepWorkHours: value[0] })}
                      max={16}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="font-medium">Meetings</label>
                      <span className="text-primary font-bold">{diagnosticData.meetingHours || 4}h</span>
                    </div>
                    <Slider
                      value={[diagnosticData.meetingHours || 4]}
                      onValueChange={(value) => updateDiagnosticData({ meetingHours: value[0] })}
                      max={12}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="font-medium">Admin Tasks (email, scheduling, reporting)</label>
                      <span className="text-primary font-bold">{diagnosticData.adminHours || 4}h</span>
                    </div>
                    <Slider
                      value={[diagnosticData.adminHours || 4]}
                      onValueChange={(value) => updateDiagnosticData({ adminHours: value[0] })}
                      max={12}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* AI Use Cases */}
                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4">What AI tools do you actively use?</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {aiUseCases.map((useCase) => {
                      const isSelected = diagnosticData.aiUseCases?.some(u => u.useCase === useCase);
                      return (
                        <div key={useCase} className="flex items-center space-x-2">
                          <Checkbox
                            id={useCase}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              const current = diagnosticData.aiUseCases || [];
                              if (checked) {
                                updateDiagnosticData({ 
                                  aiUseCases: [...current, { useCase, tool: '' }] 
                                });
                              } else {
                                updateDiagnosticData({ 
                                  aiUseCases: current.filter(u => u.useCase !== useCase) 
                                });
                              }
                            }}
                          />
                          <Label htmlFor={useCase} className="text-sm">{useCase}</Label>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Input
                      placeholder="Add custom AI use case..."
                      value={customUseCase}
                      onChange={(e) => setCustomUseCase(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && customUseCase.trim()) {
                          const current = diagnosticData.aiUseCases || [];
                          updateDiagnosticData({ 
                            aiUseCases: [...current, { useCase: customUseCase.trim(), tool: '' }] 
                          });
                          setCustomUseCase('');
                        }
                      }}
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => {
                        if (customUseCase.trim()) {
                          const current = diagnosticData.aiUseCases || [];
                          updateDiagnosticData({ 
                            aiUseCases: [...current, { useCase: customUseCase.trim(), tool: '' }] 
                          });
                          setCustomUseCase('');
                        }
                      }}
                      size="sm"
                    >
                      Add
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={() => handlePhaseComplete(
                    `I spend ${diagnosticData.deepWorkHours || 8} hours on deep work, ${diagnosticData.meetingHours || 4} hours in meetings, and ${diagnosticData.adminHours || 4} hours on admin tasks. I use AI for: ${(diagnosticData.aiUseCases || []).map(u => u.useCase).join(', ')}.`,
                    diagnosticData
                  )}
                  className="w-full"
                  disabled={!diagnosticData.deepWorkHours && !diagnosticData.meetingHours && !diagnosticData.adminHours}
                >
                  Continue to Communication & Skills
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'communication-skills':
        return (
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold mb-4">Communication & Skills Development</h3>
              <p className="text-muted-foreground mb-6">Select who you communicate with and identify your learning goals.</p>
              
              <div className="space-y-6">
                {/* Communication Audiences */}
                <div>
                  <h4 className="font-medium mb-4">Who do you regularly communicate with about strategy?</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {communicationAudiences.map((audience) => {
                      const isSelected = diagnosticData.stakeholderAudiences?.includes(audience);
                      return (
                        <div key={audience} className="flex items-center space-x-2">
                          <Checkbox
                            id={audience}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              const current = diagnosticData.stakeholderAudiences || [];
                              if (checked) {
                                updateDiagnosticData({ 
                                  stakeholderAudiences: [...current, audience] 
                                });
                              } else {
                                updateDiagnosticData({ 
                                  stakeholderAudiences: current.filter(a => a !== audience) 
                                });
                              }
                            }}
                          />
                          <Label htmlFor={audience} className="text-sm">{audience}</Label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Learning Time */}
                <div>
                  <h4 className="font-medium mb-4">How much time do you invest in AI learning weekly?</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Percentage of time learning about AI</span>
                      <span className="text-primary font-bold">{diagnosticData.upskillPercentage || 0}%</span>
                    </div>
                    <Slider
                      value={[diagnosticData.upskillPercentage || 0]}
                      onValueChange={(value) => updateDiagnosticData({ upskillPercentage: value[0] })}
                      max={30}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Skill Gaps */}
                <div>
                  <h4 className="font-medium mb-4">What AI skills would you like to develop? (Select up to 3)</h4>
                  <div className="space-y-2">
                    {skillGaps.map((skill) => {
                      const isSelected = diagnosticData.skillGaps?.includes(skill);
                      return (
                        <div key={skill} className="flex items-center space-x-2">
                          <Checkbox
                            id={skill}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              const current = diagnosticData.skillGaps || [];
                              if (checked && current.length < 3) {
                                updateDiagnosticData({ 
                                  skillGaps: [...current, skill] 
                                });
                              } else if (!checked) {
                                updateDiagnosticData({ 
                                  skillGaps: current.filter(s => s !== skill) 
                                });
                              }
                            }}
                            disabled={!diagnosticData.skillGaps?.includes(skill) && (diagnosticData.skillGaps?.length || 0) >= 3}
                          />
                          <Label htmlFor={skill} className="text-sm">{skill}</Label>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Input
                      placeholder="Add custom skill gap..."
                      value={customSkillGap}
                      onChange={(e) => setCustomSkillGap(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && customSkillGap.trim() && (diagnosticData.skillGaps?.length || 0) < 3) {
                          const current = diagnosticData.skillGaps || [];
                          updateDiagnosticData({ 
                            skillGaps: [...current, customSkillGap.trim()] 
                          });
                          setCustomSkillGap('');
                        }
                      }}
                      className="flex-1"
                      disabled={(diagnosticData.skillGaps?.length || 0) >= 3}
                    />
                    <Button 
                      onClick={() => {
                        if (customSkillGap.trim() && (diagnosticData.skillGaps?.length || 0) < 3) {
                          const current = diagnosticData.skillGaps || [];
                          updateDiagnosticData({ 
                            skillGaps: [...current, customSkillGap.trim()] 
                          });
                          setCustomSkillGap('');
                        }
                      }}
                      size="sm"
                      disabled={(diagnosticData.skillGaps?.length || 0) >= 3}
                    >
                      Add
                    </Button>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-2">
                    Selected: {diagnosticData.skillGaps?.length || 0}/3 skills
                  </p>
                </div>

                <Button 
                  onClick={() => handlePhaseComplete(
                    `I communicate with: ${(diagnosticData.stakeholderAudiences || []).join(', ')}. I spend ${diagnosticData.upskillPercentage || 0}% of my time learning AI. Skills I want to develop: ${(diagnosticData.skillGaps || []).join(', ')}.`,
                    diagnosticData
                  )}
                  className="w-full"
                >
                  Continue to Decision Making & Ethics
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'decision-ethics':
        return (
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold mb-4">Decision Making & AI Ethics</h3>
              <p className="text-muted-foreground mb-6">Help us understand your approach to AI-assisted decision making and ethical considerations.</p>
              
              <div className="space-y-6">
                {/* AI Trust Level */}
                <div>
                  <h4 className="font-medium mb-4">AI Decision Trust</h4>
                  <p className="text-sm text-muted-foreground mb-4">"I regularly use AI to analyze options and validate my decisions"</p>
                  
                  <RadioGroup
                    value={diagnosticData.aiTrustLevel?.toString() || '3'}
                    onValueChange={(value) => updateDiagnosticData({ aiTrustLevel: parseInt(value) })}
                    className="space-y-3"
                  >
                    {[
                      { value: 1, label: 'Strongly Disagree' },
                      { value: 2, label: 'Disagree' },
                      { value: 3, label: 'Neutral' },
                      { value: 4, label: 'Agree' },
                      { value: 5, label: 'Strongly Agree' },
                    ].map((option) => (
                      <div key={option.value} className="flex items-center space-x-3">
                        <RadioGroupItem 
                          value={option.value.toString()} 
                          id={`trust-${option.value}`}
                        />
                        <Label 
                          htmlFor={`trust-${option.value}`}
                          className="text-sm font-medium cursor-pointer flex-1"
                        >
                          <span className="font-bold text-primary">{option.value}</span> - {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* AI Safety Guidelines */}
                <div>
                  <h4 className="font-medium mb-4">Personal AI Ethics</h4>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="safety-playbook"
                      checked={diagnosticData.hasAiSafetyPlaybook || false}
                      onCheckedChange={(checked) => updateDiagnosticData({ hasAiSafetyPlaybook: !!checked })}
                    />
                    <Label htmlFor="safety-playbook">
                      I have personal guidelines for responsible AI usage
                    </Label>
                  </div>
                </div>

                {/* Risk Comfort Level */}
                <div>
                  <h4 className="font-medium mb-4">AI Comfort Level</h4>
                  <p className="text-sm text-muted-foreground mb-4">How comfortable are you with AI handling sensitive work content?</p>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Risk Comfort Level</span>
                      <span className="text-primary font-bold">{diagnosticData.riskComfortLevel || 3}/5</span>
                    </div>
                    <Slider
                      value={[diagnosticData.riskComfortLevel || 3]}
                      onValueChange={(value) => updateDiagnosticData({ riskComfortLevel: value[0] })}
                      max={5}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Very Cautious</span>
                      <span>Fully Comfortable</span>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => handlePhaseComplete(
                    `My AI decision trust level is ${diagnosticData.aiTrustLevel || 3}/5. I ${diagnosticData.hasAiSafetyPlaybook ? 'have' : 'don\'t have'} personal AI guidelines. My risk comfort level is ${diagnosticData.riskComfortLevel || 3}/5.`,
                    diagnosticData
                  )}
                  className="w-full"
                >
                  Continue to Bottlenecks & Priorities
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'bottlenecks':
        return (
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold mb-4">Personal Productivity Bottlenecks</h3>
              <p className="text-muted-foreground mb-6">Select up to 3 areas where you feel AI assistance could help you most.</p>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-4">What slows you down the most? (Select up to 3)</h4>
                  <div className="space-y-2">
                    {personalBottlenecks.map((bottleneck) => {
                      const isSelected = diagnosticData.dailyFrictions?.includes(bottleneck);
                      return (
                        <div key={bottleneck} className="flex items-center space-x-2">
                          <Checkbox
                            id={bottleneck}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              const current = diagnosticData.dailyFrictions || [];
                              if (checked && current.length < 3) {
                                updateDiagnosticData({ 
                                  dailyFrictions: [...current, bottleneck] 
                                });
                              } else if (!checked) {
                                updateDiagnosticData({ 
                                  dailyFrictions: current.filter(b => b !== bottleneck) 
                                });
                              }
                            }}
                            disabled={!diagnosticData.dailyFrictions?.includes(bottleneck) && (diagnosticData.dailyFrictions?.length || 0) >= 3}
                          />
                          <Label htmlFor={bottleneck} className="text-sm">{bottleneck}</Label>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Input
                      placeholder="Add custom bottleneck..."
                      value={customBottleneck}
                      onChange={(e) => setCustomBottleneck(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && customBottleneck.trim() && (diagnosticData.dailyFrictions?.length || 0) < 3) {
                          const current = diagnosticData.dailyFrictions || [];
                          updateDiagnosticData({ 
                            dailyFrictions: [...current, customBottleneck.trim()] 
                          });
                          setCustomBottleneck('');
                        }
                      }}
                      className="flex-1"
                      disabled={(diagnosticData.dailyFrictions?.length || 0) >= 3}
                    />
                    <Button 
                      onClick={() => {
                        if (customBottleneck.trim() && (diagnosticData.dailyFrictions?.length || 0) < 3) {
                          const current = diagnosticData.dailyFrictions || [];
                          updateDiagnosticData({ 
                            dailyFrictions: [...current, customBottleneck.trim()] 
                          });
                          setCustomBottleneck('');
                        }
                      }}
                      size="sm"
                      disabled={(diagnosticData.dailyFrictions?.length || 0) >= 3}
                    >
                      Add
                    </Button>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-2">
                    Selected: {diagnosticData.dailyFrictions?.length || 0}/3 bottlenecks
                  </p>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4">Optional: Contact Information</h4>
                  <p className="text-sm text-muted-foreground mb-4">To personalize your insights further (optional):</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="First Name"
                      value={diagnosticData.firstName || ''}
                      onChange={(e) => updateDiagnosticData({ firstName: e.target.value })}
                    />
                    <Input
                      placeholder="Last Name"
                      value={diagnosticData.lastName || ''}
                      onChange={(e) => updateDiagnosticData({ lastName: e.target.value })}
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={diagnosticData.email || ''}
                      onChange={(e) => updateDiagnosticData({ email: e.target.value })}
                    />
                    <Input
                      placeholder="Company"
                      value={diagnosticData.company || ''}
                      onChange={(e) => updateDiagnosticData({ company: e.target.value })}
                    />
                  </div>
                </div>

                <Button 
                  onClick={() => handlePhaseComplete(
                    `My main productivity bottlenecks are: ${(diagnosticData.dailyFrictions || []).join(', ')}. ${diagnosticData.firstName ? `My name is ${diagnosticData.firstName} ${diagnosticData.lastName}` : 'I prefer to remain anonymous'}.`,
                    diagnosticData
                  )}
                  className="w-full"
                  disabled={(diagnosticData.dailyFrictions?.length || 0) === 0}
                >
                  Generate My Personalized Insights
                  <TrendingUp className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Button 
                  onClick={() => {
                    setCurrentPhase('time-ai');
                    sendAIMessage("I'm ready to start the assessment. Let's explore my time allocation and AI usage.");
                  }}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <Target className="h-5 w-5" />
                  Start My Assessment
                </Button>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="/lovable-uploads/2819589c-814c-4ec7-9e78-0d2a80b89243.png" 
            alt="AI Mindmaker Logo" 
            className="h-12 w-auto mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Rich AI Leadership Assessment
          </h1>
          <p className="text-muted-foreground mb-6">
            Personalized insights based on your specific data and situation
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Progress Section */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Assessment Progress</h2>
                <Badge variant="outline" className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Phase: {currentPhase.replace('-', ' ')}
                </Badge>
              </div>
              
              <Progress value={getPhaseProgress()} className="h-3 mb-2" />
              
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Rich interactive data collection</span>
                <span>{Math.round(getPhaseProgress())}% complete</span>
              </div>
            </CardContent>
          </Card>

          {/* Conversation */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <ScrollArea className="h-80 pr-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] p-4 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {message.role === 'assistant' && (
                            <Brain className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                          )}
                          {message.role === 'user' && (
                            <User className="h-4 w-4 text-primary-foreground mt-1 flex-shrink-0" />
                          )}
                          <div className="text-sm whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Interactive Phase Content */}
          {currentPhase !== 'insights' && renderPhaseContent()}
        </div>
      </div>
    </div>
  );
};

export default RichConversationalAssessment;