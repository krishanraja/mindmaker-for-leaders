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
    <div className="min-h-screen bg-background bg-dots flex items-center justify-center p-4 relative overflow-hidden emergency-fallback">
      {/* Header with theme toggle */}
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      
      {/* Animated background accents - with fallback */}
      <div 
        className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl opacity-10 animate-pulse"
        style={{ 
          background: 'var(--gradient-primary, linear-gradient(135deg, #7c3aed, #a855f7))',
        }}
      ></div>
      <div 
        className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl opacity-8 animate-pulse"
        style={{ 
          background: 'var(--gradient-primary, linear-gradient(135deg, #7c3aed, #a855f7))', 
          animationDelay: '1s' 
        }}
      ></div>
      
      <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10 animate-fade-in-up">
        
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
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display tracking-tight text-balance" style={{ fontFamily: 'Outfit, system-ui, sans-serif' }}>
              Become a{' '}
              <span className="text-primary" style={{ color: 'hsl(250 100% 63%)' }}>10× leader</span>
              .
            </h1>
            
            <p className="text-lg md:text-xl leading-relaxed text-foreground-secondary max-w-2xl mx-auto text-balance font-body">
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
              <Card className="p-8 text-center rounded-3xl bg-surface shadow-sm hover-lift group cursor-pointer flex flex-col h-full" style={{ background: 'white' }}>
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-purple group-hover:shadow-lg transition-all"
                      style={{ background: 'linear-gradient(135deg, hsl(250 100% 63%), hsl(248 100% 70%))' }}
                    >
                      <BarChart3 className="h-8 w-8" style={{ color: 'white' }} />
                    </div>
                  </div>
                  <CardTitle className="text-xl font-heading">Quick Form Assessment</CardTitle>
                  <p className="text-foreground-secondary leading-relaxed font-body">
                    Structured questionnaire with comprehensive analysis
                  </p>
                </CardHeader>
              <CardContent className="space-y-4 flex-grow flex flex-col">
                <div className="space-y-2 flex-grow">
                  <div className="flex items-center text-sm text-foreground-secondary font-body">
                    <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                    Proven methodology
                  </div>
                  <div className="flex items-center text-sm text-foreground-secondary font-body">
                    <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                    Comprehensive scoring
                  </div>
                  <div className="flex items-center text-sm text-foreground-secondary font-body">
                    <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                    Detailed results
                  </div>
                </div>
                
                  <div className="space-y-4 mt-auto">
                  <Button 
                    onClick={onStart}
                    className="w-full rounded-2xl px-8 py-6 font-heading"
                    style={{ 
                      background: 'linear-gradient(135deg, hsl(250 100% 63%), hsl(248 100% 70%))',
                      color: 'white'
                    }}
                    size="lg"
                    >
                      Take Assessment
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    
                    <div className="flex items-center justify-center text-xs text-foreground-muted font-body">
                      <Clock className="w-3 h-3 mr-1" />
                      Traditional diagnostic • 7 minutes
                    </div>
                  </div>
              </CardContent>
            </Card>

              {/* AI Business Consultant Card */}
              <Card className="p-8 text-center rounded-3xl bg-surface shadow-sm hover-lift group cursor-pointer flex flex-col h-full" style={{ background: 'white' }}>
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div 
                      className="relative w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-purple group-hover:shadow-lg transition-all"
                      style={{ background: 'linear-gradient(135deg, hsl(250 100% 63%), hsl(248 100% 70%))' }}
                    >
                      <MessageSquare className="h-8 w-8" style={{ color: 'white' }} />
                      <Badge 
                        variant="secondary" 
                        className="absolute -top-1 -right-1 text-xs px-2 py-1 text-primary-foreground"
                        style={{ background: 'hsl(38 92% 50%)', color: 'white' }}
                      >
                        BETA
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-xl font-heading">AI Business Consultant</CardTitle>
                  <p className="text-foreground-secondary leading-relaxed font-body">
                    Interactive conversation-based discovery with real-time insights
                  </p>
                </CardHeader>
              <CardContent className="space-y-4 flex-grow flex flex-col">
                <div className="space-y-2 flex-grow">
                  <div className="flex items-center text-sm text-foreground-secondary font-body">
                    <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                    Natural conversation flow
                  </div>
                  <div className="flex items-center text-sm text-foreground-secondary font-body">
                    <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                    Personalized guidance
                  </div>
                  <div className="flex items-center text-sm text-foreground-secondary font-body">
                    <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                    Immediate insights
                  </div>
                </div>
                
                <div className="space-y-4 mt-auto">
                  <Button 
                    onClick={() => window.location.href = '/chat-assessment'}
                    className="w-full rounded-2xl px-8 py-6 font-heading"
                    style={{ 
                      background: 'linear-gradient(135deg, hsl(250 100% 63%), hsl(248 100% 70%))',
                      color: 'white'
                    }}
                    size="lg"
                  >
                    Start AI Consultation
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  
                  <div className="flex items-center justify-center text-xs text-foreground-muted font-body">
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
          <p className="text-foreground-secondary max-w-2xl mx-auto text-balance font-body">
            Designed specifically for non-AI native business leaders ready to unlock their potential with AI.
          </p>
          <div className="flex flex-col md:flex-row justify-center text-sm text-foreground-secondary space-y-1 md:space-y-0 md:space-x-8 font-body">
            <span>✓ No Spam</span>
            <span>✓ Instant Results</span>
          </div>
        </div>
      </div>
    </div>
  );
};