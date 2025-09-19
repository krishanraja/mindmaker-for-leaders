import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Brain, Target, Users } from "lucide-react";
import mindmakerLogo from "@/assets/mindmaker-logo.png";

interface HeroSectionProps {
  onStartAssessment: () => void;
}

export function HeroSection({ onStartAssessment }: HeroSectionProps) {
  return (
    <div className="bg-hero-clouds min-h-screen relative overflow-hidden">
      {/* Hero Content - Mobile App Optimized */}
      <div className="safe-area-padding relative z-10 flex flex-col items-center justify-center min-h-screen text-center text-white">
        <div className="animate-fade-in-up">
          <img 
            src={mindmakerLogo} 
            alt="Mindmaker Logo" 
            className="w-40 h-10 sm:w-48 sm:h-12 md:w-56 md:h-14 lg:w-64 lg:h-16 mx-auto mb-6 sm:mb-8 object-contain"
          />
          <h1 className="text-mobile-3xl md:text-4xl lg:text-5xl xl:text-6xl font-display font-bold mb-4 sm:mb-6 leading-tight">
            Business Leaders
          </h1>
        </div>
        
        <div className="animate-fade-in-up max-w-lg sm:max-w-2xl mb-6 sm:mb-8 px-4 sm:px-2">
          <p className="text-mobile-lg sm:text-xl font-medium mb-3 sm:mb-4 opacity-90 leading-relaxed">
            AI Literacy precedes AI leadership.
          </p>
          <p className="text-mobile-base sm:text-lg opacity-75 leading-relaxed">
            Take our 5 minute AI literacy assessment to get started on your journey.
          </p>
        </div>

        <div className="animate-fade-in-up mb-8 sm:mb-12 w-full max-w-sm sm:max-w-md">
          <Button 
            variant="hero" 
            onClick={onStartAssessment}
            className="group border border-gray-300/50 w-full mobile-button text-mobile-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            aria-label="Start AI Literacy Assessment"
          >
            Start Your AI Literacy Assessment
            <ArrowRight className="group-hover:translate-x-1 transition-transform ml-2 h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>

        {/* Feature Cards - Mobile App Optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 max-w-4xl animate-scale-in px-4 sm:px-0">
          <Card className="glass-card-dark border-white/20 hover:scale-105 transition-transform duration-300 rounded-xl">
            <CardContent className="touch-padding text-center">
              <Brain className="h-8 w-8 sm:h-10 sm:w-10 text-purple-200 mx-auto mb-3 sm:mb-4" />
              <h3 className="font-heading text-mobile-base sm:text-lg font-semibold mb-2 leading-tight">
                COGNITIVE FRAMEWORKS
              </h3>
              <p className="text-mobile-xs sm:text-sm text-white/90 leading-relaxed">
                Learn systematic thinking patterns for AI collaboration
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card-dark border-white/20 hover:scale-105 transition-transform duration-300 rounded-xl">
            <CardContent className="touch-padding text-center">
              <Target className="h-8 w-8 sm:h-10 sm:w-10 text-purple-200 mx-auto mb-3 sm:mb-4" />
              <h3 className="font-heading text-mobile-base sm:text-lg font-semibold mb-2 leading-tight">
                STRATEGIC LITERACY
              </h3>
              <p className="text-mobile-xs sm:text-sm text-white/90 leading-relaxed">
                Build executive-level understanding beyond tool usage
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card-dark border-white/20 hover:scale-105 transition-transform duration-300 sm:col-span-2 lg:col-span-1 rounded-xl">
            <CardContent className="touch-padding text-center">
              <Users className="h-8 w-8 sm:h-10 sm:w-10 text-purple-200 mx-auto mb-3 sm:mb-4" />
              <h3 className="font-heading text-mobile-base sm:text-lg font-semibold mb-2 leading-tight">
                LEADERSHIP READINESS
              </h3>
              <p className="text-mobile-xs sm:text-sm text-white/90 leading-relaxed">
                Prepare to become an AI orchestrator and leader
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Philosophy Statement */}
        <div className="mt-12 sm:mt-16 max-w-2xl sm:max-w-3xl animate-fade-in-up px-4 sm:px-0">
          <blockquote className="text-mobile-base sm:text-lg font-medium italic opacity-90 border-l-4 border-purple-200 pl-4 sm:pl-6 leading-relaxed">
            "Being AI literate is the critical pre-game before you become an AI orchestrator or AI leader"
          </blockquote>
        </div>
      </div>
    </div>
  );
}