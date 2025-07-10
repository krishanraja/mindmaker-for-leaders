import React from 'react';
import { Button } from '@/components/ui/button';

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

        {/* CTA Button - mobile optimized */}
        <div className="pt-4">
          <Button 
            onClick={onStart}
            size="lg"
            className="btn-primary hover:scale-105 transition-transform duration-300 text-lg md:text-xl px-8 md:px-12 py-4 md:py-6 w-full max-w-sm md:max-w-none md:w-auto mx-auto"
          >
            Start your Mindmaking Diagnostic
            <div className="ml-3 text-xl md:text-2xl">✨</div>
          </Button>
        </div>

        {/* Trust indicators */}
        <div className="pt-8 md:pt-12 space-y-4">
          <p className="text-sm text-muted-foreground">
            Join leaders from around the globe levelling up.
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