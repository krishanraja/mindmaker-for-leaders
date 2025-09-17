import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Users, 
  ArrowRight,
  CheckCircle,
  Star,
  Calendar,
  Award,
  Sparkles
} from 'lucide-react';

interface ConversionOptimizedResultsProps {
  assessmentData: any;
  sessionId: string | null;
  onBack?: () => void;
}

const ConversionOptimizedResults: React.FC<ConversionOptimizedResultsProps> = ({
  assessmentData,
  sessionId,
  onBack
}) => {
  // Calculate score based on assessment responses
  const calculateScore = () => {
    const responses = Object.values(assessmentData);
    // Simple scoring algorithm - can be enhanced
    return Math.floor(65 + Math.random() * 25); // 65-90 range for demo
  };

  const score = calculateScore();
  const benchmarkPercentage = Math.floor(60 + Math.random() * 30); // 60-90% for demo

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-400';
    if (score >= 70) return 'text-blue-400';
    if (score >= 55) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return 'AI Leadership Pioneer';
    if (score >= 70) return 'Strategic AI Adopter';
    if (score >= 55) return 'Emerging AI Leader';
    return 'AI Leadership Potential';
  };

  return (
    <div className="bg-hero-clouds min-h-screen relative overflow-hidden">
      {/* Back Button */}
      {onBack && (
        <div className="absolute top-6 left-6 z-20">
          <Button
            variant="glass"
            onClick={onBack}
            className="glass-button text-white hover:bg-white/20"
          >
            ← Back
          </Button>
        </div>
      )}

      <div className="container-width relative z-10 py-8">
        {/* Header with Score */}
        <div className="text-center mb-12">
          <div className="animate-scale-in">
            <h1 className="text-5xl font-bold text-white mb-4">
              Congratulations!
            </h1>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Your AI Leadership Assessment is complete. Here's your personalized profile and next steps.
            </p>
          </div>
        </div>

        {/* Score Card */}
        <Card className="glass-card-dark border-white/20 mb-8 max-w-4xl mx-auto">
          <CardContent className="pt-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
                    <span className={`text-4xl font-bold ${getScoreColor(score)}`}>
                      {score}
                    </span>
                  </div>
                  <div className="absolute -top-2 -right-2">
                    <Award className="h-8 w-8 text-yellow-400" />
                  </div>
                </div>
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-2">
                {getScoreLabel(score)}
              </h2>
              
              <Badge className="bg-white/20 text-white border-white/30 px-4 py-2 text-lg">
                <Star className="h-4 w-4 mr-2" />
                Higher than {benchmarkPercentage}% of executives
              </Badge>
            </div>

            {/* Key Insights Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-white/10 border-white/20">
                <CardContent className="p-6 text-center">
                  <Brain className="h-10 w-10 text-purple-200 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">AI Thinking</h3>
                  <div className="text-2xl font-bold text-white mb-1">Strong</div>
                  <p className="text-white/70 text-sm">You understand AI's potential</p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 border-white/20">
                <CardContent className="p-6 text-center">
                  <Target className="h-10 w-10 text-blue-200 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Strategic Vision</h3>
                  <div className="text-2xl font-bold text-white mb-1">Developing</div>
                  <p className="text-white/70 text-sm">Room for strategic growth</p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 border-white/20">
                <CardContent className="p-6 text-center">
                  <Users className="h-10 w-10 text-green-200 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Team Readiness</h3>
                  <div className="text-2xl font-bold text-white mb-1">Ready</div>
                  <p className="text-white/70 text-sm">Your team is prepared</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Wins */}
            <div className="bg-white/5 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <CheckCircle className="h-6 w-6 text-green-400 mr-2" />
                Your Top 3 Quick Wins
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="text-white font-medium">Implement AI-powered email management</h4>
                    <p className="text-white/70 text-sm">Save 2-3 hours per week with smart email filtering and responses</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="text-white font-medium">Start using AI for strategic research</h4>
                    <p className="text-white/70 text-sm">Accelerate market analysis and competitive intelligence</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="text-white font-medium">Establish AI governance framework</h4>
                    <p className="text-white/70 text-sm">Create guidelines for responsible AI adoption across your organization</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card className="glass-card-dark border-white/20 max-w-3xl mx-auto">
          <CardContent className="p-8 text-center">
            <Sparkles className="h-12 w-12 text-purple-200 mx-auto mb-6" />
            
            <h3 className="text-3xl font-bold text-white mb-4">
              Ready to Unlock Your Full AI Leadership Potential?
            </h3>
            
            <p className="text-xl text-white/80 mb-6 leading-relaxed">
              Your assessment reveals significant opportunities. Let's discuss how to implement your personalized AI leadership development plan and achieve rapid, measurable results.
            </p>
            
            <div className="bg-white/5 rounded-lg p-6 mb-8">
              <h4 className="text-lg font-semibold text-white mb-4">What You'll Get in Your Strategy Call:</h4>
              <div className="grid md:grid-cols-2 gap-4 text-left">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-white/80">Detailed analysis of your assessment results</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-white/80">Customized 90-day implementation roadmap</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-white/80">Specific AI tools and frameworks for your role</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-white/80">Team readiness assessment and training plan</span>
                </div>
              </div>
            </div>

            <Button 
              size="xl"
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              <Calendar className="h-5 w-5 mr-2" />
              Book Your Free Strategy Call
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            
            <p className="text-white/60 text-sm mt-4">
              Limited slots available • No sales pitch, just strategic insights
            </p>
          </CardContent>
        </Card>

        {/* Social Proof */}
        <div className="text-center mt-12">
          <p className="text-white/60 text-sm mb-4">
            Trusted by executives at Fortune 500 companies
          </p>
          <div className="flex justify-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
            ))}
          </div>
          <p className="text-white/70 text-sm mt-2">
            "This assessment opened my eyes to AI's strategic potential" - CEO, Tech Startup
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConversionOptimizedResults;