import React from 'react';
import { Button } from '@/components/ui/button';

interface WelcomeScreenProps {
  onStart: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="diagnostic-container text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Main headline with neon animation */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-outfit font-extralight leading-[0.9] tracking-tighter">
              Become a{' '}
              <span className="relative inline-block">
                <span className="text-primary font-light">10× leader</span>
                <div className="neon-line absolute inset-0 opacity-80"></div>
              </span>
              <br />
              Transform your impact with AI
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-inter font-light tracking-wide">
              Discover your leadership advantage with AI. 
              Transform how you work, decide, and influence in just 7 minutes.
            </p>
          </div>

          {/* Animated elements */}
          <div className="relative py-12">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60"></div>
            </div>
            
            <div className="relative bg-background px-8 py-4">
              <div className="flex items-center justify-center space-x-4 text-muted-foreground">
                <span className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <span>7 minutes</span>
                </span>
                <span className="w-px h-4 bg-border"></span>
                <span className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  <span>Personalized insights</span>
                </span>
                <span className="w-px h-4 bg-border"></span>
                <span className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                  <span>Actionable roadmap</span>
                </span>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="pt-8">
            <Button 
              onClick={onStart}
              size="lg"
              className="btn-primary text-xl px-12 py-6 hover:scale-105 transition-transform duration-300"
            >
              Start Your Diagnostic
              <div className="ml-3 text-2xl">✨</div>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="pt-12 space-y-4">
            <p className="text-sm text-muted-foreground">
              Join 1,000+ leaders already transforming their productivity
            </p>
            <div className="flex justify-center space-x-8 text-xs text-muted-foreground/60">
              <span>✓ GDPR Compliant</span>
              <span>✓ No Spam</span>
              <span>✓ Instant Results</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};