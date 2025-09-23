import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Brain, Target, Users } from "lucide-react";
import mindmakerLogo from "@/assets/mindmaker-logo-white.png";

interface HeroSectionProps {
  onStartAssessment: () => void;
}

export function HeroSection({ onStartAssessment }: HeroSectionProps) {
  return (
    <div className="hero-section bg-hero-clouds min-h-screen relative overflow-hidden">
      {/* Hero Content - Optimized for new design system */}
      <div className="container-width relative z-10 flex flex-col items-center justify-center min-h-screen text-center">
        <div className="fade-in-up">
          <img 
            src={mindmakerLogo} 
            alt="MindMaker Logo" 
            className="h-16 mx-auto mb-6 sm:mb-8"
          />
          <h1 className="hero-heading hero-text-shimmer text-white mb-4 sm:mb-6">
            Business Leaders
          </h1>
        </div>
        
        <div className="fade-in-up max-w-2xl mb-6 sm:mb-8 mobile-padding">
          <p className="mobile-text-lg text-white/90 leading-relaxed">
            Take our 5-minute assessment to evaluate your AI readiness.
          </p>
        </div>

        <div className="fade-in-up mb-8 sm:mb-12 w-full max-w-sm sm:max-w-md">
          <Button 
            onClick={onStartAssessment}
            className="btn-hero-primary px-8 py-3 text-lg font-medium group"
            aria-label="Start AI Literacy Assessment"
          >
            Start Assessment
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

      </div>
    </div>
  );
}