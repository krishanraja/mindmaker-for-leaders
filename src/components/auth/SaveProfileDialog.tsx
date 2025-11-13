import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Mail } from 'lucide-react';

interface SaveProfileDialogProps {
  open: boolean;
  onClose: () => void;
  email: string;
  sessionId: string | null;
  onSuccess: () => void;
}

export const SaveProfileDialog: React.FC<SaveProfileDialogProps> = ({
  open,
  onClose,
  email,
  sessionId,
  onSuccess
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive'
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are the same',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            email: email
          }
        }
      });

      if (signUpError) {
        // If user already exists, try to sign in instead
        if (signUpError.message.includes('already registered')) {
          toast({
            title: 'Account exists',
            description: 'This email is already registered. Please sign in instead.',
            variant: 'destructive'
          });
          return;
        }
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error('No user returned from signup');
      }

      // Sign in the user automatically
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Auto sign-in error:', signInError);
        // Continue even if auto sign-in fails
      }

      // Update the conversation session with the user_id
      if (sessionId) {
        const { error: updateError } = await supabase
          .from('conversation_sessions')
          .update({ user_id: authData.user.id })
          .eq('id', sessionId);

        if (updateError) {
          console.error('Error updating session:', updateError);
        }

        // Update any booking requests
        const { error: bookingError } = await supabase
          .from('booking_requests')
          .update({ user_id: authData.user.id })
          .eq('session_id', sessionId);

        if (bookingError) {
          console.error('Error updating bookings:', bookingError);
        }

        // Update any voice sessions
        const { error: voiceError } = await supabase
          .from('voice_sessions')
          .update({ session_id: sessionId })
          .eq('session_id', sessionId);

        if (voiceError) {
          console.error('Error updating voice sessions:', voiceError);
        }
      }

      toast({
        title: 'Profile saved!',
        description: 'Your account has been created and all your data has been saved.',
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save profile. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Your Profile</DialogTitle>
          <DialogDescription>
            Create a password to save your assessment results and access them anytime.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSaveProfile} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="pl-9 bg-muted"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (min. 6 characters)"
                className="pl-9"
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="pl-9"
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Profile'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
