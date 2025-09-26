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
      <div className="container-width relative z-10 flex flex-col items-center justify-center min-h-screen text-center">
        <div className="fade-in-up">
          <img 
            src={mindmakerLogo} 
            alt="MindMaker Logo" 
            className="h-16 mx-auto mb-6 sm:mb-8"
          />
          <h1 className="!text-white text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-4 sm:mb-6 leading-tight">
            Is your AI literacy driving growth—<span className="block">or just buzzwords?</span>
          </h1>
        </div>
        
        <div className="fade-in-up max-w-2xl mb-6 sm:mb-8 mobile-padding">
          <p className="!text-white/90 text-lg sm:text-xl md:text-2xl leading-relaxed">
            Take 2 minutes to benchmark your AI leadership capability.
          </p>
        </div>

        <div className="fade-in-up mb-8 sm:mb-12 w-full max-w-sm sm:max-w-md">
          <Button 
            onClick={onStartAssessment}
            className="btn-hero-secondary px-8 py-3 text-lg font-medium group transform hover:scale-105 transition-all shadow-lg"
            aria-label="Start the AI Leadership Growth Benchmark"
          >
            Start the Benchmark
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1 !text-white" />
          </Button>
        </div>

      </div>
    </div>
  );
}