import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, ArrowRight, Mail, Lock, Save } from 'lucide-react';

interface SaveResultsPromptProps {
  authFullName: string;
  setAuthFullName: (value: string) => void;
  authEmail: string;
  setAuthEmail: (value: string) => void;
  authPassword: string;
  setAuthPassword: (value: string) => void;
  authError: string | null;
  setAuthError: (value: string | null) => void;
  isAuthLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onSkip: () => void;
}

export const SaveResultsPrompt: React.FC<SaveResultsPromptProps> = ({
  authFullName,
  setAuthFullName,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authError,
  setAuthError,
  isAuthLoading,
  onSubmit,
  onSkip,
}) => {
  return (
    <div className="bg-background h-[var(--mobile-vh)] overflow-hidden flex items-center justify-center px-4">
      <Card className="max-w-md w-full shadow-lg border rounded-xl">
        <CardContent className="p-5 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <Save className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Save your results
            </h2>
            <p className="text-sm text-muted-foreground">
              Create an account so you never have to take this diagnostic again.
            </p>
          </div>

          {/* Auth Form */}
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="auth-name" className="text-sm font-medium">
                Your name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="auth-name"
                  type="text"
                  placeholder="Jane Smith"
                  value={authFullName}
                  onChange={(e) => setAuthFullName(e.target.value)}
                  className="pl-10 rounded-lg"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="auth-email" className="text-sm font-medium">
                Work email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="you@company.com"
                  value={authEmail}
                  onChange={(e) => {
                    setAuthEmail(e.target.value);
                    // Real-time validation
                    if (e.target.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)) {
                      setAuthError('Please enter a valid email address');
                    } else if (authError && e.target.value) {
                      setAuthError(null);
                    }
                  }}
                  onBlur={(e) => {
                    // Validate on blur
                    if (e.target.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)) {
                      setAuthError('Please enter a valid email address');
                    }
                  }}
                  className="pl-10 rounded-lg"
                  required
                />
                {authError && authError.includes('email') && (
                  <p className="text-xs text-destructive mt-1">Please enter a valid email address (e.g., you@company.com)</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="auth-password" className="text-sm font-medium">
                Create password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="auth-password"
                  type="password"
                  placeholder="At least 12 characters"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="pl-10 rounded-lg"
                  minLength={12}
                  required
                />
              </div>
            </div>

            {authError && (
              <p className="text-sm text-destructive">{authError}</p>
            )}

            <Button
              type="submit"
              variant="cta"
              size="lg"
              className="w-full rounded-xl min-h-[48px]"
              disabled={isAuthLoading || !authEmail || !authPassword || !authFullName}
            >
              {isAuthLoading ? 'Creating account...' : 'Save & continue'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>

          <button
            type="button"
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-3 mt-3"
            onClick={onSkip}
          >
            Skip for now
          </button>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Your data is private. We'll never share it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
