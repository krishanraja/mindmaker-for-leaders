import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Zap, Lock } from 'lucide-react';
import { UnlockResultsForm, UnlockFormData } from '../UnlockResultsForm';

interface ResultsLockedGateProps {
  expandedSections: Record<string, boolean>;
  toggleSection: (section: string) => void;
  unlockError: string | null;
  unlockLoading: boolean;
  onUnlock: (formData: UnlockFormData) => void;
}

export const ResultsLockedGate: React.FC<ResultsLockedGateProps> = ({
  expandedSections,
  toggleSection,
  unlockError,
  unlockLoading,
  onUnlock,
}) => {
  return (
    <>
      {/* HOOK: Preview of locked content FIRST to create urgency */}
      <div className="relative rounded-xl overflow-hidden mb-4">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background z-10 flex items-end justify-center pb-4">
          <div className="text-center p-3">
            <Lock className="h-5 w-5 text-primary mx-auto mb-1.5" />
            <p className="text-xs sm:text-sm font-medium text-foreground">Unlock to see peer comparison, full prompt library & more</p>
          </div>
        </div>
        <div className="blur-sm pointer-events-none opacity-50 space-y-3">
          <Card className="h-32 bg-gradient-to-br from-primary/10 to-secondary/20" />
          <Card className="h-20 bg-secondary/20" />
        </div>
      </div>

      {/* THEN: Collapsible Unlock Form */}
      <Collapsible open={expandedSections.unlock} onOpenChange={() => toggleSection('unlock')}>
        <Card className="mb-6 shadow-lg border rounded-xl overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background">
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-base sm:text-lg font-semibold">Unlock Your Full Results</CardTitle>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Create an account for personalized prompts, peer comparison & more
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedSections.unlock ? 'rotate-180' : ''}`} />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-4 pt-0">
              {unlockError && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                  {unlockError}
                </div>
              )}
              <UnlockResultsForm onSubmit={onUnlock} isLoading={unlockLoading} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </>
  );
};
