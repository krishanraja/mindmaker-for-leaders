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
  roleTitle: string;
  companySize: string;
  primaryFocus: string;
  timeline: string;
  consentToInsights: boolean;
}

interface ContactCollectionFormProps {
  onSubmit: (contactData: ContactData) => void;
  onBack?: () => void;
}

export const ContactCollectionForm: React.FC<ContactCollectionFormProps> = ({ onSubmit, onBack }) => {
  const [contactData, setContactData] = useState<ContactData>({
    fullName: '',
    companyName: '',
    email: '',
    roleTitle: '',
    companySize: '',
    primaryFocus: '',
    timeline: '',
    consentToInsights: false
  });
  const [errors, setErrors] = useState<Partial<ContactData>>({});
  const [showDisqualifiedMessage, setShowDisqualifiedMessage] = useState(false);

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

    if (!contactData.roleTitle.trim()) {
      newErrors.roleTitle = 'Role/title is required';
    }

    if (!contactData.companySize) {
      newErrors.companySize = 'Company size is required';
    }

    if (!contactData.primaryFocus) {
      newErrors.primaryFocus = 'Primary focus is required';
    }

    if (!contactData.timeline) {
      newErrors.timeline = 'Timeline is required';
    }

    if (!contactData.consentToInsights) {
      newErrors.consentToInsights = 'You must consent to receiving personalized insights' as any;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkDisqualification = () => {
    const disqualifyingRoles = ['student', 'unemployed', 'job seeker', 'looking for work'];
    const roleTitle = contactData.roleTitle.toLowerCase();
    
    return disqualifyingRoles.some(term => roleTitle.includes(term));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      if (checkDisqualification()) {
        setShowDisqualifiedMessage(true);
        return;
      }
      onSubmit(contactData);
    }
  };

  const handleInputChange = (field: keyof ContactData, value: string) => {
    setContactData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (showDisqualifiedMessage) {
    return (
      <div className="bg-background min-h-screen relative overflow-hidden flex items-center justify-center px-4">
        <Card className="max-w-2xl w-full shadow-sm border rounded-xl">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Thank You for Your Interest!
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Based on your current situation, we recommend exploring our free educational resources to build your AI knowledge foundation. These resources are designed to help you get started with AI leadership concepts.
            </p>
            <div className="space-y-4">
              <Button variant="cta" className="w-full rounded-xl" onClick={() => window.open('https://fractionl.ai/resources', '_blank')}>
                Access Free AI Resources
              </Button>
              {onBack && (
                <Button variant="outline" className="w-full rounded-xl" onClick={onBack}>
                  ← Back to Assessment
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            Help us personalize your AI leadership insights and recommendations by sharing a few details.
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
                  Full Name <span className="text-destructive">*</span>
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
                  Company Name <span className="text-destructive">*</span>
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
                  Email Address <span className="text-destructive">*</span>
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

              {/* Role/Title */}
              <div className="space-y-2">
                <Label htmlFor="roleTitle" className="text-foreground font-medium text-sm">
                  <User className="h-4 w-4 inline mr-2" />
                  Your Role/Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="roleTitle"
                  type="text"
                  value={contactData.roleTitle}
                  onChange={(e) => handleInputChange('roleTitle', e.target.value)}
                  className="rounded-xl"
                  placeholder="e.g., CEO, CTO, VP of Operations"
                  autoComplete="organization-title"
                  aria-describedby={errors.roleTitle ? "roleTitle-error" : undefined}
                />
                {errors.roleTitle && (
                  <p id="roleTitle-error" className="text-destructive text-sm" role="alert">{errors.roleTitle}</p>
                )}
              </div>

              {/* Company Size */}
              <div className="space-y-2">
                <Label htmlFor="companySize" className="text-foreground font-medium text-sm">
                  <Building className="h-4 w-4 inline mr-2" />
                  Company Size <span className="text-destructive">*</span>
                </Label>
                <select
                  id="companySize"
                  value={contactData.companySize}
                  onChange={(e) => handleInputChange('companySize', e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-describedby={errors.companySize ? "companySize-error" : undefined}
                >
                  <option value="">Select company size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="501-1000">501-1000 employees</option>
                  <option value="1000+">1000+ employees</option>
                </select>
                {errors.companySize && (
                  <p id="companySize-error" className="text-destructive text-sm" role="alert">{errors.companySize}</p>
                )}
              </div>

              {/* Primary AI Focus */}
              <div className="space-y-2">
                <Label htmlFor="primaryFocus" className="text-foreground font-medium text-sm">
                  What's your primary AI focus? <span className="text-destructive">*</span>
                </Label>
                <select
                  id="primaryFocus"
                  value={contactData.primaryFocus}
                  onChange={(e) => handleInputChange('primaryFocus', e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-describedby={errors.primaryFocus ? "primaryFocus-error" : undefined}
                >
                  <option value="">Select your primary focus</option>
                  <option value="Strategy & Vision">Building AI strategy & vision</option>
                  <option value="Team Enablement">Enabling my team with AI tools</option>
                  <option value="Process Automation">Automating business processes</option>
                  <option value="Product Innovation">AI-driven product innovation</option>
                  <option value="Competitive Advantage">Creating competitive advantage</option>
                  <option value="Cost Optimization">Cost optimization & efficiency</option>
                </select>
                {errors.primaryFocus && (
                  <p id="primaryFocus-error" className="text-destructive text-sm" role="alert">{errors.primaryFocus}</p>
                )}
              </div>

              {/* Implementation Timeline */}
              <div className="space-y-2">
                <Label htmlFor="timeline" className="text-foreground font-medium text-sm">
                  What's your timeline to kick off a sprint? <span className="text-destructive">*</span>
                </Label>
                <select
                  id="timeline"
                  value={contactData.timeline}
                  onChange={(e) => handleInputChange('timeline', e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-describedby={errors.timeline ? "timeline-error" : undefined}
                >
                  <option value="">Select timeline</option>
                  <option value="Immediate (0-30 days)">Immediate (0-30 days)</option>
                  <option value="Short-term (1-3 months)">Short-term (1-3 months)</option>
                  <option value="Medium-term (3-6 months)">Medium-term (3-6 months)</option>
                  <option value="Long-term (6-12 months)">Long-term (6-12 months)</option>
                  <option value="Exploring (12+ months)">Exploring (12+ months)</option>
                </select>
                {errors.timeline && (
                  <p id="timeline-error" className="text-destructive text-sm" role="alert">{errors.timeline}</p>
                )}
              </div>

              {/* Consent Checkbox */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="consentToInsights"
                    checked={contactData.consentToInsights}
                    onChange={(e) => handleInputChange('consentToInsights', e.target.checked ? 'true' : '')}
                    className="mt-1 h-4 w-4 rounded border-input"
                    aria-describedby={errors.consentToInsights ? "consent-error" : undefined}
                  />
                  <Label htmlFor="consentToInsights" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                    I consent to receiving personalized AI leadership insights and strategic recommendations from Krish based on my assessment results.
                  </Label>
                </div>
                {errors.consentToInsights && (
                  <p id="consent-error" className="text-destructive text-sm ml-7" role="alert">{errors.consentToInsights}</p>
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
                Your information is secure and will only be used to deliver your personalized AI leadership insights. You'll receive tailored strategic recommendations based on your unique profile and assessment results.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};