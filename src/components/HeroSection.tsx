import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Brain, Target, Users } from "lucide-react";

interface HeroSectionProps {
  onStartAssessment: () => void;
}

export function HeroSection({ onStartAssessment }: HeroSectionProps) {
  return (
    <div className="bg-hero-clouds min-h-screen relative overflow-hidden">
      {/* Hero Content */}
      <div className="container-width relative z-10 flex flex-col items-center justify-center min-h-screen text-center text-white">
        <div className="animate-fade-in-up">
          <h1 className="hero-title font-display font-bold mb-6">
            Transform How You
            <span className="block bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Think About AI
            </span>
          </h1>
        </div>
        
        <div className="animate-fade-in-up max-w-2xl mb-8">
          <p className="text-xl font-medium mb-4 opacity-90">
            AI has learned human language, but humans haven't learned AI's way of thinking
          </p>
          <p className="text-lg opacity-75">
            Build the cognitive frameworks and mental models to think, reason, and collaborate effectively with AI systems
          </p>
        </div>

        <div className="animate-fade-in-up mb-12">
          <Button 
            variant="hero" 
            size="xl" 
            onClick={onStartAssessment}
            className="group"
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
              <p className="text-sm opacity-80">
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
              <p className="text-sm opacity-80">
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
              <p className="text-sm opacity-80">
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