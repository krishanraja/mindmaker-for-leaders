import React, { useState } from 'react';
import { HeroSection } from './HeroSection';
import { ExecutiveNavigation } from './ExecutiveNavigation';
import { AssessmentCard } from './AssessmentCard';
import { UnifiedAssessment } from './UnifiedAssessment';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Target, Users } from 'lucide-react';

type Screen = 'landing' | 'selection' | 'assessment' | 'results';

interface AssessmentOption {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  trackType: "LEADERSHIP" | "IMPLEMENTATION";
  badge?: string;
}

const assessmentOptions: AssessmentOption[] = [
  {
    id: 'conversational',
    title: 'AI Leadership Assessment',
    description: 'Discover your AI thinking patterns through an executive-level conversational assessment. Perfect for leaders ready to develop systematic AI collaboration frameworks.',
    estimatedTime: '5 minutes',
    trackType: 'LEADERSHIP',
    badge: 'Recommended'
  },
  {
    id: 'structured',
    title: 'Comprehensive Diagnostic',
    description: 'Deep-dive assessment covering strategic planning, implementation readiness, and organizational transformation capabilities.',
    estimatedTime: '12-15 minutes',
    trackType: 'IMPLEMENTATION',
    badge: 'Coming Soon'
  },
  {
    id: 'micro',
    title: 'Quick AI Readiness Check',
    description: 'Rapid assessment of your current AI literacy level and immediate learning priorities.',
    estimatedTime: '2 minutes',
    trackType: 'LEADERSHIP',
    badge: 'Coming Soon'
  }
];

export default function ExecutiveDiagnosticToolRevamped() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [selectedAssessment, setSelectedAssessment] = useState<string | null>(null);

  const handleStartAssessment = () => {
    setCurrentScreen('selection');
  };

  const handleSelectAssessment = (assessmentId: string) => {
    setSelectedAssessment(assessmentId);
    setCurrentScreen('assessment');
  };

  const handleBackToSelection = () => {
    setCurrentScreen('selection');
    setSelectedAssessment(null);
  };

  const handleBackToLanding = () => {
    setCurrentScreen('landing');
    setSelectedAssessment(null);
  };

  const handleAssessmentComplete = () => {
    setCurrentScreen('results');
  };

  if (currentScreen === 'landing') {
    return (
      <div className="min-h-screen">
        <HeroSection onStartAssessment={handleStartAssessment} />
      </div>
    );
  }

  if (currentScreen === 'selection') {
    return (
      <div className="min-h-screen bg-background">
        <ExecutiveNavigation 
          onBack={handleBackToLanding}
          showBack={true}
          title="AI Literacy Assessment"
        />
        
        <div className="section-padding">
          <div className="container-width">
            <div className="text-center mb-12 animate-fade-in-up">
              <h1 className="section-header font-display font-bold mb-4">
                Choose Your
                <span className="block bg-brand-gradient bg-clip-text text-transparent">
                  AI Literacy Path
                </span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Select the assessment format that best matches your current time and learning objectives
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {assessmentOptions.map((option, index) => (
                <div key={option.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.2}s` }}>
                  <AssessmentCard
                    title={option.title}
                    description={option.description}
                    estimatedTime={option.estimatedTime}
                    trackType={option.trackType}
                    onStart={option.id === 'conversational' ? () => handleSelectAssessment(option.id) : undefined}
                    className={option.id === 'conversational' ? 'ring-2 ring-primary shadow-purple' : ''}
                  />
                  {option.badge && (
                    <div className="flex justify-center mt-4">
                      <Badge 
                        variant={option.badge === 'Recommended' ? 'default' : 'secondary'}
                        className="font-medium"
                      >
                        {option.badge === 'Recommended' && <Sparkles className="h-3 w-3 mr-1" />}
                        {option.badge}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Why Choose Section */}
            <div className="mt-20 animate-fade-in-up">
              <h2 className="text-2xl font-heading font-semibold text-center mb-12">
                Why Start with AI Literacy?
              </h2>
              
              <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <Card className="text-center hover-lift">
                  <CardHeader>
                    <Target className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="font-heading text-lg font-semibold">
                      Strategic Foundation
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Build systematic thinking frameworks before diving into specific AI tools and implementations
                    </p>
                  </CardContent>
                </Card>

                <Card className="text-center hover-lift">
                  <CardHeader>
                    <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="font-heading text-lg font-semibold">
                      Leadership Readiness
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Develop the cognitive patterns needed to guide teams and organizations through AI transformation
                    </p>
                  </CardContent>
                </Card>

                <Card className="text-center hover-lift">
                  <CardHeader>
                    <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="font-heading text-lg font-semibold">
                      Future-Proof Skills
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Learn adaptable mental models that work across any AI technology or use case
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentScreen === 'assessment' && selectedAssessment === 'conversational') {
    return (
      <div className="min-h-screen bg-background">
        <ExecutiveNavigation 
          onBack={handleBackToSelection}
          showBack={true}
          title="AI Leadership Assessment"
        />
        <UnifiedAssessment onComplete={handleAssessmentComplete} />
      </div>
    );
  }

  // Results or other assessment types would go here
  return (
    <div className="min-h-screen bg-background">
      <ExecutiveNavigation />
      <div className="container-width section-padding">
        <div className="text-center">
          <h1 className="section-header font-display font-bold mb-4">
            Assessment Complete
          </h1>
          <p className="text-lg text-muted-foreground">
            Your personalized AI literacy insights are being generated...
          </p>
        </div>
      </div>
    </div>
  );
}