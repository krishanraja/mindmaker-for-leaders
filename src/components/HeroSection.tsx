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
      <div className="container-width relative z-10 px-6 py-20 md:py-32 lg:py-40">
        <div className="glass-card p-8 md:p-12 lg:p-16 max-w-3xl space-y-8 md:space-y-10">
          <img 
            src={mindmakerLogo} 
            alt="MindMaker Logo" 
            className="w-[190px] h-auto -ml-[18px]"
          />
          
          <div className="min-h-[4rem] sm:min-h-[5rem] md:min-h-[6rem] lg:min-h-[7rem]">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-wide text-primary mb-6 md:mb-10 text-left">
              {displayedText}
              <span className="inline-block w-0.5 h-[0.9em] bg-primary ml-1 animate-[blink_1s_step-end_infinite] align-middle" />
            </h1>
          </div>
          
          <p className="text-muted-foreground text-xs md:text-sm font-normal leading-relaxed text-left mb-4 md:mb-6">
            Take 2 minutes to discover your AI literacy score and unlock personalized insights for executive growth.
          </p>

          <p className="text-sm text-muted-foreground mb-3">
            Talk to me like your chief of staff. I'll keep it under two minutes.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-start">
            <Button 
              onClick={onStartAssessment}
              className="btn-hero-cta group"
              size="lg"
            >
              Start with Voice (2 min) 🎙️
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button 
              onClick={onStartAssessment}
              variant="outline"
              size="lg"
            >
              Use Text Instead (5 min) ⌨️
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1 mt-4">
            <p>⚡ Faster than typing</p>
            <p>💬 Natural conversation</p>
            <p>🎯 Personalized instantly</p>
          </div>
        </div>
      </div>
    </div>
  );
}