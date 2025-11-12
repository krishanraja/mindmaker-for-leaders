import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, TrendingUp, FileText, Sparkles } from 'lucide-react';

interface ConsentFlags {
  index_publication: boolean;
  case_study: boolean;
  sales_outreach: boolean;
  product_improvements: boolean;
}

interface ConsentManagerProps {
  participantId?: string;
  userId?: string;
  initialConsent?: ConsentFlags;
  onUpdate?: (consent: ConsentFlags) => void;
}

const defaultConsent: ConsentFlags = {
  index_publication: false,
  case_study: false,
  sales_outreach: false,
  product_improvements: true,
};

export const ConsentManager: React.FC<ConsentManagerProps> = ({
  participantId,
  userId,
  initialConsent,
  onUpdate,
}) => {
  const [consent, setConsent] = useState<ConsentFlags>(initialConsent || defaultConsent);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (initialConsent) {
      setConsent(initialConsent);
    }
  }, [initialConsent]);

  const handleToggle = (key: keyof ConsentFlags) => {
    setConsent(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!participantId && !userId) {
      toast({
        title: "Error",
        description: "Cannot update consent: No user identified",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('index_participant_data')
        .update({ consent_flags: consent as any })
        .eq(participantId ? 'id' : 'user_id', participantId || userId!);

      if (error) throw error;

      toast({
        title: "Consent Updated",
        description: "Your privacy preferences have been saved successfully.",
      });

      onUpdate?.(consent);
    } catch (error) {
      console.error('Error updating consent:', error);
      toast({
        title: "Error",
        description: "Failed to update consent preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const consentOptions = [
    {
      key: 'index_publication' as keyof ConsentFlags,
      icon: TrendingUp,
      title: 'AI Leadership Index',
      description: 'Include my anonymized data in the quarterly AI Leadership Index publication',
    },
    {
      key: 'case_study' as keyof ConsentFlags,
      icon: FileText,
      title: 'Case Studies',
      description: 'Contact me about featuring my AI adoption journey in case studies',
    },
    {
      key: 'sales_outreach' as keyof ConsentFlags,
      icon: Shield,
      title: 'Service Updates',
      description: 'Receive information about relevant AI advisory services and workshops',
    },
    {
      key: 'product_improvements' as keyof ConsentFlags,
      icon: Sparkles,
      title: 'Product Improvements',
      description: 'Help improve this assessment tool (always enabled)',
      disabled: true,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Privacy & Consent
        </CardTitle>
        <CardDescription>
          Manage how your assessment data is used. You can change these preferences at any time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {consentOptions.map(({ key, icon: Icon, title, description, disabled }) => (
          <div key={key} className="flex items-start justify-between gap-4 pb-4 border-b last:border-0 last:pb-0">
            <div className="flex gap-3 flex-1">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1 flex-1">
                <Label htmlFor={key} className="text-base font-medium cursor-pointer">
                  {title}
                </Label>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            <Switch
              id={key}
              checked={consent[key]}
              onCheckedChange={() => handleToggle(key)}
              disabled={disabled || loading}
            />
          </div>
        ))}

        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Saving...' : 'Save Preferences'}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          All data is encrypted and handled according to our privacy policy. We never share personally identifiable information without explicit consent.
        </p>
      </CardContent>
    </Card>
  );
};
