import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Trash2, Download, Loader2 } from 'lucide-react';
import { clearPersistedAssessmentId } from '@/utils/assessmentPersistence';

interface AccountDeletionDialogProps {
  children: React.ReactNode;
}

/**
 * Raised when delete-account reports per-table failures. Its message is the
 * only server-derived text shown to the user; everything else stays generic.
 */
class PartialDeletionError extends Error {}

/**
 * Account Deletion Dialog
 * 
 * GDPR-compliant account deletion with:
 * - Data export option
 * - Confirmation with typed email
 * - Clear warning about irreversibility
 */
export const AccountDeletionDialog: React.FC<AccountDeletionDialogProps> = ({ children }) => {
  const { email, signOut, userId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'confirm' | 'deleting' | 'done'>('confirm');

  const isConfirmValid = confirmEmail.toLowerCase() === email?.toLowerCase() && confirmChecked;

  const handleExportData = async () => {
    if (!userId) return;
    
    setIsExporting(true);
    setError(null);

    try {
      // Fetch all user data
      const [
        { data: leaders },
        { data: assessments },
        { data: checkins },
        { data: decisions },
      ] = await Promise.all([
        supabase.from('leaders').select('*').eq('user_id', userId),
        supabase.from('leader_assessments').select('*').eq('owner_user_id', userId),
        supabase.from('weekly_checkins').select('*').eq('user_id', userId),
        supabase.from('ai_conversations').select('*').eq('user_id', userId),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        user_id: userId,
        email: email,
        data: {
          profile: leaders?.[0] || null,
          assessments: assessments || [],
          checkins: checkins || [],
          conversations: decisions || [],
        },
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mindmaker-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!isConfirmValid || !userId) return;

    setIsDeleting(true);
    setError(null);
    setStep('deleting');

    try {
      // Server-side deletion via edge function (GDPR Art. 17 compliant)
      const { data, error: fnError } = await supabase.functions.invoke('delete-account', {
        body: { confirmEmail: confirmEmail },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      // The function reports per-table (and auth-user) failures in `errors`
      // while still returning success:true. A partial erasure is not a
      // deletion, so it must never reach the done step.
      if (Array.isArray(data?.errors) && data.errors.length > 0) {
        throw new PartialDeletionError(
          `Some of your data could not be fully deleted. Please contact support so we can finish it. First error: ${String(data.errors[0])}`,
        );
      }

      // Clear local storage
      clearPersistedAssessmentId();
      localStorage.removeItem('mindmaker_quiz_progress');
      localStorage.removeItem('mm_privacy_consent');

      // Sign out (this will also clear auth state)
      await signOut();

      setStep('done');

      // Redirect after short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (err) {
      console.error('Deletion failed:', err);
      setError(
        err instanceof PartialDeletionError
          ? err.message
          : 'Failed to delete account. Please contact support.',
      );
      setStep('confirm');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!isDeleting) {
      setIsOpen(open);
      if (!open) {
        // Reset state on close
        setConfirmEmail('');
        setConfirmChecked(false);
        setError(null);
        setStep('confirm');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {step === 'done' ? (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Account Deleted</h3>
            <p className="text-muted-foreground">
              Your account and all associated data has been deleted.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <DialogTitle>Delete Account</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. All your data will be permanently deleted.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 my-4">
              {/* Export option */}
              <div className="bg-secondary/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Before deleting, you can download a copy of your data:
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportData}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export My Data
                    </>
                  )}
                </Button>
              </div>

              {/* Confirmation */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="confirm-email">
                    Type your email to confirm: <span className="font-mono text-sm">{email}</span>
                  </Label>
                  <Input
                    id="confirm-email"
                    type="email"
                    placeholder="your@email.com"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    disabled={isDeleting}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="confirm-delete"
                    checked={confirmChecked}
                    onCheckedChange={(checked) => setConfirmChecked(checked === true)}
                    disabled={isDeleting}
                  />
                  <Label htmlFor="confirm-delete" className="text-sm">
                    I understand this action is permanent and irreversible
                  </Label>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!isConfirmValid || isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AccountDeletionDialog;


