/**
 * Compliance Frameworks - Static Control Definitions
 *
 * Maps SOC 2, GDPR, CCPA, and ISO 27001 controls to their technical
 * implementations in the MindMaker platform.
 *
 * HIPAA is deliberately absent. CTRL does not process protected health
 * information, so HIPAA is out of scope; see
 * project-documentation/compliance/README.md.
 */

export type ControlStatus = 'implemented' | 'partial' | 'planned';

export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  status: ControlStatus;
  implementation: string;
}

export interface ComplianceFramework {
  id: string;
  name: string;
  fullName: string;
  description: string;
  controls: ComplianceControl[];
}

/**
 * Honest framing for the customer-facing page. These mappings describe the
 * technical and organizational controls we have designed and the practices we
 * follow. They are not claims of completed third-party certification or audit.
 */
export const complianceDisclaimer =
  'This page describes how our security and privacy controls map to widely used frameworks. ' +
  'It reflects our design intent and current practices, not completed third-party audits or certifications. ' +
  'SOC 2 and ISO 27001 require independent assessment, which we have not yet undergone. ' +
  'For data-processing terms or a current subprocessor list, contact privacy@themindmaker.ai.';

export const complianceFrameworks: ComplianceFramework[] = [
  {
    id: 'soc2',
    name: 'SOC 2',
    fullName: 'SOC 2 (Trust Services Criteria)',
    description: 'Trust Services Criteria for security, availability, processing integrity, confidentiality, and privacy. We map our controls to these criteria; we have not yet completed a third-party SOC 2 audit.',
    controls: [
      {
        id: 'soc2-cc6.1',
        name: 'Logical Access Controls',
        description: 'Restrict access to information assets through authentication and authorization',
        status: 'implemented',
        implementation: 'Supabase JWT authentication with Row-Level Security (RLS) on all 37+ sensitive tables. Users can only access their own data.',
      },
      {
        id: 'soc2-cc7.2',
        name: 'System Monitoring',
        description: 'Monitor system components for anomalies and security events',
        status: 'planned',
        implementation: 'Structured JSON logging on edge functions and a CI gate against console.log regressions are in place. Comprehensive data-access and AI-usage audit trails are being built out.',
      },
      {
        id: 'soc2-cc6.3',
        name: 'Encryption',
        description: 'Protect data in transit and at rest using encryption',
        status: 'implemented',
        implementation: 'HTTPS for all data in transit. AES-256-GCM encryption for sensitive memory data at rest. Supabase-managed database encryption.',
      },
      {
        id: 'soc2-cc6.8',
        name: 'Session Management',
        description: 'Manage user sessions with proper timeout and refresh',
        status: 'implemented',
        implementation: 'JWT-based sessions with automatic token refresh. Auth state machine manages loading, authenticated, expired, and signed-out states.',
      },
      {
        id: 'soc2-cc8.1',
        name: 'Change Management',
        description: 'Control and document changes to system components',
        status: 'implemented',
        implementation: 'Git-based version control with 120+ tracked database migrations. All schema changes are versioned and auditable.',
      },
      {
        id: 'soc2-cc5.2',
        name: 'Risk Assessment',
        description: 'Identify and assess risks to achieving objectives',
        status: 'partial',
        implementation: 'Security audit logging captures access patterns. Rate limiting on AI endpoints. Compliance dashboard provides control visibility.',
      },
    ],
  },
  {
    id: 'gdpr',
    name: 'GDPR',
    fullName: 'General Data Protection Regulation',
    description: 'EU regulation on data protection and privacy for all individuals within the European Union and European Economic Area.',
    controls: [
      {
        id: 'gdpr-art6',
        name: 'Lawful Basis for Processing',
        description: 'Ensure valid legal basis exists for all data processing activities',
        status: 'implemented',
        implementation: 'Consent management with granular toggles for index publication, case studies, and service updates. Consent changes logged to consent_audit.',
      },
      {
        id: 'gdpr-art7',
        name: 'Conditions for Consent',
        description: 'Demonstrate that data subjects have given valid consent',
        status: 'partial',
        implementation: 'Granular consent flags are stored with timestamps. A consent_audit table is provisioned to record changes for proof of consent; full change-history capture is being completed.',
      },
      {
        id: 'gdpr-art15',
        name: 'Right of Access',
        description: 'Allow data subjects to obtain confirmation and access to their personal data',
        status: 'implemented',
        implementation: 'Data export available in Settings > Privacy. Users can download all profile, memory, assessment, and conversation data as JSON.',
      },
      {
        id: 'gdpr-art17',
        name: 'Right to Erasure',
        description: 'Allow data subjects to request deletion of personal data',
        status: 'implemented',
        implementation: 'Server-side account deletion via delete-account edge function. Cascading deletion of all user data with full audit trail.',
      },
      {
        id: 'gdpr-art20',
        name: 'Right to Data Portability',
        description: 'Allow data subjects to receive their data in a structured, machine-readable format',
        status: 'implemented',
        implementation: 'JSON data export includes profile, memories, assessments, conversations. Memory export supports JSON and markdown formats.',
      },
      {
        id: 'gdpr-art5e',
        name: 'Storage Limitation',
        description: 'Keep personal data only as long as necessary for the processing purpose',
        status: 'implemented',
        implementation: 'Configurable retention policies (30 days, 90 days, or indefinite). Automated cleanup via cleanup-expired-data edge function.',
      },
      {
        id: 'gdpr-art32',
        name: 'Security of Processing',
        description: 'Implement appropriate technical measures to ensure data security',
        status: 'implemented',
        implementation: 'RLS, AES-256-GCM encryption, JWT authentication, baseline security headers on the web application, and rate limiting on AI functions. The shared security-header helper is applied to a subset of edge functions, not all of them.',
      },
    ],
  },
  {
    id: 'ccpa',
    name: 'CCPA',
    fullName: 'California Consumer Privacy Act',
    description: 'California state statute to enhance privacy rights and consumer protection for residents of California.',
    controls: [
      {
        id: 'ccpa-1798.100',
        name: 'Right to Know',
        description: 'Consumers can request disclosure of personal information collected',
        status: 'implemented',
        implementation: 'Privacy Data tab displays all collected facts with categories. Data export provides complete JSON dump of all personal information.',
      },
      {
        id: 'ccpa-1798.105',
        name: 'Right to Delete',
        description: 'Consumers can request deletion of personal information',
        status: 'implemented',
        implementation: 'Individual fact deletion in Memory Browser. Full account deletion via server-side edge function with cascading data removal.',
      },
      {
        id: 'ccpa-1798.110',
        name: 'Right to Disclosure',
        description: 'Businesses must disclose categories and purposes of data collection',
        status: 'implemented',
        implementation: 'Memory facts organized by category (identity, business, objective, blocker, preference). Privacy controls show what data is stored and why.',
      },
      {
        id: 'ccpa-1798.120',
        name: 'Right to Opt-Out of Sale',
        description: 'Consumers can opt out of the sale of their personal information',
        status: 'implemented',
        implementation: 'Consent toggles for data sharing (index publication, case studies, outreach). Users can disable all data sharing individually.',
      },
      {
        id: 'ccpa-1798.125',
        name: 'Non-Discrimination',
        description: 'Businesses cannot discriminate against consumers exercising CCPA rights',
        status: 'implemented',
        implementation: 'All core features available regardless of privacy settings. Memory storage can be disabled without losing access to assessments or AI features.',
      },
    ],
  },
  {
    id: 'iso27001',
    name: 'ISO 27001',
    fullName: 'ISO/IEC 27001:2022',
    description: 'International standard for information security management systems (ISMS).',
    controls: [
      {
        id: 'iso-a5',
        name: 'Information Security Policies',
        description: 'Provide management direction and support for information security',
        status: 'implemented',
        implementation: 'Privacy settings, consent management, and retention policies configurable per user. Compliance dashboard provides policy visibility.',
      },
      {
        id: 'iso-a6',
        name: 'Access Control',
        description: 'Limit access to information and information processing facilities',
        status: 'implemented',
        implementation: 'JWT authentication, RLS policies on all tables, service role restricted to edge functions. Anonymous sessions supported for limited access.',
      },
      {
        id: 'iso-a8',
        name: 'Asset Management',
        description: 'Identify information assets and define appropriate protection responsibilities',
        status: 'implemented',
        implementation: 'Data classification badges label sensitivity levels (Public, Internal, Confidential, Restricted). Memory facts categorized by type.',
      },
      {
        id: 'iso-a10',
        name: 'Cryptography',
        description: 'Ensure proper use of cryptography to protect information',
        status: 'implemented',
        implementation: 'AES-256-GCM for memory encryption. HTTPS/TLS for all communications. Supabase handles database-level encryption at rest.',
      },
      {
        id: 'iso-a12',
        name: 'Operations Security',
        description: 'Ensure correct and secure operations of information processing facilities',
        status: 'partial',
        implementation: 'Rate limiting on AI endpoints, AI response caching with TTL, automated data-retention cleanup, and structured edge-function logging. Centralized log aggregation and event auditing are in progress.',
      },
      {
        id: 'iso-a16',
        name: 'Information Security Incident Management',
        description: 'Ensure consistent approach to managing security incidents',
        status: 'partial',
        implementation: 'Security audit log captures auth events and data deletions. Compliance events table tracks policy changes. Incident response workflow planned.',
      },
      {
        id: 'iso-a18',
        name: 'Compliance',
        description: 'Avoid breaches of legal, statutory, regulatory, or contractual obligations',
        status: 'implemented',
        implementation: 'Multi-framework compliance dashboard. GDPR/CCPA data subject rights implemented. Audit trails for all data operations.',
      },
    ],
  },
];

/**
 * Get summary stats for a framework
 */
export function getFrameworkStats(framework: ComplianceFramework): {
  total: number;
  implemented: number;
  partial: number;
  planned: number;
  percentage: number;
} {
  const total = framework.controls.length;
  const implemented = framework.controls.filter(c => c.status === 'implemented').length;
  const partial = framework.controls.filter(c => c.status === 'partial').length;
  const planned = framework.controls.filter(c => c.status === 'planned').length;
  const percentage = Math.round(((implemented + partial * 0.5) / total) * 100);

  return { total, implemented, partial, planned, percentage };
}

/**
 * Subprocessor registry for DPA tracking
 */
export const subprocessors = [
  {
    name: 'Supabase',
    purpose: 'Database, authentication, edge functions',
    dataTypes: ['All user data', 'Authentication credentials', 'Session data'],
    location: 'US (AWS)',
    dpaStatus: 'active' as const,
  },
  {
    name: 'OpenAI',
    purpose: 'AI analysis and content generation',
    dataTypes: ['Memory context', 'Assessment responses', 'Business context'],
    location: 'US',
    dpaStatus: 'active' as const,
  },
  {
    name: 'Stripe',
    purpose: 'Payment processing',
    dataTypes: ['User ID', 'Subscription status', 'Payment method (tokenized)'],
    location: 'US',
    dpaStatus: 'active' as const,
  },
  {
    name: 'Resend',
    purpose: 'Transactional email delivery',
    dataTypes: ['Email address', 'Notification content'],
    location: 'US',
    dpaStatus: 'active' as const,
  },
];
