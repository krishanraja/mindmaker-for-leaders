import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { Clock, User, Building2, Zap, Calendar, DollarSign } from 'lucide-react';

interface QuickFormData {
  // Contact Information
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  role: string;
  
  // AI Assessment Data
  timeAllocation: number;
  aiUsageLevel: string;
  implementationTimeline: string;
  budgetRange: string;
  decisionAuthority: string;
}

interface QuickFormAssessmentProps {
  onComplete: (data: QuickFormData, score: number) => void;
}

const QuickFormAssessment: React.FC<QuickFormAssessmentProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<QuickFormData>({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    role: '',
    timeAllocation: 2,
    aiUsageLevel: '',
    implementationTimeline: '',
    budgetRange: '',
    decisionAuthority: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const steps = [
    {
      title: "Contact Information",
      subtitle: "For your personalized AI leadership recommendations",
      icon: <User className="h-5 w-5" />,
      component: ContactStep
    },
    {
      title: "AI Time Investment",
      subtitle: "How much time do you spend on AI-enhanceable work?",
      icon: <Clock className="h-5 w-5" />,
      component: TimeAllocationStep
    },
    {
      title: "Current AI Usage",
      subtitle: "What's your current relationship with AI tools?",
      icon: <Zap className="h-5 w-5" />,
      component: AIUsageStep
    },
    {
      title: "Implementation Timeline",
      subtitle: "When do you want to enhance your AI leadership?",
      icon: <Calendar className="h-5 w-5" />,
      component: TimelineStep
    },
    {
      title: "Investment Level",
      subtitle: "What's your budget range for AI leadership development?",
      icon: <DollarSign className="h-5 w-5" />,
      component: BudgetStep
    }
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const isStepComplete = () => {
    switch (currentStep) {
      case 0:
        return formData.firstName && formData.lastName && formData.email && formData.company && formData.role;
      case 1:
        return formData.timeAllocation > 0;
      case 2:
        return formData.aiUsageLevel;
      case 3:
        return formData.implementationTimeline;
      case 4:
        return formData.budgetRange && formData.decisionAuthority;
      default:
        return false;
    }
  };

  const calculateQuickScore = (data: QuickFormData): number => {
    let score = 0;
    
    // Time allocation scoring (0-25 points)
    score += Math.min(25, data.timeAllocation * 5);
    
    // AI usage level scoring (0-30 points)
    const usageScores: Record<string, number> = {
      'never': 5,
      'experimental': 10,
      'occasional': 15,
      'regular': 25,
      'power_user': 30
    };
    score += usageScores[data.aiUsageLevel] || 0;
    
    // Timeline urgency (0-20 points)
    const timelineScores: Record<string, number> = {
      'immediate': 20,
      'within_3_months': 15,
      'within_6_months': 10,
      'this_year': 5
    };
    score += timelineScores[data.implementationTimeline] || 0;
    
    // Budget and authority (0-25 points)
    const budgetScores: Record<string, number> = {
      'under_5k': 5,
      '5k_25k': 10,
      '25k_100k': 20,
      'enterprise_100k+': 25
    };
    const authorityScores: Record<string, number> = {
      'none': 0,
      'influence': 5,
      'shared': 10,
      'full': 15
    };
    score += (budgetScores[data.budgetRange] || 0) + (authorityScores[data.decisionAuthority] || 0);
    
    return Math.min(100, score);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const score = calculateQuickScore(formData);
      const sessionId = crypto.randomUUID();
      
      // Save to database
      const { error: contextError } = await supabase
        .from('user_business_context')
        .insert({
          user_id: null, // Anonymous
          ai_readiness_score: score,
          context_data: JSON.parse(JSON.stringify({
            assessment_type: 'quick_form',
            contact_info: {
              name: `${formData.firstName} ${formData.lastName}`,
              email: formData.email,
              company: formData.company,
              role: formData.role
            },
            assessment_data: formData,
            score_breakdown: {
              time_allocation: Math.min(25, formData.timeAllocation * 5),
              ai_usage: formData.aiUsageLevel,
              timeline: formData.implementationTimeline,
              budget_authority: formData.budgetRange
            }
          })),
          business_name: formData.company,
          business_description: `Quick AI Leadership Assessment - Score: ${score}/100`
        });

      if (contextError) {
        console.error('Error saving business context:', contextError);
      }

      // Save lead qualification score
      const { error: scoreError } = await supabase
        .from('lead_qualification_scores')
        .insert({
          user_id: null,
          session_id: sessionId,
          total_score: score,
          engagement_score: 20, // Base engagement for form completion
          business_readiness_score: score * 0.7,
          implementation_readiness: score * 0.8,
          qualification_notes: `Quick Form Assessment: ${score}/100 - ${formData.company}`
        });

      if (scoreError) {
        console.error('Error saving lead score:', scoreError);
      }

      // Trigger Google Sheets sync
      await supabase.functions.invoke('sync-to-google-sheets', {
        body: {
          type: 'lead_scores',
          trigger_type: 'quick_form_completion',
          data: formData
        }
      });

      onComplete(formData, score);
      
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Submission Error",
        description: "There was an issue submitting your assessment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Quick AI Leadership Assessment</h1>
            <div className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {steps[currentStep].title}
              </span>
              <span className="text-primary font-medium">
                {Math.round(progress)}% Complete
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-primary/20">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                {steps[currentStep].icon}
                <CardTitle className="text-lg">{steps[currentStep].title}</CardTitle>
              </div>
              <p className="text-muted-foreground">{steps[currentStep].subtitle}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <CurrentStepComponent
                formData={formData}
                setFormData={setFormData}
                isMobile={isMobile}
              />
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-8"
            >
              Previous
            </Button>

            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index <= currentStep 
                      ? 'bg-primary' 
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              disabled={!isStepComplete() || isSubmitting}
              className="px-8"
            >
              {isSubmitting ? 'Submitting...' : currentStep === steps.length - 1 ? 'Get Results' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Step Components
const ContactStep: React.FC<{
  formData: QuickFormData;
  setFormData: React.Dispatch<React.SetStateAction<QuickFormData>>;
  isMobile: boolean;
}> = ({ formData, setFormData, isMobile }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input
        placeholder="First Name"
        value={formData.firstName}
        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
      />
      <Input
        placeholder="Last Name"
        value={formData.lastName}
        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
      />
    </div>
    <Input
      type="email"
      placeholder="Email Address"
      value={formData.email}
      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
    />
    <Input
      placeholder="Company Name"
      value={formData.company}
      onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
    />
    <Input
      placeholder="Your Role/Title"
      value={formData.role}
      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
    />
  </div>
);

const TimeAllocationStep: React.FC<{
  formData: QuickFormData;
  setFormData: React.Dispatch<React.SetStateAction<QuickFormData>>;
  isMobile: boolean;
}> = ({ formData, setFormData, isMobile }) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="text-3xl font-bold text-primary mb-2">
        {formData.timeAllocation} hours/day
      </div>
      <p className="text-sm text-muted-foreground">
        Time spent on work that could be enhanced with AI
      </p>
    </div>
    
    <div className="px-4">
      <Slider
        value={[formData.timeAllocation]}
        onValueChange={(value) => setFormData(prev => ({ ...prev, timeAllocation: value[0] }))}
        max={10}
        min={0}
        step={0.5}
        className="w-full"
      />
      <div className="flex justify-between text-sm text-muted-foreground mt-2">
        <span>0 hrs</span>
        <span>5 hrs</span>
        <span>10+ hrs</span>
      </div>
    </div>
  </div>
);

const AIUsageStep: React.FC<{
  formData: QuickFormData;
  setFormData: React.Dispatch<React.SetStateAction<QuickFormData>>;
  isMobile: boolean;
}> = ({ formData, setFormData, isMobile }) => (
  <div className="space-y-4">
    <Select
      value={formData.aiUsageLevel}
      onValueChange={(value) => setFormData(prev => ({ ...prev, aiUsageLevel: value }))}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select your current AI usage level" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="never">Never used AI tools professionally</SelectItem>
        <SelectItem value="experimental">Experimenting with AI tools</SelectItem>
        <SelectItem value="occasional">Use AI occasionally for specific tasks</SelectItem>
        <SelectItem value="regular">Regular AI user for multiple use cases</SelectItem>
        <SelectItem value="power_user">Power user - AI is integral to my workflow</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

const TimelineStep: React.FC<{
  formData: QuickFormData;
  setFormData: React.Dispatch<React.SetStateAction<QuickFormData>>;
  isMobile: boolean;
}> = ({ formData, setFormData, isMobile }) => (
  <div className="space-y-4">
    <Select
      value={formData.implementationTimeline}
      onValueChange={(value) => setFormData(prev => ({ ...prev, implementationTimeline: value }))}
    >
      <SelectTrigger>
        <SelectValue placeholder="When do you want to start?" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="immediate">Immediately - I need AI leadership skills now</SelectItem>
        <SelectItem value="within_3_months">Within 3 months</SelectItem>
        <SelectItem value="within_6_months">Within 6 months</SelectItem>
        <SelectItem value="this_year">Sometime this year</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

const BudgetStep: React.FC<{
  formData: QuickFormData;
  setFormData: React.Dispatch<React.SetStateAction<QuickFormData>>;
  isMobile: boolean;
}> = ({ formData, setFormData, isMobile }) => (
  <div className="space-y-4">
    <Select
      value={formData.budgetRange}
      onValueChange={(value) => setFormData(prev => ({ ...prev, budgetRange: value }))}
    >
      <SelectTrigger>
        <SelectValue placeholder="Investment range for AI leadership development" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="under_5k">Under $5,000</SelectItem>
        <SelectItem value="5k_25k">$5,000 - $25,000</SelectItem>
        <SelectItem value="25k_100k">$25,000 - $100,000</SelectItem>
        <SelectItem value="enterprise_100k+">$100,000+ (Enterprise)</SelectItem>
      </SelectContent>
    </Select>

    <Select
      value={formData.decisionAuthority}
      onValueChange={(value) => setFormData(prev => ({ ...prev, decisionAuthority: value }))}
    >
      <SelectTrigger>
        <SelectValue placeholder="Your decision-making authority" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="full">I make the final decision</SelectItem>
        <SelectItem value="shared">I share decision-making with others</SelectItem>
        <SelectItem value="influence">I influence the decision</SelectItem>
        <SelectItem value="none">I need approval from others</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

export default QuickFormAssessment;