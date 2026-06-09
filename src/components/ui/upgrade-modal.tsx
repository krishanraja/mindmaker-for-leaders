import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Lock, Zap } from 'lucide-react';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: (upgradeType?: 'full_diagnostic' | 'deep_context' | 'bundle') => void;
  upgradeType?: 'full_diagnostic' | 'deep_context' | 'bundle';
}

const diagnosticBenefits = [
  'Full risk profile (all 4 signals)',
  'All tensions and contradictions',
  'Complete org scenarios',
  'Full 3-move action plan',
  'Complete prompt library',
  'Exportable executive report (PDF)',
];

const contextBenefits = [
  'Company-specific insights from Apollo.io',
  'Enhanced meeting prep materials',
  'Board-ready context integration',
  'Website and deck analysis',
  'Personalized strategic recommendations',
];

const bundleBenefits = [
  ...diagnosticBenefits,
  ...contextBenefits,
  'Save $10 with bundle pricing',
];

export const UpgradeModal = React.memo<UpgradeModalProps>(({ 
  open, 
  onClose,
  onUpgrade,
  upgradeType = 'full_diagnostic',
}) => {
  const benefits = upgradeType === 'deep_context' 
    ? contextBenefits 
    : upgradeType === 'bundle'
    ? bundleBenefits
    : diagnosticBenefits;
  
  const title = upgradeType === 'deep_context'
    ? 'Connect Your Context'
    : upgradeType === 'bundle'
    ? 'Unlock Everything'
    : 'Unlock Your Full Leadership Diagnostic';
  
  const description = upgradeType === 'deep_context'
    ? 'Get company-specific insights and enhanced meeting prep'
    : upgradeType === 'bundle'
    ? 'Get the complete diagnostic plus deep context integration'
    : 'Get complete insights and actionable recommendations';
  
  const buttonText = upgradeType === 'deep_context'
    ? 'Unlock Deep Context'
    : upgradeType === 'bundle'
    ? 'Unlock Bundle'
    : 'Unlock Full Diagnostic';
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">{benefit}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 space-y-2">
            <Button 
              onClick={() => onUpgrade(upgradeType)} 
              className="w-full gap-2"
              size="lg"
            >
              <Lock className="h-4 w-4" />
              {buttonText}
            </Button>
            <Button 
              onClick={onClose} 
              variant="ghost" 
              className="w-full"
            >
              Maybe later
            </Button>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground text-center">
            One-time payment • Instant access • Secure checkout via Stripe
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
});

UpgradeModal.displayName = 'UpgradeModal';
