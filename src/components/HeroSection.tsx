import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Brain, Target, Users } from "lucide-react";
import mindmakerLogo from "@/assets/mindmaker-logo-white.png";

interface HeroSectionProps {
  onStartAssessment: () => void;
}

export function HeroSection({ onStartAssessment }: HeroSectionProps) {
  return (
    <div className="hero-section-clean min-h-screen relative overflow-hidden">
      <div className="container-width relative z-10 flex flex-col items-center justify-center text-center px-4 py-20 md:py-28 lg:py-32">
        <div className="w-full max-w-6xl mx-auto">
          <img 
            src={mindmakerLogo} 
            alt="MindMaker Logo" 
            className="h-12 md:h-14 mx-auto mb-8 md:mb-10"
          />
          
          <h1 className="text-foreground text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6 md:mb-8 leading-tight">
            AI Literacy for Leaders
          </h1>
          
          <p className="text-foreground/70 text-xl md:text-2xl lg:text-3xl leading-relaxed max-w-3xl mx-auto mb-10 md:mb-12">
            Take 2 minutes to benchmark your AI leadership capability.
          </p>

          <Button 
            onClick={onStartAssessment}
            className="btn-hero-cta group"
            aria-label="Start the AI Leadership Growth Benchmark"
          >
            Start the Benchmark
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}