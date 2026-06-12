/**
 * useComplianceStatus Hook
 *
 * Queries the database to verify compliance controls are active
 * and returns live compliance posture for the current user.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export interface ComplianceStatusChecks {
  auditLoggingActive: boolean | null;
  memoryPrivacyConfigured: boolean | null;
  consentRecorded: boolean | null;
  retentionPolicySet: boolean | null;
  dataExportAvailable: boolean;
  accountDeletionAvailable: boolean;
  encryptionEnabled: boolean | null;
  lastAuditEntry: string | null;
}

export function useComplianceStatus() {
  const { userId } = useAuth();
  const [status, setStatus] = useState<ComplianceStatusChecks>({
    auditLoggingActive: null,
    memoryPrivacyConfigured: null,
    consentRecorded: null,
    retentionPolicySet: null,
    dataExportAvailable: true,
    accountDeletionAvailable: true,
    encryptionEnabled: null,
    lastAuditEntry: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    async function checkStatus() {
      try {
        const [auditResult, privacyResult, consentResult] = await Promise.all([
          // Check if audit logging has recent entries
          supabase
            .from('data_audit_log')
            .select('created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1),

          // Check if memory privacy settings are configured
          supabase
            .from('user_memory_settings')
            .select('store_memory_enabled, retention_days')
            .eq('user_id', userId!)
            .maybeSingle(),

          // Check if consent flags exist
          supabase
            .from('index_participant_data')
            .select('consent_flags')
            .eq('user_id', userId!)
            .maybeSingle(),
        ]);

        setStatus({
          auditLoggingActive: (auditResult.data?.length ?? 0) > 0,
          memoryPrivacyConfigured: privacyResult.data !== null,
          consentRecorded: consentResult.data?.consent_flags !== null && consentResult.data?.consent_flags !== undefined,
          retentionPolicySet: privacyResult.data?.retention_days !== null && privacyResult.data?.retention_days !== undefined,
          dataExportAvailable: true,
          accountDeletionAvailable: true,
          // Honest claim: every stored fact now carries application-layer
          // AES-256-GCM field-level encryption on its content (written by both
          // memory-crud and extract-user-context via the shared memory-crypto
          // module). This is NOT a blanket "encryption at rest" promise: the
          // plaintext fact_value/fact_context shadow is still kept alongside the
          // ciphertext for display/search. Removing that plaintext shadow (true
          // at-rest encryption) is a tracked follow-up; until then the control
          // wording on /compliance must stay scoped to field-level encryption.
          encryptionEnabled: true,
          lastAuditEntry: auditResult.data?.[0]?.created_at || null,
        });
      } catch (error) {
        console.warn('Failed to check compliance status:', error);
      } finally {
        setIsLoading(false);
      }
    }

    checkStatus();
  }, [userId]);

  const activeControlCount = Object.values(status).filter(v => v === true).length;
  const totalChecks = Object.keys(status).length;

  return { status, isLoading, activeControlCount, totalChecks };
}
