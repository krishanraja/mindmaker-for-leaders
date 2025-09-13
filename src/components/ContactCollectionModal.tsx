import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExternalLink, Calendar, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ContactCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: 'learn_more' | 'book_call';
  sessionId?: string;
  assessmentData?: Record<string, any>;
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

const ContactCollectionModal: React.FC<ContactCollectionModalProps> = ({
  isOpen,
  onClose,
  actionType,
  sessionId,
  assessmentData
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
      // Save contact data to database - sync will be triggered automatically via database trigger
      const { data: insertData, error: insertError } = await supabase
        .from('booking_requests')
        .insert({
          session_id: sessionId,
          user_id: null,
          contact_name: `${contactData.firstName} ${contactData.lastName}`,
          contact_email: contactData.email,
          company_name: contactData.company,
          role: contactData.role,
          phone: contactData.phone || null,
          service_type: actionType === 'book_call' ? 'strategy_call' : 'learn_more',
          service_title: actionType === 'book_call' ? 'AI Leadership Strategy Call' : 'Learn More Request',
          status: 'pending',
          priority: 'high',
          specific_needs: `Assessment completed via ${assessmentData?.source || 'AI Chat'}. Contact request type: ${actionType}. Assessment data: ${JSON.stringify(assessmentData || {})}`,
          notes: `LinkedIn: ${contactData.linkedin || 'Not provided'}`,
          lead_score: assessmentData?.totalScore || 0
        })
        .select()
        .single();

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error(`Failed to save contact information: ${insertError.message}`);
      }

      console.log('Contact data saved successfully:', insertData);

      // Send email notification with assessment data
      try {
        const emailPayload = {
          data: {
            firstName: contactData.firstName,
            lastName: contactData.lastName,
            email: contactData.email,
            company: contactData.company,
            title: contactData.role,
            linkedinUrl: contactData.linkedin,
            ...assessmentData
          },
          scores: assessmentData?.scores || {},
          contactType: actionType,
          sessionId: sessionId
        };

        const { error: emailError } = await supabase.functions.invoke('send-diagnostic-email', {
          body: emailPayload
        });

        if (emailError) {
          console.error('Email sending failed:', emailError);
          // Don't fail the whole process if email fails
        } else {
          console.log('Email notification sent successfully');
        }
      } catch (emailError) {
        console.error('Email sending exception:', emailError);
        // Don't fail the whole process if email fails
      }

      // Create engagement analytics entry
      if (sessionId) {
        await supabase
          .from('engagement_analytics')
          .insert({
            session_id: sessionId,
            user_id: null,
            event_type: 'contact_collection',
            event_data: {
              action_type: actionType,
              contact_email: contactData.email,
              company_name: contactData.company,
              assessment_completion: true,
              timestamp: new Date().toISOString()
            }
          });
      }

      toast({
        title: "Success!",
        description: "Your information has been saved and synced. Redirecting you now...",
      });

      // Close modal and redirect
      onClose();
      
      if (actionType === 'learn_more') {
        window.open('https://www.makeyourmindup.ai', '_blank');
      } else {
        window.open('https://calendly.com/krish-raja', '_blank');
      }

    } catch (error) {
      console.error('Error saving contact data:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Error",
        description: `Failed to save your information: ${errorMessage}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalTitle = actionType === 'learn_more' 
    ? 'Learn More About AI Leadership'
    : 'Book Your Strategy Call';

  const modalDescription = actionType === 'learn_more'
    ? 'Before we take you to our detailed resources, please provide your contact information:'
    : 'Before we schedule your personalized AI leadership strategy call, please provide your contact information:';

  const buttonText = actionType === 'learn_more' 
    ? 'Continue to Learn More'
    : 'Continue to Book Call';

  const buttonIcon = actionType === 'learn_more' 
    ? <ExternalLink className="h-4 w-4" />
    : <Calendar className="h-4 w-4" />;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {buttonIcon}
            {modalTitle}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {modalDescription}
          </p>
        </DialogHeader>

        <div className="space-y-4">
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

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!isFormValid() || isSubmitting}
              className="flex-1 gap-2"
            >
              {isSubmitting ? 'Saving...' : buttonText}
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Your information will only be used to provide you with relevant AI leadership resources. 
            We never share your data with third parties.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactCollectionModal;