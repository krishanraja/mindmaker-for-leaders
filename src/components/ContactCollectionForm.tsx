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
    <div className="bg-hero-clouds min-h-screen relative overflow-hidden">
      {/* Back Button - Mobile App Optimized */}
      {onBack && (
        <div className="absolute top-safe-5 left-5 sm:top-6 sm:left-6 z-20">
          <Button
            variant="glass"
            onClick={onBack}
            className="glass-button text-white hover:bg-white/20 mobile-button rounded-xl"
            aria-label="Go back to assessment"
          >
            ← Back
          </Button>
        </div>
      )}

      <div className="safe-area-padding relative z-10 py-6 sm:py-8">
        <div className="max-w-lg sm:max-w-2xl mx-auto">
          {/* Header - Mobile App Optimized */}
          <div className="text-center mobile-section">
            <h1 className="text-mobile-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4 leading-tight">
              Almost Done!
            </h1>
            <p className="text-mobile-base sm:text-lg text-white/80 max-w-md sm:max-w-2xl mx-auto leading-relaxed">
              Please provide your contact details to personalize your results and receive your custom AI leadership development plan.
            </p>
          </div>

        {/* Contact Form - Mobile App Optimized */}
        <Card className="glass-card-dark border-white/20 rounded-xl">
          <CardContent className="touch-padding">
            <form onSubmit={handleSubmit} className="touch-spacing">
              {/* Full Name */}
              <div className="space-y-3">
                <Label htmlFor="fullName" className="text-white font-medium text-mobile-base">
                  <User className="h-4 w-4 inline mr-2" />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={contactData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 touch-target text-mobile-base rounded-xl"
                  placeholder="Enter your full name"
                  autoComplete="name"
                  aria-describedby={errors.fullName ? "fullName-error" : undefined}
                />
                {errors.fullName && (
                  <p id="fullName-error" className="text-red-400 text-mobile-sm" role="alert">{errors.fullName}</p>
                )}
              </div>

              {/* Company Name */}
              <div className="space-y-3">
                <Label htmlFor="companyName" className="text-white font-medium text-mobile-base">
                  <Building className="h-4 w-4 inline mr-2" />
                  Company Name
                </Label>
                <Input
                  id="companyName"
                  type="text"
                  value={contactData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 touch-target text-mobile-base rounded-xl"
                  placeholder="Enter your company name"
                  autoComplete="organization"
                  aria-describedby={errors.companyName ? "companyName-error" : undefined}
                />
                {errors.companyName && (
                  <p id="companyName-error" className="text-red-400 text-mobile-sm" role="alert">{errors.companyName}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-3">
                <Label htmlFor="email" className="text-white font-medium text-mobile-base">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={contactData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 touch-target text-mobile-base rounded-xl"
                  placeholder="Enter your email address"
                  autoComplete="email"
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && (
                  <p id="email-error" className="text-red-400 text-mobile-sm" role="alert">{errors.email}</p>
                )}
              </div>

              {/* Submit Button - Mobile App Optimized */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white mobile-button text-mobile-base sm:text-lg font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-xl"
                aria-label="Submit contact information to view personalized results"
              >
                View My Personalized Results
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 ml-2 sm:ml-3" />
              </Button>
            </form>

              {/* Privacy Note */}
              <p className="text-white/60 text-mobile-xs text-center mt-6 leading-relaxed">
                Your information is secure and will only be used to personalize your assessment results and provide relevant AI leadership insights.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};