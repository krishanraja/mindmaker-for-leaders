import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Brain, Target, Lightbulb, ArrowRight, CheckCircle, User, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { DiagnosticData, DiagnosticScores } from '../types/diagnostic';
import { EnhancedLoadingScreen } from './ai-chat/EnhancedLoadingScreen';
import { generatePersonalizedQuickWins } from '@/utils/personalAIQuickWins';
import ContactCollectionModal from './ContactCollectionModal';
import PriorityOrderingSection from './diagnostic/PriorityOrderingSection';

interface ExecutiveDiagnosticToolProps {
  onComplete?: (sessionData: any) => void;
}

const ExecutiveDiagnosticTool: React.FC<ExecutiveDiagnosticToolProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<'intro' | 'time-ai' | 'communication-skills' | 'decision-ethics' | 'priorities' | 'loading' | 'results'>('intro');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData>({
    deepWorkHours: 20,
    meetingHours: 15,
    adminHours: 10,
    aiUseCases: [],
    decisionMakingSpeed: 3,
    aiTrustLevel: 3,
    upskillPercentage: 10,
    allChallenges: []
  });
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactActionType, setContactActionType] = useState<'learn_more' | 'book_call'>('book_call');
  const [customUseCase, setCustomUseCase] = useState('');
  const [customSkillGap, setCustomSkillGap] = useState('');
  const { toast } = useToast();

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

  useEffect(() => {
    initializeAssessment();
  }, []);

  const initializeAssessment = async () => {
    try {
      const { data: session, error } = await supabase
        .from('conversation_sessions')
        .insert({
          user_id: null,
          session_title: 'Executive AI Leadership Assessment',
          status: 'active',
          business_context: {}
        })
        .select()
        .single();

      if (error) throw error;
      setSessionId(session.id);
    } catch (error) {
      console.error('Error initializing assessment:', error);
      toast({
        title: "Error",
        description: "Failed to initialize assessment. Please refresh and try again.",
        variant: "destructive",
      });
    }
  };

  const getStepProgress = () => {
    const steps = ['intro', 'time-ai', 'communication-skills', 'decision-ethics', 'priorities'];
    const currentIndex = steps.indexOf(currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  const updateDiagnosticData = (updates: Partial<DiagnosticData>) => {
    setDiagnosticData(prev => ({ ...prev, ...updates }));
  };

  const handleStepComplete = () => {
    const steps: Array<typeof currentStep> = ['intro', 'time-ai', 'communication-skills', 'decision-ethics', 'priorities', 'results'];
    const currentIndex = steps.indexOf(currentStep);
    
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      setCurrentStep(nextStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
      aiMindmakerScore,
      overallScore: aiMindmakerScore,
      readinessScore: aiToolFluency,
      collaborationScore: communicationScore,
      strategicScore: aiDecisionMaking,
      ethicsScore: aiEthicsBalance,
      productivityScore: learningScore
    };
  };

  const handleContactAction = (actionType: 'learn_more' | 'book_call') => {
    setContactActionType(actionType);
    setShowContactModal(true);
  };

  const getStepNumber = () => {
    const steps = ['intro', 'time-ai', 'communication-skills', 'decision-ethics', 'priorities'];
    const currentIndex = steps.indexOf(currentStep);
    return currentIndex === 0 ? 1 : currentIndex;
  };

  const isStepComplete = (): boolean => {
    switch (currentStep) {
      case 'time-ai':
        const hasTimeData = diagnosticData.deepWorkHours !== undefined && 
                           diagnosticData.meetingHours !== undefined && 
                           diagnosticData.adminHours !== undefined;
        const hasAiUseCases = diagnosticData.aiUseCases && diagnosticData.aiUseCases.length > 0;
        return hasTimeData && hasAiUseCases;
       case 'communication-skills':
         return (diagnosticData.stakeholderAudiences?.length || 0) > 0 && 
                Boolean(diagnosticData.persuasionChallenge?.trim());
    case 'decision-ethics':
      return diagnosticData.decisionMakingSpeed !== undefined && 
             diagnosticData.aiTrustLevel !== undefined &&
             diagnosticData.upskillPercentage !== undefined &&
             (diagnosticData.skillGaps?.length || 0) > 0 &&
             diagnosticData.hasAiSafetyPlaybook !== undefined &&
             diagnosticData.riskComfortLevel !== undefined;
       case 'priorities':
         return (diagnosticData.prioritizedStrategies?.length || 0) >= 3;
      default:
        return true;
    }
  };

  if (currentStep === 'loading') {
    return <EnhancedLoadingScreen onComplete={() => setCurrentStep('results')} />;
  }

  if (currentStep === 'results') {
    const scores = calculateScores();
    const quickWins = generatePersonalizedQuickWins(diagnosticData, scores);

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              Your AI Leadership Report
            </h1>
            <p className="text-xl text-white/80">
              Personalized insights based on your responses
            </p>
          </div>

          {/* AI Mindmaker Score */}
          <Card className="mb-8 glass-card-dark border-white/20">
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 mb-2">
                  <Brain className="h-8 w-8 text-primary" />
                  <h2 className="text-2xl font-bold text-white">AI Leadership Score</h2>
                </div>
                <div className="text-5xl font-bold text-primary mb-2">
                  {Math.round(scores.aiMindmakerScore)}
                </div>
                <Progress value={scores.aiMindmakerScore} className="h-3 max-w-md mx-auto" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{Math.round(scores.aiToolFluency)}</div>
                  <div className="text-sm text-white/70">AI Tool Fluency</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{Math.round(scores.aiDecisionMaking)}</div>
                  <div className="text-sm text-white/70">AI Decision Making</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{Math.round(scores.aiCommunication)}</div>
                  <div className="text-sm text-white/70">AI Communication</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{Math.round(scores.aiLearningGrowth)}</div>
                  <div className="text-sm text-white/70">AI Learning</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{Math.round(scores.aiEthicsBalance)}</div>
                  <div className="text-sm text-white/70">AI Ethics</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Wins */}
          <Card className="mb-8 glass-card-dark border-white/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-6">
                <Lightbulb className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold text-white">Your Quick Wins</h2>
              </div>
              
              <div className="space-y-4">
                {quickWins.map((win, index) => (
                  <div key={index} className="border border-white/20 rounded-lg p-4 glass-card-dark">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg text-white">{win.title}</h3>
                      <Badge variant="outline">{win.impact}</Badge>
                    </div>
                    <p className="text-white/80 mb-2">{win.description}</p>
                    <p className="text-sm text-primary italic">{win.reason}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <div className="text-center">
            <Card className="p-8 glass-card-dark border-white/20">
              <h3 className="text-2xl font-semibold mb-4 text-white">Ready to Implement Your AI Plan?</h3>
              <p className="text-white/80 mb-6">
                These insights are tailored to your situation. Let's discuss implementation.
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
                  Learn More
                </Button>
              </div>
            </Card>
          </div>
        </div>

        <ContactCollectionModal
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
          actionType={contactActionType}
          sessionId={sessionId}
          assessmentData={{
            source: 'Executive AI Assessment',
            currentStep,
            responses: diagnosticData,
            scores: calculateScores(),
            completed_at: new Date().toISOString()
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            AI Leadership Assessment
          </h1>
          <p className="text-xl text-white/80 mb-6">
            Get personalized insights for your AI transformation
          </p>
          
          {/* Progress */}
          {currentStep !== 'intro' && (
            <div className="max-w-md mx-auto mb-8">
              <div className="flex justify-between text-sm text-white/70 mb-2">
                <span>Step {getStepNumber()} of 5</span>
                <span>{Math.round(getStepProgress())}% Complete</span>
              </div>
              <Progress value={getStepProgress()} className="h-2" />
            </div>
          )}
        </div>

        {/* Content */}
        {currentStep === 'intro' && (
          <Card className="mb-8 glass-card-dark border-white/20">
            <CardHeader>
             <CardTitle className="flex items-center gap-2 text-2xl text-white">
               <User className="h-6 w-6" />
               Transform Your Leadership with AI
             </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-lg">
                  Get your personalized AI Leadership Score and discover specific actions to accelerate your leadership impact.
                </p>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-semibold text-white">5 Minutes</h3>
                    <p className="text-sm text-white/70">Executive-focused</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Brain className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-semibold text-white">Your AI Score</h3>
                    <p className="text-sm text-white/70">Leadership readiness</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-semibold text-white">Quick Wins</h3>
                    <p className="text-sm text-white/70">Immediate actions</p>
                  </div>
                </div>

                <Button 
                  onClick={handleStepComplete}
                  size="lg"
                  className="w-full mt-6"
                >
                  Start Assessment
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 'time-ai' && (
          <Card className="mb-8 glass-card-dark border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Your Current Leadership Focus</CardTitle>
              <p className="text-white/80">Help us understand how you allocate time and leverage AI tools</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Time Allocation */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">How do you spend your week? (hours)</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label className="font-medium">Deep Work (strategy, analysis, creation)</Label>
                        <span className="text-primary font-bold">{diagnosticData.deepWorkHours || 20}h</span>
                      </div>
                      <Slider
                        value={[diagnosticData.deepWorkHours || 20]}
                        onValueChange={(value) => updateDiagnosticData({ deepWorkHours: value[0] })}
                        max={50}
                        min={0}
                        step={2}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label className="font-medium">Meetings</Label>
                        <span className="text-primary font-bold">{diagnosticData.meetingHours || 15}h</span>
                      </div>
                      <Slider
                        value={[diagnosticData.meetingHours || 15]}
                        onValueChange={(value) => updateDiagnosticData({ meetingHours: value[0] })}
                        max={40}
                        min={0}
                        step={2}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label className="font-medium">Admin Tasks (email, reports, scheduling)</Label>
                        <span className="text-primary font-bold">{diagnosticData.adminHours || 10}h</span>
                      </div>
                      <Slider
                        value={[diagnosticData.adminHours || 10]}
                        onValueChange={(value) => updateDiagnosticData({ adminHours: value[0] })}
                        max={30}
                        min={0}
                        step={2}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* AI Use Cases */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg text-white">Which AI capabilities do you currently use?</h4>
                  <p className="text-sm text-white/70">Check all that apply to your current workflow:</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {aiUseCases.map((useCase) => (
                      <div key={useCase} className="flex items-center space-x-2">
                         <Checkbox
                           id={useCase}
                           checked={(diagnosticData.aiUseCases || []).some(item => item.useCase === useCase)}
                           onCheckedChange={(checked) => {
                             const current = diagnosticData.aiUseCases || [];
                             if (checked) {
                               updateDiagnosticData({ 
                                 aiUseCases: [...current, { useCase, tool: 'ChatGPT' }] 
                               });
                             } else {
                               updateDiagnosticData({ 
                                 aiUseCases: current.filter(item => item.useCase !== useCase) 
                               });
                             }
                           }}
                        />
                        <Label htmlFor={useCase} className="text-sm cursor-pointer">
                          {useCase}
                        </Label>
                      </div>
                    ))}
                  </div>

                  {/* Custom use case */}
                  <div className="flex gap-2">
                    <Input
                      value={customUseCase}
                      onChange={(e) => setCustomUseCase(e.target.value)}
                      placeholder="Add custom use case..."
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
                      variant="outline"
                      disabled={!customUseCase.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={handleStepComplete}
                  disabled={!isStepComplete()}
                  className="w-full mt-6"
                >
                  Continue
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 'communication-skills' && (
          <Card className="mb-8 glass-card-dark border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Communication & Influence</CardTitle>
              <p className="text-white/80">Who do you communicate with and what challenges do you face?</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg text-white">Key Stakeholder Audiences</h4>
                  <p className="text-sm text-white/70">Select all that you regularly communicate with:</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {communicationAudiences.map((audience) => (
                      <div key={audience} className="flex items-center space-x-2">
                        <Checkbox
                          id={audience}
                          checked={(diagnosticData.stakeholderAudiences || []).includes(audience)}
                          onCheckedChange={(checked) => {
                            const current = diagnosticData.stakeholderAudiences || [];
                            if (checked) {
                              updateDiagnosticData({ stakeholderAudiences: [...current, audience] });
                            } else {
                              updateDiagnosticData({ 
                                stakeholderAudiences: current.filter(a => a !== audience) 
                              });
                            }
                          }}
                        />
                        <Label htmlFor={audience} className="text-sm cursor-pointer">
                          {audience}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="font-semibold text-lg">Biggest Communication Challenge</Label>
                  <Textarea
                    value={diagnosticData.persuasionChallenge || ''}
                    onChange={(e) => updateDiagnosticData({ persuasionChallenge: e.target.value })}
                    placeholder="What's your biggest challenge when communicating complex ideas or driving change? (e.g., 'Getting buy-in for new initiatives', 'Explaining technical concepts to non-technical stakeholders')"
                    className="min-h-[100px]"
                  />
                </div>

                <Button 
                  onClick={handleStepComplete}
                  disabled={!isStepComplete()}
                  className="w-full mt-6"
                >
                  Continue
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 'decision-ethics' && (
          <Card className="mb-8 glass-card-dark border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Decision Making & AI Ethics</CardTitle>
              <p className="text-white/80">How do you make decisions and approach AI governance?</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Decision Making */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg text-white">Decision Making Process</h4>
                  
                   <div>
                     <Label className="font-medium text-white">Decision making speed (1-5 scale)</Label>
                     <div className="flex justify-between items-center mt-2 mb-2">
                       <span className="text-sm text-white/70">Slow</span>
                       <span className="text-primary font-bold">{diagnosticData.decisionMakingSpeed || 3}</span>
                       <span className="text-sm text-white/70">Fast</span>
                     </div>
                     <Slider
                       value={[diagnosticData.decisionMakingSpeed || 3]}
                       onValueChange={(value) => updateDiagnosticData({ decisionMakingSpeed: value[0] })}
                       max={5}
                       min={1}
                       step={1}
                       className="w-full"
                     />
                   </div>

                  <div>
                    <Label className="font-medium text-white">Trust in AI-assisted decisions (1-5 scale)</Label>
                    <div className="flex justify-between items-center mt-2 mb-2">
                      <span className="text-sm text-white/70">Low trust</span>
                      <span className="text-primary font-bold">{diagnosticData.aiTrustLevel || 3}</span>
                      <span className="text-sm text-white/70">High trust</span>
                    </div>
                    <Slider
                      value={[diagnosticData.aiTrustLevel || 3]}
                      onValueChange={(value) => updateDiagnosticData({ aiTrustLevel: value[0] })}
                      max={5}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Learning & Growth */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Learning & Development</h4>
                  
                  <div>
                    <Label className="font-medium text-white">Time spent on upskilling (% of work time)</Label>
                    <div className="flex justify-between items-center mt-2 mb-2">
                      <span className="text-sm text-white/70">0%</span>
                      <span className="text-primary font-bold">{diagnosticData.upskillPercentage || 10}%</span>
                      <span className="text-sm text-white/70">50%</span>
                    </div>
                    <Slider
                      value={[diagnosticData.upskillPercentage || 10]}
                      onValueChange={(value) => updateDiagnosticData({ upskillPercentage: value[0] })}
                      max={50}
                      min={0}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="font-medium">Key skill gaps to address</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {skillGaps.map((gap) => (
                        <div key={gap} className="flex items-center space-x-2">
                          <Checkbox
                            id={gap}
                            checked={(diagnosticData.skillGaps || []).includes(gap)}
                            onCheckedChange={(checked) => {
                              const current = diagnosticData.skillGaps || [];
                              if (checked) {
                                updateDiagnosticData({ skillGaps: [...current, gap] });
                              } else {
                                updateDiagnosticData({ 
                                  skillGaps: current.filter(g => g !== gap) 
                                });
                              }
                            }}
                          />
                          <Label htmlFor={gap} className="text-sm cursor-pointer">
                            {gap}
                          </Label>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={customSkillGap}
                        onChange={(e) => setCustomSkillGap(e.target.value)}
                        placeholder="Add custom skill gap..."
                        className="flex-1"
                      />
                      <Button
                        onClick={() => {
                          if (customSkillGap.trim()) {
                            const current = diagnosticData.skillGaps || [];
                            updateDiagnosticData({ 
                              skillGaps: [...current, customSkillGap.trim()] 
                            });
                            setCustomSkillGap('');
                          }
                        }}
                        variant="outline"
                        disabled={!customSkillGap.trim()}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>

                {/* AI Ethics & Risk */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">AI Ethics & Risk Management</h4>
                  
                  <div className="space-y-3">
                    <Label className="font-medium">AI Safety & Governance</Label>
                    <RadioGroup
                      value={diagnosticData.hasAiSafetyPlaybook?.toString() || 'false'}
                      onValueChange={(value: string) => updateDiagnosticData({ hasAiSafetyPlaybook: value === 'true' })}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="has-playbook" />
                        <Label htmlFor="has-playbook">We have AI safety policies and playbooks</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="no-playbook" />
                        <Label htmlFor="no-playbook">We need to develop AI safety policies</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="font-medium text-white">Risk comfort level (1-10 scale)</Label>
                    <div className="flex justify-between items-center mt-2 mb-2">
                      <span className="text-sm text-white/70">Conservative</span>
                      <span className="text-primary font-bold">{diagnosticData.riskComfortLevel || 5}</span>
                      <span className="text-sm text-white/70">High risk tolerance</span>
                    </div>
                    <Slider
                      value={[diagnosticData.riskComfortLevel || 5]}
                      onValueChange={(value) => updateDiagnosticData({ riskComfortLevel: value[0] })}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleStepComplete}
                  disabled={!isStepComplete()}
                  className="w-full mt-6"
                >
                  Continue
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 'priorities' && (
          <PriorityOrderingSection 
            data={diagnosticData}
            onUpdate={updateDiagnosticData}
            onComplete={handleStepComplete}
            isComplete={isStepComplete()}
          />
        )}
      </div>
    </div>
  );
};

export default ExecutiveDiagnosticTool;