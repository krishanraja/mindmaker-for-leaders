import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Brain, Target, Users } from "lucide-react";
import mindmakerLogo from "@/assets/mindmaker-logo-white.png";

interface HeroSectionProps {
  onStartAssessment: () => void;
}

export function HeroSection({ onStartAssessment }: HeroSectionProps) {
  return (
    <div className="hero-section hero-gradient min-h-screen relative overflow-hidden">
      {/* Hero Content - Optimized for new design system */}
      <div className="container-width relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-4">
        <div className="hero-glass-container w-full max-w-4xl mx-auto p-6 sm:p-8 md:p-10 lg:p-12">
          <div className="fade-in-up">
            <img 
              src={mindmakerLogo} 
              alt="MindMaker Logo" 
              className="h-16 mx-auto mb-6 sm:mb-8"
            />
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-4 sm:mb-6 leading-tight">
              AI Literacy for Leaders
            </h1>
          </div>
          
          <div className="fade-in-up max-w-2xl mx-auto mb-6 sm:mb-8">
            <p className="text-muted-foreground text-lg sm:text-xl md:text-2xl leading-relaxed">
              Take 2 minutes to benchmark your AI leadership capability.
            </p>
          </div>

          <div className="fade-in-up mb-8 sm:mb-12 w-full max-w-sm sm:max-w-md mx-auto">
            <Button 
              onClick={onStartAssessment}
              className="btn-hero-cta px-8 py-3 text-lg font-medium group w-full"
              aria-label="Start the AI Leadership Growth Benchmark"
            >
              Start the Benchmark
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}