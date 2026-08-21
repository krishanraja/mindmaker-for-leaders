/**
 * PrivacyControlsPanel Component
 * 
 * Panel for managing memory privacy settings including
 * storage toggles, retention policy, and cache clearing.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Mic, Brain, Clock, Trash2, Loader2, AlertCircle, Check, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMemorySettings, useUpdateMemorySettings, useClearLocalCache } from '@/hooks/useMemoryQueries';
import { RETENTION_OPTIONS, retentionDaysToOption, optionToRetentionDays, type RetentionOption } from '@/types/memory-settings';
import { useOffTheRecord } from '@/contexts/OffTheRecordContext';

interface PrivacyControlsPanelProps {
  className?: string;
}

export const PrivacyControlsPanel: React.FC<PrivacyControlsPanelProps> = ({
  className,
}) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { isOffTheRecord, hasEnded, setOffTheRecord, acknowledgeEnded } = useOffTheRecord();

  const { data: settings, isLoading, error } = useMemorySettings();
  const updateSettings = useUpdateMemorySettings();
  const clearCache = useClearLocalCache();

  const handleToggle = async (key: 'store_memory_enabled' | 'store_voice_transcripts' | 'auto_summarize_enabled', value: boolean) => {
    setSuccessMessage(null);
    try {
      await updateSettings.mutateAsync({ [key]: value });
      setSuccessMessage('Settings updated');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleRetentionChange = async (option: RetentionOption) => {
    setSuccessMessage(null);
    try {
      await updateSettings.mutateAsync({ retention_days: optionToRetentionDays(option) });
      setSuccessMessage('Retention policy updated');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleClearCache = async () => {
    setSuccessMessage(null);
    try {
      await clearCache.mutateAsync();
      setSuccessMessage('Local caches cleared');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className={cn("border-destructive/50", className)}>
        <CardContent className="py-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Failed to load settings</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'An error occurred'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Success message */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="p-3 rounded-xl bg-green-500/10 border border-green-500/20"
        >
          <div className="flex items-center gap-2 text-green-600">
            <Check className="w-4 h-4" />
            <p className="text-sm">{successMessage}</p>
          </div>
        </motion.div>
      )}

      {/* Storage Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Privacy Controls
          </CardTitle>
          <CardDescription className="text-sm">
            Control how your data is stored and processed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Off the record. Sits above the durable switches on purpose: it is
              the one a leader reaches for mid-thought, and it is the only
              control here that is not written down anywhere. */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/50">
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <Label htmlFor="off-the-record" className="text-sm font-medium">
                  Off the record
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isOffTheRecord
                    ? 'Nothing from this session will be kept.'
                    : 'Think out loud without any of it being kept. Lasts until you turn it off.'}
                </p>
              </div>
            </div>
            <Switch
              id="off-the-record"
              checked={isOffTheRecord}
              onCheckedChange={setOffTheRecord}
              className="min-h-[24px]"
            />
          </div>

          {hasEnded && !isOffTheRecord && (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/30 p-3">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <div className="flex-1">
                <p className="text-xs text-foreground">
                  That session was off the record. Nothing was saved.
                </p>
              </div>
              <button
                type="button"
                onClick={acknowledgeEnded}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Got it
              </button>
            </div>
          )}

          {/* Store Memory Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/50">
                <Brain className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <Label htmlFor="store-memory" className="text-sm font-medium">
                  Store memory
                </Label>
                <p className="text-xs text-muted-foreground">
                  Save extracted facts to your profile
                </p>
              </div>
            </div>
            <Switch
              id="store-memory"
              checked={settings?.store_memory_enabled ?? true}
              onCheckedChange={(checked) => handleToggle('store_memory_enabled', checked)}
              disabled={updateSettings.isPending}
            />
          </div>

          {/* Store Voice Transcripts Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/50">
                <Mic className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <Label htmlFor="store-voice" className="text-sm font-medium">
                  Store voice transcripts
                </Label>
                <p className="text-xs text-muted-foreground">
                  Keep original voice transcripts as context
                </p>
              </div>
            </div>
            <Switch
              id="store-voice"
              checked={settings?.store_voice_transcripts ?? true}
              onCheckedChange={(checked) => handleToggle('store_voice_transcripts', checked)}
              disabled={updateSettings.isPending}
            />
          </div>

          {/* Auto-summarize Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/50">
                <Brain className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <Label htmlFor="auto-summarize" className="text-sm font-medium">
                  Auto-summarize long memory
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically condense lengthy entries
                </p>
              </div>
            </div>
            <Switch
              id="auto-summarize"
              checked={settings?.auto_summarize_enabled ?? true}
              onCheckedChange={(checked) => handleToggle('auto_summarize_enabled', checked)}
              disabled={updateSettings.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Data Retention
          </CardTitle>
          <CardDescription className="text-sm">
            How long to keep your memory data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={retentionDaysToOption(settings?.retention_days ?? null)}
            onValueChange={(v) => handleRetentionChange(v as RetentionOption)}
            disabled={updateSettings.isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RETENTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            {settings?.retention_days
              ? `Memories older than ${settings.retention_days} days will be automatically deleted.`
              : 'Your memories will be kept indefinitely until you delete them.'}
          </p>
        </CardContent>
      </Card>

      {/* Clear Cache */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Local Data
          </CardTitle>
          <CardDescription className="text-sm">
            Clear locally cached data from this device
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleClearCache}
            disabled={clearCache.isPending}
            className="w-full border-0 bg-secondary/50"
          >
            {clearCache.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Clear local caches
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            This clears drafts and cached data stored in your browser. Your server-side data is not affected.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyControlsPanel;
