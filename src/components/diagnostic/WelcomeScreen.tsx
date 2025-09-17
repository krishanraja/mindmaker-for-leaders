import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, MessageSquare, ArrowRight, Clock, CheckCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Navigation } from '@/components/Navigation';

interface WelcomeScreenProps {
  onStart: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-background bg-dots relative overflow-hidden emergency-fallback">
      {/* Navigation Bar */}
      <Navigation />
      
      {/* Theme toggle moved to top right with navigation space */}
      <div className="absolute top-6 right-6 z-40">
        <ThemeToggle />
      </div>
      
      {/* Main Content with top padding for fixed navigation */}
      <div className="pt-16 md:pt-20 flex items-center justify-center p-4 min-h-screen">
      
      {/* Animated background accents - with updated purple color */}
      <div 
        className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl opacity-10 animate-pulse"
        style={{ 
          background: 'linear-gradient(135deg, hsl(270 70% 60%), hsl(248 100% 70%))',
        }}
      ></div>
      <div 
        className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl opacity-8 animate-pulse"
        style={{ 
          background: 'linear-gradient(135deg, hsl(270 70% 60%), hsl(248 100% 70%))', 
          animationDelay: '1s' 
        }}
      ></div>
      
      <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10 animate-fade-in-up" id="assessment">
        

          {/* Main headline */}
          <div className="space-y-6">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-bold text-foreground mb-8 leading-tight mt-8">
              Become a
              <br />
              10×{' '}
              <span className="text-primary">
                leader
              </span>
            </h1>
            
            <p className="text-lg md:text-xl leading-relaxed text-foreground-secondary max-w-2xl mx-auto text-balance font-body">
              Discover your leadership advantage with AI. 
              Transform how you work, decide, and influence in just 7 minutes.
            </p>
          </div>

          {/* Single Assessment Call-to-Action */}
          <div className="space-y-8">
            <div className="max-w-2xl mx-auto">
              <Card className="p-8 text-center rounded-3xl bg-surface shadow-sm hover-lift group cursor-pointer" style={{ background: 'white' }}>
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-purple group-hover:shadow-lg transition-all"
                      style={{ background: 'linear-gradient(135deg, hsl(270 70% 60%), hsl(248 100% 70%))' }}
                    >
                      <BarChart3 className="h-8 w-8" style={{ color: 'white' }} />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-heading">AI Leadership Assessment</CardTitle>
                  <p className="text-foreground-secondary leading-relaxed font-body mt-4">
                    Intelligent assessment combining structured questions with AI-guided insights
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <CheckCircle className="w-5 h-5 text-primary" />
                      <span className="text-sm text-foreground-secondary font-body">15 Strategic Questions</span>
                    </div>
                    <div className="flex flex-col items-center space-y-2">
                      <CheckCircle className="w-5 h-5 text-primary" />
                      <span className="text-sm text-foreground-secondary font-body">AI-Guided Experience</span>
                    </div>
                    <div className="flex flex-col items-center space-y-2">
                      <CheckCircle className="w-5 h-5 text-primary" />
                      <span className="text-sm text-foreground-secondary font-body">Personalized Insights</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <Button 
                      onClick={onStart}
                      className="w-full rounded-2xl px-8 py-6 font-heading"
                      style={{ 
                        background: 'linear-gradient(135deg, hsl(270 70% 60%), hsl(248 100% 70%))',
                        color: 'white'
                      }}
                      size="lg"
                    >
                      Start AI Leadership Assessment
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    
                    <div className="flex items-center justify-center text-xs text-foreground-muted font-body">
                      <Clock className="w-3 h-3 mr-1" />
                      Comprehensive analysis • 10-12 minutes
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
    </div>
  );
};