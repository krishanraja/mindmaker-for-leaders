/**
 * DiagnosticsPanel Component
 * 
 * Dev-only panel showing system diagnostics:
 * - Auth status
 * - Memory counts
 * - Last API error
 * - Edge function latency
 * 
 * Only visible when explicitly requested with ?diagnostics=true.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, X, User, Brain, AlertCircle, Clock, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useMemoryList, useMemorySettings } from '@/hooks/useMemoryQueries';

interface DiagnosticsData {
  authStatus: string;
  userId: string | null;
  email: string | null;
  isAnonymous: boolean;
  memoryCount: number;
  memorySettings: {
    storeEnabled: boolean;
    voiceEnabled: boolean;
    retentionDays: number | null;
  } | null;
  lastError: string | null;
  lastLatency: number | null;
}

export const DiagnosticsPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const { state: authState, userId, email, isAnonymous } = useAuth();
  const { data: memoryData, error: memoryError, dataUpdatedAt } = useMemoryList({});
  const { data: settingsData, error: settingsError } = useMemorySettings();

  // Check if diagnostics should be visible
  useEffect(() => {
    const hasQueryParam = new URLSearchParams(window.location.search).get('diagnostics') === 'true';
    setIsVisible(hasQueryParam);
  }, []);

  // Track latency
  useEffect(() => {
    if (dataUpdatedAt) {
      // Approximate latency from last update
      const now = Date.now();
      const latency = now - dataUpdatedAt;
      if (latency < 30000) { // Only if recent
        setLastLatency(latency);
      }
    }
  }, [dataUpdatedAt]);

  // Track errors
  useEffect(() => {
    if (memoryError) {
      setLastError(memoryError instanceof Error ? memoryError.message : 'Memory fetch error');
    } else if (settingsError) {
      setLastError(settingsError instanceof Error ? settingsError.message : 'Settings fetch error');
    }
  }, [memoryError, settingsError]);

  if (!isVisible) return null;

  const diagnostics: DiagnosticsData = {
    authStatus: authState,
    userId,
    email,
    isAnonymous,
    memoryCount: memoryData?.total || 0,
    memorySettings: settingsData ? {
      storeEnabled: settingsData.store_memory_enabled,
      voiceEnabled: settingsData.store_voice_transcripts,
      retentionDays: settingsData.retention_days,
    } : null,
    lastError,
    lastLatency,
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={cn(
          "fixed bottom-20 right-4 z-[100]",
          "bg-background/95 backdrop-blur-lg",
          "border border-border rounded-2xl shadow-xl",
          "overflow-hidden",
          isExpanded ? "w-80" : "w-auto"
        )}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-3 py-2 bg-secondary/50 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-accent" />
            <span className="text-xs font-medium text-foreground">Diagnostics</span>
          </div>
          <div className="flex items-center gap-1">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 space-y-3 text-xs">
                {/* Auth Status */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-3 h-3" />
                    <span>Auth Status</span>
                  </div>
                  <div className="pl-5 space-y-0.5">
                    <p className="text-foreground">
                      State: <span className={cn(
                        "font-mono",
                        authState === 'authenticated' && "text-green-500",
                        authState === 'anonymous_session' && "text-yellow-500",
                        authState === 'unauthenticated' && "text-red-500"
                      )}>{authState}</span>
                    </p>
                    {userId && (
                      <p className="text-foreground font-mono truncate">
                        ID: {userId.slice(0, 8)}...
                      </p>
                    )}
                    {email && (
                      <p className="text-foreground truncate">
                        Email: {email}
                      </p>
                    )}
                    {isAnonymous && (
                      <p className="text-yellow-500">Anonymous session</p>
                    )}
                  </div>
                </div>

                {/* Memory Stats */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Brain className="w-3 h-3" />
                    <span>Memory</span>
                  </div>
                  <div className="pl-5 space-y-0.5">
                    <p className="text-foreground">
                      Count: <span className="font-mono">{diagnostics.memoryCount}</span>
                    </p>
                    {diagnostics.memorySettings && (
                      <>
                        <p className="text-foreground">
                          Store: <span className={diagnostics.memorySettings.storeEnabled ? "text-green-500" : "text-red-500"}>
                            {diagnostics.memorySettings.storeEnabled ? 'enabled' : 'disabled'}
                          </span>
                        </p>
                        <p className="text-foreground">
                          Retention: <span className="font-mono">
                            {diagnostics.memorySettings.retentionDays || 'forever'}
                          </span>
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Last Error */}
                {diagnostics.lastError && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="w-3 h-3" />
                      <span>Last Error</span>
                    </div>
                    <p className="pl-5 text-destructive/80 break-words">
                      {diagnostics.lastError}
                    </p>
                  </div>
                )}

                {/* Latency */}
                {diagnostics.lastLatency !== null && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Last Query</span>
                    </div>
                    <p className="pl-5 text-foreground font-mono">
                      {diagnostics.lastLatency}ms
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLastError(null);
                      setLastLatency(null);
                    }}
                    className="w-full h-8 text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default DiagnosticsPanel;
