import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Brain, Target, Users } from "lucide-react";

interface HeroSectionProps {
  onStartAssessment: () => void;
}

export function HeroSection({ onStartAssessment }: HeroSectionProps) {
  return (
    <div className="bg-hero-clouds min-h-screen relative overflow-hidden">
      {/* Hero Content - Optimized for new design system */}
      <div className="container-width relative z-10 flex flex-col items-center justify-center min-h-screen text-center">
        <div className="fade-in-up">
          {/* Placeholder for logo */}
          <div className="w-40 h-10 sm:w-48 sm:h-12 md:w-56 md:h-14 lg:w-64 lg:h-16 mx-auto mb-6 sm:mb-8 bg-white/20 rounded-lg flex items-center justify-center">
            <span className="text-white/80 text-sm font-medium">LOGO</span>
          </div>
          <h1 className="hero-heading hero-text-shimmer mb-4 sm:mb-6">
            Business Leaders
          </h1>
        </div>
        
        <div className="fade-in-up max-w-lg sm:max-w-2xl mb-6 sm:mb-8 mobile-padding">
          <p className="mobile-text-lg font-medium mb-3 sm:mb-4 text-white/90 leading-relaxed">
            AI Literacy precedes AI leadership.
          </p>
          <p className="mobile-text-base text-white/75 leading-relaxed">
            Take our 5 minute AI literacy assessment to get started on your journey.
          </p>
        </div>

        <div className="fade-in-up mb-8 sm:mb-12 w-full max-w-sm sm:max-w-md">
          <Button 
            onClick={onStartAssessment}
            className="btn-hero-primary mobile-button w-full group"
            aria-label="Start AI Literacy Assessment"
          >
            Start Your AI Literacy Assessment
            <ArrowRight className="animated-arrow ml-2 h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>

        {/* Feature Cards - Updated with bulletproof glass morphism */}
        <div className="responsive-grid max-w-4xl animate-scale-in mobile-padding">
          <Card className="glass-card-dark hover-scale">
            <CardContent className="mobile-padding text-center">
              <Brain className="h-8 w-8 sm:h-10 sm:w-10 text-white/70 mx-auto mb-3 sm:mb-4" />
              <h3 className="font-heading mobile-text-base font-semibold mb-2 leading-tight text-white">
                COGNITIVE FRAMEWORKS
              </h3>
              <p className="mobile-text-sm text-white/80 leading-relaxed">
                Learn systematic thinking patterns for AI collaboration
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card-dark hover-scale">
            <CardContent className="mobile-padding text-center">
              <Target className="h-8 w-8 sm:h-10 sm:w-10 text-white/70 mx-auto mb-3 sm:mb-4" />
              <h3 className="font-heading mobile-text-base font-semibold mb-2 leading-tight text-white">
                STRATEGIC LITERACY
              </h3>
              <p className="mobile-text-sm text-white/80 leading-relaxed">
                Build executive-level understanding beyond tool usage
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card-dark hover-scale sm:col-span-2 lg:col-span-1">
            <CardContent className="mobile-padding text-center">
              <Users className="h-8 w-8 sm:h-10 sm:w-10 text-white/70 mx-auto mb-3 sm:mb-4" />
              <h3 className="font-heading mobile-text-base font-semibold mb-2 leading-tight text-white">
                LEADERSHIP READINESS
              </h3>
              <p className="mobile-text-sm text-white/80 leading-relaxed">
                Prepare to become an AI orchestrator and leader
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Philosophy Statement */}
        <div className="mt-12 sm:mt-16 max-w-2xl sm:max-w-3xl fade-in-up mobile-padding">
          <blockquote className="mobile-text-base font-medium italic text-white/90 border-l-4 border-white/30 pl-4 sm:pl-6 leading-relaxed">
            "Being AI literate is the critical pre-game before you become an AI orchestrator or AI leader"
          </blockquote>
        </div>
      </div>
    </div>
  );
}