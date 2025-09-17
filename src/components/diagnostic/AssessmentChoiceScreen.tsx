import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { Clock, MessageCircle, Zap, Target, CheckCircle } from 'lucide-react';

interface AssessmentChoiceScreenProps {
  onChooseQuickForm: () => void;
  onChooseFullAssessment: () => void;
}

export const AssessmentChoiceScreen: React.FC<AssessmentChoiceScreenProps> = ({
  onChooseQuickForm,
  onChooseFullAssessment
}) => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="text-center space-y-6 mb-12">
            <div className="flex justify-center mb-8">
            </div>
            
            <h1 className={`font-bold tracking-tight ${
              isMobile ? 'text-3xl' : 'text-4xl md:text-5xl'
            }`}>
              Choose Your AI Leadership Assessment
            </h1>
            <p className={`text-muted-foreground max-w-3xl mx-auto ${
              isMobile ? 'text-lg' : 'text-xl'
            }`}>
              Two paths to discover your AI leadership potential. Both lead to personalized insights and coaching recommendations.
            </p>
          </div>

          {/* Assessment Options */}
          <div className={`grid gap-8 ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-2'}`}>
            
            {/* Quick Form Assessment */}
            <Card className="border-2 border-primary/20 hover:border-primary/40 transition-all cursor-pointer group">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                    <Zap className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-2xl">Quick Form Assessment</CardTitle>
                <p className="text-muted-foreground">Fast data collection for busy executives</p>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Key Features */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <span className="font-medium">3-5 minutes</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-primary" />
                    <span className="font-medium">5 strategic questions</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span className="font-medium">Immediate AI leadership score</span>
                  </div>
                </div>

                {/* What You'll Get */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">What You'll Get:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Personal AI Leadership Score (0-100)</li>
                    <li>• Executive-level insights and quick wins</li>
                    <li>• Personalized development recommendations</li>
                    <li>• Priority strategy call booking</li>
                  </ul>
                </div>

                <Button 
                  onClick={onChooseQuickForm}
                  className="w-full btn-primary"
                  size="lg"
                >
                  Start Quick Assessment
                </Button>
              </CardContent>
            </Card>

            {/* AI Business Consultant */}
            <Card className="border-2 border-secondary/20 hover:border-secondary/40 transition-all cursor-pointer group">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-secondary/10 rounded-full group-hover:bg-secondary/20 transition-colors">
                    <MessageCircle className="h-8 w-8 text-secondary-foreground" />
                  </div>
                </div>
                <CardTitle className="text-2xl">AI Business Consultant</CardTitle>
                <p className="text-muted-foreground">Conversational exploration with AI advisor</p>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Key Features */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-secondary-foreground" />
                    <span className="font-medium">10-15 minutes</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-5 w-5 text-secondary-foreground" />
                    <span className="font-medium">Adaptive conversation flow</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-secondary-foreground" />
                    <span className="font-medium">Deep personalized insights</span>
                  </div>
                </div>

                {/* What You'll Get */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">What You'll Get:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Comprehensive AI leadership analysis</li>
                    <li>• Strategic business insights and recommendations</li>
                    <li>• Contextual leadership development roadmap</li>
                    <li>• Executive summary with competitive positioning</li>
                  </ul>
                </div>

                <Button 
                  onClick={onChooseFullAssessment}
                  variant="secondary"
                  className="w-full"
                  size="lg"
                >
                  Start AI Conversation
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Section */}
          <div className="text-center mt-12 space-y-4">
            <p className="text-muted-foreground">
              Both assessments include a complimentary strategy call to discuss your results
            </p>
            <div className="flex justify-center">
              <Button 
                variant="ghost" 
                onClick={() => window.open('https://calendly.com/krish-raja', '_blank')}
                className="text-primary hover:text-primary/80"
              >
                Schedule Strategy Call Directly →
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};