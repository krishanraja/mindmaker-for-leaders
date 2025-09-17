import React, { useState } from 'react';
import { HeroSection } from './HeroSection';
import { ExecutiveNavigation } from './ExecutiveNavigation';
import { AssessmentCard } from './AssessmentCard';
import { UnifiedAssessment } from './UnifiedAssessment';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Target, Users, Clock } from 'lucide-react';

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
      <div className="bg-hero-clouds min-h-screen relative overflow-hidden">
        {/* Floating Glass Back Button */}
        <div className="absolute top-6 left-6 z-20">
          <Button
            variant="glass"
            onClick={handleBackToLanding}
            className="glass-button text-white hover:bg-white/20"
          >
            ← Back to Home
          </Button>
        </div>

        <div className="container-width relative z-10 flex flex-col items-center justify-center min-h-screen text-center text-white">
          <div className="section-padding">
            <div className="text-center mb-12 animate-fade-in-up">
              <h1 className="section-header font-display font-bold mb-4 text-white">
                Choose Your
                <span className="block bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                  AI Literacy Path
                </span>
              </h1>
              <p className="text-lg text-white/80 max-w-2xl mx-auto">
                Select the assessment format that best matches your current time and learning objectives
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {assessmentOptions.map((option, index) => (
                <div key={option.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.2}s` }}>
                  <Card className="glass-card-dark border-white/20 flex flex-col h-full">
                    <CardHeader className="min-h-[120px] flex flex-col">
                      <div className="flex items-start justify-between mb-2">
                        <Badge 
                          variant={option.trackType === "LEADERSHIP" ? "default" : "secondary"}
                          className="mb-2 bg-primary text-white"
                        >
                          {option.trackType}
                        </Badge>
                      </div>
                      <h3 className="font-heading text-xl font-semibold leading-tight text-white">
                        {option.title}
                      </h3>
                    </CardHeader>

                    <CardContent className="flex-1">
                      <p className="text-white/80 mb-4 leading-relaxed">
                        {option.description}
                      </p>
                      
                      <div className="flex items-center gap-2 text-sm text-white/70 mb-4">
                        <Clock className="h-4 w-4" />
                        <span>{option.estimatedTime}</span>
                      </div>
                    </CardContent>

                    <CardFooter className="mt-auto">
                      <Button 
                        onClick={option.id === 'conversational' ? () => handleSelectAssessment(option.id) : undefined}
                        className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                        variant="outline"
                        disabled={option.id !== 'conversational'}
                      >
                        {option.id === 'conversational' ? "Start Assessment" : "Coming Soon"}
                      </Button>
                    </CardFooter>
                  </Card>
                  
                  {option.badge && (
                    <div className="flex justify-center mt-4">
                      <Badge 
                        variant={option.badge === 'Recommended' ? 'default' : 'secondary'}
                        className="font-medium bg-white/10 text-white border-white/20"
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
              <h2 className="text-2xl font-heading font-semibold text-center mb-12 text-white">
                Why Start with AI Literacy?
              </h2>
              
              <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <Card className="glass-card-dark border-white/20 text-center hover-lift">
                  <CardHeader>
                    <Target className="h-12 w-12 text-purple-200 mx-auto mb-4" />
                    <h3 className="font-heading text-lg font-semibold text-white">
                      Strategic Foundation
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/80">
                      Build systematic thinking frameworks before diving into specific AI tools and implementations
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card-dark border-white/20 text-center hover-lift">
                  <CardHeader>
                    <Users className="h-12 w-12 text-purple-200 mx-auto mb-4" />
                    <h3 className="font-heading text-lg font-semibold text-white">
                      Leadership Readiness
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/80">
                      Develop the cognitive patterns needed to guide teams and organizations through AI transformation
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card-dark border-white/20 text-center hover-lift">
                  <CardHeader>
                    <Sparkles className="h-12 w-12 text-purple-200 mx-auto mb-4" />
                    <h3 className="font-heading text-lg font-semibold text-white">
                      Future-Proof Skills
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/80">
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
      <UnifiedAssessment 
        onComplete={handleAssessmentComplete} 
        onBack={handleBackToSelection}
      />
    );
  }

  // Results or other assessment types would go here
  return (
    <div className="bg-hero-clouds min-h-screen relative overflow-hidden">
      <div className="container-width relative z-10 flex flex-col items-center justify-center min-h-screen text-center text-white">
        <div className="section-padding">
          <h1 className="section-header font-display font-bold mb-4 text-white">
            Assessment Complete
          </h1>
          <p className="text-lg text-white/80">
            Your personalized AI literacy insights are being generated...
          </p>
        </div>
      </div>
    </div>
  );
}