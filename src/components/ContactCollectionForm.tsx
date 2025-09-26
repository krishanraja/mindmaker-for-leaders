import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Building, Mail, ArrowRight } from 'lucide-react';

export interface ContactData {
  fullName: string;
  companyName: string;
  email: string;
}

interface ContactCollectionFormProps {
  onSubmit: (contactData: ContactData) => void;
  onBack?: () => void;
}

export const ContactCollectionForm: React.FC<ContactCollectionFormProps> = ({ onSubmit, onBack }) => {
  const [contactData, setContactData] = useState<ContactData>({
    fullName: '',
    companyName: '',
    email: ''
  });
  const [errors, setErrors] = useState<Partial<ContactData>>({});

  const validateForm = () => {
    const newErrors: Partial<ContactData> = {};
    
    if (!contactData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!contactData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }
    
    if (!contactData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(contactData);
    }
  };

  const handleInputChange = (field: keyof ContactData, value: string) => {
    setContactData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="bg-background min-h-screen relative overflow-hidden">
      {/* Back Button */}
      {onBack && (
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
          <Button
            variant="outline"
            onClick={onBack}
            className="rounded-xl"
            aria-label="Go back to assessment"
          >
            ← Back
          </Button>
        </div>
      )}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-6 sm:py-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 pt-12 sm:pt-16">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4 leading-tight">
            Almost Done!
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md sm:max-w-2xl mx-auto leading-relaxed">
            Please provide your contact details to personalize your results and receive your custom AI leadership development plan.
          </p>
        </div>

        <div className="max-w-lg sm:max-w-2xl mx-auto">
          {/* Contact Form */}
          <Card className="shadow-sm border rounded-xl">
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-foreground font-medium text-sm">
                  <User className="h-4 w-4 inline mr-2" />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={contactData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="rounded-xl"
                  placeholder="Enter your full name"
                  autoComplete="name"
                  aria-describedby={errors.fullName ? "fullName-error" : undefined}
                />
                {errors.fullName && (
                  <p id="fullName-error" className="text-destructive text-sm" role="alert">{errors.fullName}</p>
                )}
              </div>

              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-foreground font-medium text-sm">
                  <Building className="h-4 w-4 inline mr-2" />
                  Company Name
                </Label>
                <Input
                  id="companyName"
                  type="text"
                  value={contactData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className="rounded-xl"
                  placeholder="Enter your company name"
                  autoComplete="organization"
                  aria-describedby={errors.companyName ? "companyName-error" : undefined}
                />
                {errors.companyName && (
                  <p id="companyName-error" className="text-destructive text-sm" role="alert">{errors.companyName}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium text-sm">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={contactData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="rounded-xl"
                  placeholder="Enter your email address"
                  autoComplete="email"
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && (
                  <p id="email-error" className="text-destructive text-sm" role="alert">{errors.email}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="cta"
                className="w-full rounded-xl p-4"
                aria-label="Submit contact information to view personalized results"
              >
                View My Personalized Results
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </form>

              {/* Privacy Note */}
              <p className="text-muted-foreground text-xs text-center mt-6 leading-relaxed">
                Your information is secure and will only be used to personalize your assessment results and provide relevant AI leadership insights.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};