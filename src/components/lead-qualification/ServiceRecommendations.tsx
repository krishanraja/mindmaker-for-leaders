import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar, 
  Users, 
  Target, 
  Rocket, 
  CheckCircle, 
  ArrowRight,
  Clock,
  Phone,
  Mail,
  Star
} from 'lucide-react';
import { ServiceRecommendation, LeadScore } from '@/hooks/useLeadQualification';

interface ServiceRecommendationsProps {
  recommendations: ServiceRecommendation[];
  leadScore: LeadScore;
  sessionId: string;
  userId: string | null; // Allow null for anonymous users
}

interface BookingForm {
  name: string;
  email: string;
  company: string;
  role: string;
  phone: string;
  preferredTime: string;
  specificNeeds: string;
  serviceType: string;
}

const ServiceRecommendations: React.FC<ServiceRecommendationsProps> = ({
  recommendations,
  leadScore,
  sessionId,
  userId
}) => {
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    name: '',
    email: '',
    company: '',
    role: '',
    phone: '',
    preferredTime: '',
    specificNeeds: '',
    serviceType: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceRecommendation | null>(null);
  const { toast } = useToast();

  const getServiceIcon = (type: ServiceRecommendation['type']) => {
    switch (type) {
      case 'consultation':
        return <Phone className="h-5 w-5" />;
      case 'workshop':
        return <Users className="h-5 w-5" />;
      case 'assessment':
        return <Target className="h-5 w-5" />;
      case 'implementation':
        return <Rocket className="h-5 w-5" />;
      default:
        return <CheckCircle className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: ServiceRecommendation['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    setIsSubmitting(true);
    try {
      // Save booking request to database for anonymous users  
      const { error } = await supabase
        .from('booking_requests')
        .insert({
          session_id: sessionId,
          user_id: userId, // Can be null for anonymous users
          service_type: selectedService.type,
          service_title: selectedService.title,
          contact_name: bookingForm.name,
          contact_email: bookingForm.email,
          company_name: bookingForm.company,
          role: bookingForm.role,
          phone: bookingForm.phone,
          preferred_time: bookingForm.preferredTime,
          specific_needs: bookingForm.specificNeeds,
          lead_score: leadScore.overall,
          priority: selectedService.priority,
          status: 'pending'
        });

      if (error) {
        console.error('Database insertion error:', error);
        // Continue with email sending even if database fails
      }

      // Send notification email via edge function
      await supabase.functions.invoke('send-booking-notification', {
        body: {
          booking: bookingForm,
          service: selectedService,
          leadScore: leadScore,
          sessionId: sessionId
        }
      });

      toast({
        title: "Booking Request Submitted!",
        description: `We'll contact you within 24 hours to schedule your ${selectedService.title}.`,
      });

      // Reset form
      setBookingForm({
        name: '', email: '', company: '', role: '', phone: '',
        preferredTime: '', specificNeeds: '', serviceType: ''
      });
      setSelectedService(null);

    } catch (error) {
      console.error('Error submitting booking:', error);
      toast({
        title: "Submission Error",
        description: "Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openBookingDialog = (service: ServiceRecommendation) => {
    setSelectedService(service);
    setBookingForm(prev => ({ ...prev, serviceType: service.type }));
  };

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            Continue the Conversation
          </h3>
          <p className="text-sm text-muted-foreground">
            Keep chatting to get personalized service recommendations based on your needs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lead Score Summary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Your AI Readiness Score: {leadScore.overall}/100
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-background rounded-lg">
              <div className="text-xl font-bold text-primary">
                {leadScore.qualification.budget + leadScore.qualification.authority + 
                 leadScore.qualification.need + leadScore.qualification.timeline}/100
              </div>
              <div className="text-xs text-muted-foreground">Business Readiness</div>
            </div>
            <div className="text-center p-3 bg-background rounded-lg">
              <div className="text-xl font-bold text-blue-600">
                {leadScore.readiness.aiMaturity + leadScore.readiness.teamReadiness + 
                 leadScore.readiness.organizationSize}/50
              </div>
              <div className="text-xs text-muted-foreground">AI Readiness</div>
            </div>
            <div className="text-center p-3 bg-background rounded-lg">
              <div className="text-xl font-bold text-green-600">
                {Math.min(leadScore.engagement.sessionDuration + leadScore.engagement.messageCount + 
                 leadScore.engagement.topicsExplored, 30)}/30
              </div>
              <div className="text-xs text-muted-foreground">Engagement Level</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Recommendations */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Recommended Next Steps</h3>
        
        {recommendations.map((service, index) => (
          <Card key={index} className="border-l-4 border-l-primary">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {getServiceIcon(service.type)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{service.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {service.description}
                    </p>
                  </div>
                </div>
                <Badge className={`${getPriorityColor(service.priority)} border`}>
                  {service.priority} priority
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium text-sm mb-2">Why this is recommended:</h4>
                <p className="text-sm text-muted-foreground">{service.reasoning}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm mb-2">What's included:</h4>
                <ul className="space-y-1">
                  {service.nextSteps.map((step, stepIndex) => (
                    <li key={stepIndex} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Response within 24 hours
                </div>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={() => openBookingDialog(service)}
                      className="flex items-center gap-2"
                    >
                      Book Now
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Book Your {service.title}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleBookingSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          placeholder="Full Name"
                          value={bookingForm.name}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, name: e.target.value }))}
                          required
                        />
                        <Input
                          type="email"
                          placeholder="Email"
                          value={bookingForm.email}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, email: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          placeholder="Company"
                          value={bookingForm.company}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, company: e.target.value }))}
                          required
                        />
                        <Input
                          placeholder="Your Role"
                          value={bookingForm.role}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, role: e.target.value }))}
                          required
                        />
                      </div>
                      <Input
                        type="tel"
                        placeholder="Phone Number"
                        value={bookingForm.phone}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, phone: e.target.value }))}
                      />
                      <Select 
                        value={bookingForm.preferredTime} 
                        onValueChange={(value) => setBookingForm(prev => ({ ...prev, preferredTime: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Preferred time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morning">Morning (9AM - 12PM)</SelectItem>
                          <SelectItem value="afternoon">Afternoon (12PM - 5PM)</SelectItem>
                          <SelectItem value="evening">Evening (5PM - 7PM)</SelectItem>
                          <SelectItem value="flexible">Flexible</SelectItem>
                        </SelectContent>
                      </Select>
                      <Textarea
                        placeholder="Specific needs or questions..."
                        value={bookingForm.specificNeeds}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, specificNeeds: e.target.value }))}
                        rows={3}
                      />
                      <Button type="submit" disabled={isSubmitting} className="w-full">
                        {isSubmitting ? "Submitting..." : "Submit Booking Request"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contact Alternative */}
      <Card className="bg-muted/50">
        <CardContent className="text-center py-6">
          <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium mb-2">Prefer to discuss directly?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Schedule a strategy call: <a href="https://calendly.com/krish-raja" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Book with Krish</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceRecommendations;