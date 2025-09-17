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
      {/* Hero Content */}
      <div className="container-width relative z-10 flex flex-col items-center justify-center min-h-screen text-center text-white">
        <div className="animate-fade-in-up">
          <img 
            src={mindmakerLogo} 
            alt="Mindmaker Logo" 
            className="w-64 h-16 mx-auto mb-8 object-contain"
          />
          <h1 className="hero-title font-display font-bold mb-6">
            AI Literacy for Business Leaders
          </h1>
        </div>
        
        <div className="animate-fade-in-up max-w-2xl mb-8">
          <p className="text-xl font-medium mb-4 opacity-90">
            AI Literacy precedes AI leadership.
          </p>
          <p className="text-lg opacity-75">
            Take our 5 minute AI literacy assessment to get started on your journey.
          </p>
        </div>

        <div className="animate-fade-in-up mb-12">
          <Button 
            variant="hero" 
            size="xl" 
            onClick={onStartAssessment}
            className="group border border-gray-300/50"
          >
            Start Your AI Literacy Assessment
            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl animate-scale-in">
          <Card className="glass-card-dark border-white/20">
            <CardContent className="p-6 text-center">
              <Brain className="h-12 w-12 text-purple-200 mx-auto mb-4" />
              <h3 className="font-heading text-lg font-semibold mb-2">
                COGNITIVE FRAMEWORKS
              </h3>
              <p className="text-sm text-gray-300">
                Learn systematic thinking patterns for AI collaboration
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card-dark border-white/20">
            <CardContent className="p-6 text-center">
              <Target className="h-12 w-12 text-purple-200 mx-auto mb-4" />
              <h3 className="font-heading text-lg font-semibold mb-2">
                STRATEGIC LITERACY
              </h3>
              <p className="text-sm text-gray-300">
                Build executive-level understanding beyond tool usage
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card-dark border-white/20">
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 text-purple-200 mx-auto mb-4" />
              <h3 className="font-heading text-lg font-semibold mb-2">
                LEADERSHIP READINESS
              </h3>
              <p className="text-sm text-gray-300">
                Prepare to become an AI orchestrator and leader
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Philosophy Statement */}
        <div className="mt-16 max-w-3xl animate-fade-in-up">
          <blockquote className="text-lg font-medium italic opacity-90 border-l-4 border-purple-200 pl-6">
            "Being AI literate is the critical pre-game before you become an AI orchestrator or AI leader"
          </blockquote>
        </div>
      </div>
    </div>
  );
}