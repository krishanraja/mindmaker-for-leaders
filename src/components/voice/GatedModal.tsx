import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GatedModalProps {
  open: boolean;
  onClose: () => void;
  onUnlock: () => void;
  sessionId: string;
}

export const GatedModal: React.FC<GatedModalProps> = ({
  open,
  onClose,
  onUnlock,
  sessionId
}) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !role || !companySize) {
      toast({
        title: 'Please fill all fields',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Update voice_sessions with gate unlock
      await supabase.from('voice_sessions').upsert({
        session_id: sessionId,
        gated_unlocked_at: new Date().toISOString(),
        sprint_signup_source: 'voice_roi'
      }, {
        onConflict: 'session_id'
      });

      // Create booking request
      await supabase.from('booking_requests').insert({
        session_id: sessionId,
        contact_email: email,
        contact_name: 'Voice Assessment User',
        role: role,
        company_name: companySize,
        service_type: 'sprint',
        service_title: '90-Day MindMaker Sprint',
        specific_needs: 'Voice assessment gate unlock',
        priority: 'high',
        status: 'pending'
      });

      toast({
        title: 'Advanced toolkit unlocked!',
        description: 'Check your email for your resources.',
      });

      onUnlock();
      onClose();
    } catch (error) {
      console.error('Error unlocking gate:', error);
      toast({
        title: 'Error',
        description: 'Failed to unlock toolkit. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Unlock Your Editable Plan and Export
          </DialogTitle>
          <DialogDescription>
            Then we'll book your Sprint slot automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              Executive Summary PDF (instant download)
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              Custom 90-Day AI Roadmap (editable)
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              ROI Brief with assumptions (board-ready)
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              Priority calendar booking
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="role">Role / Title</Label>
            <Input
              id="role"
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., CEO, VP of Product"
              required
            />
          </div>

          <div>
            <Label htmlFor="company-size">Company Size</Label>
            <Select value={companySize} onValueChange={setCompanySize} required>
              <SelectTrigger id="company-size">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="<50">&lt;50 employees</SelectItem>
                <SelectItem value="50-200">50-200 employees</SelectItem>
                <SelectItem value="200-1000">200-1,000 employees</SelectItem>
                <SelectItem value="1000+">1,000+ employees</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Unlocking...' : 'Unlock Now →'}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            We'll send your toolkit immediately. No spam, ever.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};
