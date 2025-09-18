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
      {/* Hero Content - Mobile Optimized */}
      <div className="container-width relative z-10 flex flex-col items-center justify-center min-h-screen text-center text-white px-4 sm:px-6">
        <div className="animate-fade-in-up">
          <img 
            src={mindmakerLogo} 
            alt="Mindmaker Logo" 
            className="w-48 h-12 sm:w-56 sm:h-14 md:w-64 md:h-16 mx-auto mb-6 sm:mb-8 object-contain"
          />
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-display font-bold mb-4 sm:mb-6 leading-tight">
            Business Leaders'
          </h1>
        </div>
        
        <div className="animate-fade-in-up max-w-2xl mb-6 sm:mb-8 px-2">
          <p className="text-lg sm:text-xl font-medium mb-3 sm:mb-4 opacity-90">
            AI Literacy precedes AI leadership.
          </p>
          <p className="text-base sm:text-lg opacity-75 leading-relaxed">
            Take our 5 minute AI literacy assessment to get started on your journey.
          </p>
        </div>

        <div className="animate-fade-in-up mb-8 sm:mb-12 w-full max-w-sm sm:max-w-none">
          <Button 
            variant="hero" 
            size="xl" 
            onClick={onStartAssessment}
            className="group border border-gray-300/50 w-full sm:w-auto min-h-[48px] px-6 sm:px-8 text-sm sm:text-base"
            aria-label="Start AI Literacy Assessment"
          >
            Start Your AI Literacy Assessment
            <ArrowRight className="group-hover:translate-x-1 transition-transform ml-2" />
          </Button>
        </div>

        {/* Feature Cards - Mobile Optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl animate-scale-in">
          <Card className="glass-card-dark border-white/20 hover:scale-105 transition-transform duration-300">
            <CardContent className="p-4 sm:p-6 text-center">
              <Brain className="h-10 w-10 sm:h-12 sm:w-12 text-purple-200 mx-auto mb-3 sm:mb-4" />
              <h3 className="font-heading text-base sm:text-lg font-semibold mb-2">
                COGNITIVE FRAMEWORKS
              </h3>
              <p className="text-xs sm:text-sm text-white leading-relaxed">
                Learn systematic thinking patterns for AI collaboration
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card-dark border-white/20 hover:scale-105 transition-transform duration-300">
            <CardContent className="p-4 sm:p-6 text-center">
              <Target className="h-10 w-10 sm:h-12 sm:w-12 text-purple-200 mx-auto mb-3 sm:mb-4" />
              <h3 className="font-heading text-base sm:text-lg font-semibold mb-2">
                STRATEGIC LITERACY
              </h3>
              <p className="text-xs sm:text-sm text-white leading-relaxed">
                Build executive-level understanding beyond tool usage
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card-dark border-white/20 hover:scale-105 transition-transform duration-300 sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4 sm:p-6 text-center">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 text-purple-200 mx-auto mb-3 sm:mb-4" />
              <h3 className="font-heading text-base sm:text-lg font-semibold mb-2">
                LEADERSHIP READINESS
              </h3>
              <p className="text-xs sm:text-sm text-white leading-relaxed">
                Prepare to become an AI orchestrator and leader
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Philosophy Statement */}
        <div className="mt-16 max-w-3xl animate-fade-in-up">
          <blockquote className="text-lg font-medium italic opacity-90 border-l-4 border-purple-200 pl-6">
            "Being AI literate is the critical pre-game before you become{" "}
            <br />
            an AI orchestrator or AI leader"
          </blockquote>
        </div>
      </div>
    </div>
  );
}