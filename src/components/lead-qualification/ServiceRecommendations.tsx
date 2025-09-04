import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ContactCollectionModal from '../ContactCollectionModal';
import { 
  TrendingUp, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  Zap,
  Target,
  Users,
  Calendar,
  ExternalLink,
  Star
} from 'lucide-react';

interface ServiceRecommendationsProps {
  qualificationData: any;
  leadScore: any;
  insights: any[];
  sessionId?: string;
}

const ServiceRecommendations: React.FC<ServiceRecommendationsProps> = ({
  qualificationData,
  leadScore,
  insights,
  sessionId
}) => {
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactActionType, setContactActionType] = useState<'learn_more' | 'book_call'>('book_call');
  
  // Get service recommendations based on lead score and data
  const getServiceRecommendations = () => {
    const overallScore = leadScore.overall || 0;
    const engagementScore = leadScore.engagement || 0;
    const businessScore = leadScore.business || 0;
    
    const recommendations = [];
    
    if (overallScore >= 70) {
      recommendations.push({
        title: "AI Leadership Accelerator Program",
        description: "Comprehensive 12-week program to become an AI-forward executive leader",
        price: "Custom pricing",
        duration: "12 weeks",
        features: [
          "1:1 AI leadership coaching",
          "Custom AI strategy development",
          "Executive AI toolkit implementation",
          "Team transformation guidance",
          "ROI measurement framework"
        ],
        priority: "high",
        icon: <Star className="h-6 w-6" />
      });
    }
    
    if (businessScore >= 60 || qualificationData.budgetRange === 'enterprise_100k+') {
      recommendations.push({
        title: "AI Strategy & Implementation Consulting",
        description: "Strategic consulting to develop and implement your AI transformation roadmap",
        price: "Starting at $15,000",
        duration: "8-16 weeks",
        features: [
          "AI readiness assessment",
          "Custom AI strategy roadmap",
          "Implementation planning",
          "Change management support",
          "Executive team training"
        ],
        priority: "high",
        icon: <Target className="h-6 w-6" />
      });
    }
    
    if (engagementScore >= 50) {
      recommendations.push({
        title: "Executive AI Coaching Package",
        description: "Personal coaching to rapidly develop your AI leadership capabilities",
        price: "Starting at $5,000",
        duration: "6 weeks",
        features: [
          "6 x 1-hour coaching sessions",
          "Personal AI toolkit setup",
          "Communication framework",
          "Quick wins implementation",
          "90-day action plan"
        ],
        priority: "medium",
        icon: <Users className="h-6 w-6" />
      });
    }
    
    // Always include the strategy call option
    recommendations.push({
      title: "AI Leadership Strategy Call",
      description: "60-minute strategy session to identify your highest-impact AI opportunities",
      price: "Complimentary",
      duration: "60 minutes",
      features: [
        "Personal AI assessment review",
        "Tailored quick wins strategy",
        "Implementation roadmap",
        "Resource recommendations",
        "Next steps planning"
      ],
      priority: "immediate",
      icon: <Calendar className="h-6 w-6" />
    });
    
    return recommendations;
  };

  const recommendations = getServiceRecommendations();
  const topInsights = insights.slice(0, 3);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'immediate': return 'secondary';
      default: return 'outline';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Recommended';
      case 'medium': return 'Good Fit';
      case 'immediate': return 'Start Here';
      default: return 'Available';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Your Personalized AI Leadership Path</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Based on your assessment results and lead score of {leadScore.overall || 0}/100, 
          here are the recommended next steps to accelerate your AI leadership journey.
        </p>
      </div>

      {/* Lead Score Summary */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{leadScore.overall || 0}</div>
              <div className="text-sm text-muted-foreground">Overall Readiness</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{leadScore.engagement || 0}</div>
              <div className="text-sm text-muted-foreground">Engagement Score</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{leadScore.business || 0}</div>
              <div className="text-sm text-muted-foreground">Business Readiness</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      {topInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Key Insights from Your Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topInsights.map((insight, index) => (
                <div key={index} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">{index + 1}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{insight.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{insight.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Recommendations */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold">Recommended Services</h3>
        
        <div className="grid gap-6">
          {recommendations.map((service, index) => (
            <Card key={index} className={`${
              service.priority === 'immediate' ? 'border-primary/50 bg-primary/5' : ''
            }`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-primary">{service.icon}</div>
                    <div>
                      <CardTitle className="text-lg">{service.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {service.description}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getPriorityColor(service.priority)}>
                    {getPriorityLabel(service.priority)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      <span>{service.price}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{service.duration}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">What's Included:</h4>
                    <ul className="space-y-1">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {service.priority === 'immediate' && (
                    <div className="pt-4">
                      <ContactCollectionModal
                        isOpen={showContactModal}
                        onClose={() => setShowContactModal(false)}
                        actionType={contactActionType}
                        sessionId={sessionId}
                        assessmentData={{ 
                          source: 'AI Chat Assessment',
                          ...qualificationData,
                          insights: insights
                        }}
                      />
                      
                      <Button 
                        size="lg" 
                        className="w-full"
                        onClick={() => {
                          setContactActionType('book_call');
                          setShowContactModal(true);
                        }}
                      >
                        <Calendar className="h-5 w-5 mr-2" />
                        Book Strategy Call
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <Card className="text-center bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-8">
          <h3 className="text-xl font-semibold mb-4">Ready to Begin Your AI Leadership Transformation?</h3>
          <p className="text-muted-foreground mb-6">
            Start with a complimentary strategy call to create your personalized AI leadership action plan.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => {
                setContactActionType('book_call');
                setShowContactModal(true);
              }}
              className="flex items-center gap-2"
            >
              <Calendar className="h-5 w-5" />
              Book Free Strategy Call
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => {
                setContactActionType('learn_more');
                setShowContactModal(true);
              }}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-5 w-5" />
              Learn More About Services
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceRecommendations;