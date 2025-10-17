import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import mindmakerLogo from "@/assets/mindmaker-logo.png";

interface HeroSectionProps {
  onStartAssessment: () => void;
}

export function HeroSection({ onStartAssessment }: HeroSectionProps) {
  return (
    <div className="hero-section-premium relative overflow-hidden">
      <div className="container-width relative z-10 flex flex-col items-center justify-center text-center px-6 py-20 md:py-32 lg:py-40">
        <div className="w-full max-w-4xl mx-auto space-y-8 md:space-y-10">
          <img 
            src={mindmakerLogo} 
            alt="MindMaker Logo" 
            className="w-[380px] h-auto mx-auto mb-6"
          />
          
          <h1 className="premium-hero-text mb-6 md:mb-8">
            Benchmark Your AI Leadership
          </h1>
          
          <p className="text-muted-foreground text-lg md:text-xl lg:text-2xl leading-relaxed max-w-2xl mx-auto font-light">
            Take 2 minutes to discover your AI literacy score and unlock personalized insights for executive growth.
          </p>

          <div className="pt-4">
            <Button 
              onClick={onStartAssessment}
              className="btn-hero-cta group"
              size="lg"
              aria-label="Start the AI Leadership Benchmark"
            >
              Start Here
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}