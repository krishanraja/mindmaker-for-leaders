import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import mindmakerLogo from "@/assets/mindmaker-logo.png";
import { useState, useEffect } from "react";

interface HeroSectionProps {
  onStartAssessment: () => void;
}

export function HeroSection({ onStartAssessment }: HeroSectionProps) {
  const [displayedText, setDisplayedText] = useState("");
  const fullText = "Benchmark Your AI Leadership";
  
  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 80);
    
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="hero-section-premium relative overflow-hidden">
      <div className="container-width relative z-10 flex flex-col items-center justify-center text-center px-6 py-20 md:py-32 lg:py-40">
        <div className="w-full max-w-4xl mx-auto space-y-8 md:space-y-10">
          <img 
            src={mindmakerLogo} 
            alt="MindMaker Logo" 
            className="w-[190px] h-auto mx-auto mb-6"
          />
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-wide text-primary mb-6 md:mb-10 min-h-[3rem] sm:min-h-[3.5rem] md:min-h-[4rem] lg:min-h-[5rem]">
            {displayedText}
            <span className="inline-block w-0.5 h-[0.9em] bg-primary ml-1 animate-[blink_1s_step-end_infinite] align-middle" />
          </h1>
          
          <p className="text-muted-foreground text-xs md:text-sm font-normal leading-relaxed max-w-2xl mx-auto mb-4 md:mb-6">
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