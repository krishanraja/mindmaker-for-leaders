import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronRight, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDevice } from '@/hooks/useDevice';
import { useComplianceStatus } from '@/hooks/useComplianceStatus';
import { DesktopSidebar } from '@/components/memory-web/DesktopSidebar';
import { BottomNav } from '@/components/memory-web/BottomNav';
import { AppHeader } from '@/components/memory-web/AppHeader';
import {
  complianceFrameworks,
  complianceDisclaimer,
  getFrameworkStats,
  subprocessors,
  type ComplianceFramework,
  type ControlStatus,
} from '@/lib/compliance-frameworks';

function StatusIcon({ status }: { status: ControlStatus }) {
  switch (status) {
    case 'implemented':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />;
    case 'partial':
      return <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />;
    case 'planned':
      return <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
  }
}

function StatusBadge({ status }: { status: ControlStatus }) {
  const config = {
    implemented: { label: 'Implemented', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    partial: { label: 'Partial', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    planned: { label: 'Planned', className: 'bg-muted text-muted-foreground border-border' },
  };
  const { label, className } = config[status];

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border', className)}>
      {label}
    </span>
  );
}

function FrameworkCard({ framework }: { framework: ComplianceFramework }) {
  const [expanded, setExpanded] = useState(false);
  const stats = getFrameworkStats(framework);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-base">{framework.name}</CardTitle>
              <Badge variant="outline" className="text-[10px]">{framework.fullName}</Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{framework.description}</p>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">{stats.percentage}%</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">coverage</div>
            </div>
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
            <CheckCircle2 className="h-3 w-3" />
            {stats.implemented} implemented
          </span>
          {stats.partial > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-600">
              <AlertCircle className="h-3 w-3" />
              {stats.partial} partial
            </span>
          )}
          {stats.planned > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {stats.planned} planned
            </span>
          )}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="border-t pt-4">
          <div className="space-y-4">
            {framework.controls.map((control) => (
              <div key={control.id} className="flex gap-3">
                <StatusIcon status={control.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-foreground">{control.name}</span>
                    <StatusBadge status={control.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{control.description}</p>
                  <p className="text-xs text-foreground/70 bg-secondary/50 rounded px-2 py-1.5 leading-relaxed">
                    {control.implementation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function LiveStatusCard() {
  const { status, isLoading, activeControlCount, totalChecks } = useComplianceStatus();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="animate-pulse flex gap-4">
            <div className="h-10 w-10 bg-secondary rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-secondary rounded w-1/3" />
              <div className="h-3 bg-secondary rounded w-2/3" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const checks = [
    { label: 'Audit logging', active: status.auditLoggingActive },
    { label: 'Memory privacy configured', active: status.memoryPrivacyConfigured },
    { label: 'Consent recorded', active: status.consentRecorded },
    { label: 'Retention policy set', active: status.retentionPolicySet },
    { label: 'Data export available', active: status.dataExportAvailable },
    { label: 'Account deletion available', active: status.accountDeletionAvailable },
    { label: 'Encryption enabled', active: status.encryptionEnabled },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent" />
          Your Compliance Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {checks.map((check) => (
            <div key={check.label} className="flex items-center gap-2 text-sm">
              {check.active ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ) : check.active === null ? (
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              )}
              <span className={check.active ? 'text-foreground' : 'text-muted-foreground'}>
                {check.label}
              </span>
            </div>
          ))}
        </div>
        {status.lastAuditEntry && (
          <p className="text-[10px] text-muted-foreground mt-3 pt-3 border-t">
            Last audit entry: {new Date(status.lastAuditEntry).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SubprocessorsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4 text-accent" />
          Data Subprocessors
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {subprocessors.map((sp) => (
            <div key={sp.name} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium">{sp.name}</span>
                  <span className="text-[10px] text-muted-foreground">{sp.location}</span>
                </div>
                <p className="text-xs text-muted-foreground">{sp.purpose}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {sp.dataTypes.map((dt) => (
                    <span key={dt} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded">
                      {dt}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ComplianceContent() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
        <p className="text-[11px] leading-relaxed text-foreground/70">{complianceDisclaimer}</p>
      </div>

      <LiveStatusCard />

      <div className="space-y-3">
        {complianceFrameworks.map((framework) => (
          <FrameworkCard key={framework.id} framework={framework} />
        ))}
      </div>

      <SubprocessorsCard />
    </div>
  );
}

export default function Compliance() {
  const { isMobile } = useDevice();

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <DesktopSidebar />
        <main className="ml-64 p-8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center shadow-lg shadow-accent/20">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Compliance</h1>
                  <p className="text-sm text-muted-foreground">
                    Our security and privacy controls, mapped to SOC 2, GDPR, CCPA, and ISO 27001
                  </p>
                </div>
              </div>
            </motion.div>
            <ComplianceContent />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen-safe overflow-hidden flex flex-col bg-background">
      <AppHeader />

      <div className="flex-shrink-0 px-4 pb-2">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center shadow-lg shadow-accent/20">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">Compliance</h1>
            <p className="text-[10px] text-muted-foreground leading-tight">
              SOC 2, GDPR, CCPA, ISO 27001
            </p>
          </div>
        </div>
      </div>

      <main className="flex-1 min-h-0 overflow-y-auto scrollbar-hide overscroll-contain px-4 py-2">
        <ComplianceContent />
      </main>

      <BottomNav />
    </div>
  );
}
