import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, MessageSquare, ArrowRight, Clock, CheckCircle } from 'lucide-react';

interface WelcomeScreenProps {
  onStart: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-4xl mx-auto text-center space-y-6 md:space-y-8">
        
        {/* Logo */}
        <div className="flex justify-center mb-6 md:mb-8">
          <img 
            src="/lovable-uploads/d8a8f60a-af0d-4247-8a66-e088bc097885.png" 
            alt="Company Logo" 
            className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 object-contain"
          />
        </div>

        {/* Main headline with neon animation */}
        <div className="space-y-3 md:space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-display font-black leading-[0.9] tracking-tight px-2">
            Become a{' '}
            <span className="relative inline-block">
              <span className="text-primary font-black underline decoration-primary decoration-2 md:decoration-4 underline-offset-2 md:underline-offset-4">10× leader</span>
              <div className="neon-line absolute inset-0 opacity-80"></div>
            </span>
            .
          </h1>
          
          <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-body font-medium px-4">
            Discover your leadership advantage with AI. 
            Transform how you work, decide, and influence in just 7 minutes.
          </p>
        </div>

        {/* Animated elements - responsive */}
        <div className="relative py-4 md:py-6">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 md:w-48 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60"></div>
          </div>
          
          <div className="relative bg-background px-4 md:px-8 py-4">
            <div className="flex flex-col md:flex-row items-center justify-center text-muted-foreground space-y-2 md:space-y-0 md:space-x-4 text-sm md:text-base">
              <span className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span>7 minutes</span>
              </span>
              <span className="hidden md:block w-px h-4 bg-border"></span>
              <span className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                <span>Personalized insights</span>
              </span>
              <span className="hidden md:block w-px h-4 bg-border"></span>
              <span className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                <span>Actionable roadmap</span>
              </span>
            </div>
          </div>
        </div>

        {/* Pathway Selection Cards */}
        <div className="pt-4">
          <p className="text-lg text-muted-foreground mb-8">
            Choose your assessment pathway:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Quick Form Assessment Card */}
            <Card className="group cursor-pointer border-2 hover:border-primary transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 bg-card/50 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <BarChart3 className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-xl font-bold">Quick Form Assessment</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Structured questionnaire with comprehensive analysis
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
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
                
                <Button 
                  onClick={onStart}
                  className="w-full group-hover:scale-105 transition-transform duration-300"
                  size="lg"
                >
                  Take Assessment
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                
                <div className="flex items-center justify-center text-xs text-muted-foreground/60 pt-2">
                  <Clock className="w-3 h-3 mr-1" />
                  Traditional diagnostic • 7 minutes
                </div>
              </CardContent>
            </Card>

            {/* AI Business Consultant Card */}
            <Card className="group cursor-pointer border-2 hover:border-primary transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 bg-card/50 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="relative p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <MessageSquare className="w-8 h-8 text-primary" />
                    <Badge 
                      variant="secondary" 
                      className="absolute -top-1 -right-1 text-xs bg-primary text-primary-foreground"
                    >
                      BETA
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-xl font-bold">AI Business Consultant</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Interactive conversation-based discovery with real-time insights
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
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
                
                <Button 
                  onClick={() => window.location.href = '/chat-assessment'}
                  variant="outline"
                  className="w-full group-hover:scale-105 transition-transform duration-300 border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  size="lg"
                >
                  Start AI Consultation
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                
                <div className="flex items-center justify-center text-xs text-muted-foreground/60 pt-2">
                  <Clock className="w-3 h-3 mr-1" />
                  No account required • 10-15 minutes
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="pt-8 md:pt-12 space-y-4">
          <p className="text-sm text-muted-foreground">
            Designed specifically for non-AI native business leaders ready to unlock their potential with AI.
          </p>
          <div className="flex flex-col md:flex-row justify-center text-xs text-muted-foreground/60 space-y-1 md:space-y-0 md:space-x-8">
            <span>✓ No Spam</span>
            <span>✓ Instant Results</span>
          </div>
        </div>
      </div>
    </div>
  );
};