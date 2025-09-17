import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, ArrowRight, Clock, Star } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AdvisorySprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessmentData: any;
  sessionId: string;
  scores: any;
}

interface ContactData {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  role: string;
  phone?: string;
  linkedin?: string;
}

const AdvisorySprintModal: React.FC<AdvisorySprintModalProps> = ({
  isOpen,
  onClose,
  assessmentData,
  sessionId,
  scores
}) => {
  const [contactData, setContactData] = useState<ContactData>({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    role: '',
    phone: '',
    linkedin: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: keyof ContactData, value: string) => {
    setContactData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    return contactData.firstName.trim() && 
           contactData.lastName.trim() && 
           contactData.email.trim() && 
           contactData.company.trim() && 
           contactData.role.trim();
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Starting Advisory Sprint booking notification...');
      
      // Send comprehensive data to the new edge function
      const { data, error } = await supabase.functions.invoke('send-advisory-sprint-notification', {
        body: {
          contactData,
          assessmentData,
          sessionId,
          scores
        }
      });

      if (error) {
        console.error('Advisory Sprint notification error:', error);
        throw new Error(`Failed to send notification: ${error.message}`);
      }

      console.log('Advisory Sprint notification sent successfully:', data);

      toast({
        title: "Success!",
        description: "Your Advisory Sprint request has been sent! Krish will receive all your assessment details and contact you shortly. Redirecting to calendar...",
      });

      // Close modal and redirect to Calendly
      onClose();
      
      // Small delay to let user see the success message
      setTimeout(() => {
        window.open('https://calendly.com/krish-raja/mindmaker-leaders', '_blank');
      }, 1500);

    } catch (error) {
      console.error('Error during Advisory Sprint booking:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Error",
        description: `Failed to send your request: ${errorMessage}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Book Your AI Advisory Sprint
          </DialogTitle>
          <p className="text-sm text-white/80">
            Reserve your 90-minute personalized AI leadership strategy session. Your complete assessment will be sent to Krish for preparation.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Service highlight */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-primary">AI Advisory Sprint</h3>
              <div className="flex items-center gap-1 text-sm text-emerald-600">
                <Star className="h-4 w-4" />
                <span>Premium Service</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>90 minutes</span>
              </div>
              <span>•</span>
              <span>Personalized strategy</span>
              <span>•</span>
              <span>Action plan included</span>
            </div>
          </div>

          {/* Contact form */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={contactData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={contactData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={contactData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="john.doe@company.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company *</Label>
            <Input
              id="company"
              value={contactData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              placeholder="Your Company"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role/Title *</Label>
            <Input
              id="role"
              value={contactData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              placeholder="CEO, VP, Director, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={contactData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn Profile</Label>
            <Input
              id="linkedin"
              type="url"
              value={contactData.linkedin}
              onChange={(e) => handleInputChange('linkedin', e.target.value)}
              placeholder="https://linkedin.com/in/johndoe"
            />
          </div>

          {/* Assessment preview */}
          <div className="bg-muted/50 p-3 rounded-lg border">
            <h4 className="text-sm font-medium mb-2">📊 Your Assessment Summary</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              {scores?.aiMindmakerScore && (
                <p><strong>AI Mindmaker Score:</strong> {scores.aiMindmakerScore}/100</p>
              )}
              <p><strong>Assessment ID:</strong> {sessionId?.substring(0, 8)}...</p>
              <p className="text-xs opacity-75">Complete assessment details will be sent to Krish for session preparation.</p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!isFormValid() || isSubmitting}
              className="flex-1 gap-2"
            >
              {isSubmitting ? 'Sending...' : 'Book Advisory Sprint'}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>

          <p className="text-xs text-white/70 text-center">
            Your information and complete assessment results will be securely sent to Krish for personalized session preparation.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdvisorySprintModal;