import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, MessageSquare, ArrowRight, Clock, CheckCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface WelcomeScreenProps {
  onStart: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen section-editorial bg-background">
      {/* Header with theme toggle */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      
      <div className="container-editorial flex items-center justify-center min-h-screen">
        <div className="max-w-4xl mx-auto text-center space-y-8 fade-in-up">
        
        {/* Logo */}
        <div className="flex justify-center mb-6 md:mb-8">
          <img 
            src="/lovable-uploads/d8a8f60a-af0d-4247-8a66-e088bc097885.png" 
            alt="Company Logo" 
            className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 object-contain"
          />
        </div>

          {/* Main headline */}
          <div className="space-y-6">
            <h1 className="headline-xl text-balance">
              Become a{' '}
              <span className="text-primary link-underline">10× leader</span>
              .
            </h1>
            
            <p className="body-lg text-muted-foreground max-w-2xl mx-auto text-balance">
              Discover your leadership advantage with AI. 
              Transform how you work, decide, and influence in just 7 minutes.
            </p>
          </div>

          {/* Pathway Selection Cards */}
          <div className="space-y-8">
            <p className="body-md text-muted-foreground">
              Choose your assessment pathway:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Quick Form Assessment Card */}
              <Card className="card-editorial card-hover group cursor-pointer border border-border/50 hover:border-primary/30 flex flex-col h-full">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <BarChart3 className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="headline-md">Quick Form Assessment</CardTitle>
                  <p className="text-muted-foreground leading-relaxed">
                    Structured questionnaire with comprehensive analysis
                  </p>
                </CardHeader>
              <CardContent className="space-y-4 flex-grow flex flex-col">
                <div className="space-y-2 flex-grow">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                    Proven methodology
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                    Comprehensive scoring
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                    Detailed results
                  </div>
                </div>
                
                  <div className="space-y-4 mt-auto">
                    <Button 
                      onClick={onStart}
                      className="btn-editorial w-full"
                      size="lg"
                    >
                      Take Assessment
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    
                    <div className="flex items-center justify-center text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 mr-1" />
                      Traditional diagnostic • 7 minutes
                    </div>
                  </div>
              </CardContent>
            </Card>

              {/* AI Business Consultant Card */}
              <Card className="card-editorial card-hover group cursor-pointer border border-border/50 hover:border-primary/30 flex flex-col h-full">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="relative p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <MessageSquare className="w-6 h-6 text-primary" />
                      <Badge 
                        variant="secondary" 
                        className="absolute -top-1 -right-1 text-xs bg-primary text-primary-foreground px-2 py-1"
                      >
                        BETA
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="headline-md">AI Business Consultant</CardTitle>
                  <p className="text-muted-foreground leading-relaxed">
                    Interactive conversation-based discovery with real-time insights
                  </p>
                </CardHeader>
              <CardContent className="space-y-4 flex-grow flex flex-col">
                <div className="space-y-2 flex-grow">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                    Natural conversation flow
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                    Personalized guidance
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                    Immediate insights
                  </div>
                </div>
                
                  <div className="space-y-4 mt-auto">
                    <Button 
                      onClick={() => window.location.href = '/chat-assessment'}
                      className="btn-editorial w-full"
                      size="lg"
                    >
                      Start AI Consultation
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    
                    <div className="flex items-center justify-center text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 mr-1" />
                      No account required • 10-15 minutes
                    </div>
                  </div>
              </CardContent>
                </Card>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="space-y-4">
            <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
              Designed specifically for non-AI native business leaders ready to unlock their potential with AI.
            </p>
            <div className="flex flex-col md:flex-row justify-center text-sm text-muted-foreground space-y-1 md:space-y-0 md:space-x-8">
              <span>✓ No Spam</span>
              <span>✓ Instant Results</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};