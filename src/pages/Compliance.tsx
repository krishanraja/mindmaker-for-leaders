import { useState } from 'react';
import { Shield, CheckCircle2, AlertCircle, Clock, Building2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDevice } from '@/hooks/useDevice';
import { useComplianceStatus } from '@/hooks/useComplianceStatus';
import { DesktopShell } from '@/components/layout/DesktopShell';
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

/**
 * Compliance, rebuilt as a no-scroll, one-ask focused view.
 *
 * The page used to stack a disclaimer + live status + four expandable
 * framework cards + a subprocessor list into one long scroll. There is
 * genuinely more here than fits a screen, so we use progressive disclosure:
 * a single focused panel with a quiet selector down the side. You pick one
 * thing (your live status, a framework, or who we share data with) and see
 * only that. The only scroll that can ever appear is inside the detail panel,
 * with the scrollbar hidden, never the page itself.
 *
 * Language is warm and first-timer friendly. It stays honest: nothing here
 * claims a certification the org has not earned (see the de-claw in
 * compliance-frameworks.ts). We say "how we protect you" and "what we have
 * built", not "we are certified".
 */

type SelectionId = 'status' | 'subprocessors' | string;

function StatusDot({ status }: { status: ControlStatus }) {
  switch (status) {
    case 'implemented':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />;
    case 'partial':
      return <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />;
    case 'planned':
      return <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />;
  }
}

function StatusBadge({ status }: { status: ControlStatus }) {
  const config = {
    implemented: { label: 'In place', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    partial: { label: 'Partly there', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    planned: { label: 'On the way', className: 'bg-muted text-muted-foreground border-border' },
  };
  const { label, className } = config[status];
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border flex-shrink-0', className)}>
      {label}
    </span>
  );
}

/** One row in the quiet selector rail (left on desktop, top scroller on mobile). */
function SelectorButton({
  active,
  onClick,
  title,
  subtitle,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
        active ? 'bg-accent/15 border border-accent/30' : 'border border-transparent hover:bg-secondary/60',
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="flex-1 min-w-0">
        <span className={cn('block text-sm font-medium truncate', active ? 'text-accent' : 'text-foreground')}>
          {title}
        </span>
        {subtitle && <span className="block text-[11px] text-muted-foreground truncate">{subtitle}</span>}
      </span>
      <ChevronRight className={cn('h-4 w-4 flex-shrink-0', active ? 'text-accent' : 'text-muted-foreground/50')} />
    </button>
  );
}

/** The detail panel content for the live status selection. */
function StatusDetail() {
  const { status, isLoading } = useComplianceStatus();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3 pt-1">
        <div className="h-4 bg-secondary rounded w-1/2" />
        <div className="h-3 bg-secondary rounded w-3/4" />
        <div className="h-3 bg-secondary rounded w-2/3" />
      </div>
    );
  }

  const checks = [
    { label: 'We keep a log of who touched your data', active: status.auditLoggingActive },
    { label: 'Your memory privacy choices are set', active: status.memoryPrivacyConfigured },
    { label: 'Your consent is on record', active: status.consentRecorded },
    { label: 'A retention window is in place', active: status.retentionPolicySet },
    { label: 'You can export everything we hold', active: status.dataExportAvailable },
    { label: 'You can delete your account anytime', active: status.accountDeletionAvailable },
    // Scoped wording: field-level AES-256-GCM on stored facts, NOT a blanket
    // "encryption at rest" claim (a plaintext shadow is still kept for display/search).
    { label: 'Each stored fact is encrypted (AES-256-GCM)', active: status.encryptionEnabled },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Here is what is switched on for your account right now. These checks run live against your own data.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {checks.map((check) => (
          <div key={check.label} className="flex items-start gap-2 text-sm">
            {check.active ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            ) : check.active === null ? (
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            )}
            <span className={check.active ? 'text-foreground leading-snug' : 'text-muted-foreground leading-snug'}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
      {status.lastAuditEntry && (
        <p className="text-[11px] text-muted-foreground pt-3 border-t">
          Last activity we logged for you: {new Date(status.lastAuditEntry).toLocaleString()}
        </p>
      )}
    </div>
  );
}

/** The detail panel content for one framework. */
function FrameworkDetail({ framework }: { framework: ComplianceFramework }) {
  const stats = getFrameworkStats(framework);
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground leading-relaxed flex-1">{framework.description}</p>
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold text-foreground leading-none">{stats.percentage}%</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">mapped</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5 text-emerald-600">
          <CheckCircle2 className="h-3 w-3" /> {stats.implemented} in place
        </span>
        {stats.partial > 0 && (
          <span className="inline-flex items-center gap-1.5 text-amber-600">
            <AlertCircle className="h-3 w-3" /> {stats.partial} partly there
          </span>
        )}
        {stats.planned > 0 && (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3 w-3" /> {stats.planned} on the way
          </span>
        )}
      </div>
      <div className="space-y-3 border-t pt-4">
        {framework.controls.map((control) => (
          <div key={control.id} className="flex gap-3">
            <StatusDot status={control.status} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
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
    </div>
  );
}

/** The detail panel content for the subprocessor list. */
function SubprocessorsDetail() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        These are the trusted services we use to run CTRL. We only ever share what each one needs to do its job.
      </p>
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
    </div>
  );
}

/**
 * The shared focused view. A quiet selector + one detail panel. The selector
 * lives in a side column on desktop and a horizontal scroller on mobile; the
 * detail panel is the single scroll region (hidden scrollbar). The page frame
 * never scrolls.
 */
function ComplianceView() {
  const [selection, setSelection] = useState<SelectionId>('status');
  const { activeControlCount } = useComplianceStatus();

  const detailTitle =
    selection === 'status'
      ? 'How you are protected right now'
      : selection === 'subprocessors'
        ? 'Who we share data with'
        : complianceFrameworks.find((f) => f.id === selection)?.fullName ?? '';

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 lg:gap-6">
      {/* Selector rail */}
      <div className="flex-shrink-0 lg:w-72 lg:min-h-0 lg:overflow-y-auto lg:scrollbar-hide">
        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible scrollbar-hide pb-1 lg:pb-0">
          <div className="flex-shrink-0 lg:flex-shrink lg:w-full">
            <SelectorButton
              active={selection === 'status'}
              onClick={() => setSelection('status')}
              title="Your live status"
              subtitle={`${activeControlCount} protections on now`}
              icon={<Shield className="h-4 w-4 text-accent" />}
            />
          </div>
          <p className="hidden lg:block px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            How our controls map
          </p>
          {complianceFrameworks.map((framework) => {
            const stats = getFrameworkStats(framework);
            return (
              <div key={framework.id} className="flex-shrink-0 lg:flex-shrink lg:w-full">
                <SelectorButton
                  active={selection === framework.id}
                  onClick={() => setSelection(framework.id)}
                  title={framework.name}
                  subtitle={`${stats.percentage}% mapped`}
                />
              </div>
            );
          })}
          <div className="flex-shrink-0 lg:flex-shrink lg:w-full lg:pt-2">
            <SelectorButton
              active={selection === 'subprocessors'}
              onClick={() => setSelection('subprocessors')}
              title="Data we share"
              subtitle={`${subprocessors.length} trusted services`}
              icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
            />
          </div>
        </div>
      </div>

      {/* Detail panel: the single (hidden) scroll region */}
      <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-border bg-card/40">
        <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-border/60">
          <h2 className="text-base font-semibold text-foreground">{detailTitle}</h2>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide overscroll-contain px-5 py-4">
          {selection === 'status' && <StatusDetail />}
          {selection === 'subprocessors' && <SubprocessorsDetail />}
          {complianceFrameworks
            .filter((f) => f.id === selection)
            .map((f) => (
              <FrameworkDetail key={f.id} framework={f} />
            ))}
          <div className="mt-5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
            <p className="text-[11px] leading-relaxed text-foreground/70">{complianceDisclaimer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Compliance() {
  const { isMobile } = useDevice();

  if (!isMobile) {
    return (
      <DesktopShell eyebrow="Trust" title="How I keep you safe">
        <div className="flex-1 min-h-0 flex flex-col">
          <p className="flex-shrink-0 text-sm text-muted-foreground mb-4 max-w-2xl">
            A calm, honest look at how I keep your data safe. Pick anything below to see the detail.
          </p>
          <ComplianceView />
        </div>
      </DesktopShell>
    );
  }

  return (
    <div className="h-screen-safe overflow-hidden flex flex-col bg-background">
      <AppHeader />

      <div className="flex-shrink-0 px-4 pb-2">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center shadow-lg shadow-accent/20">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">How I keep you safe</h1>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Honest, plain-language. Tap anything to see the detail.
            </p>
          </div>
        </div>
      </div>

      <main className="flex-1 min-h-0 flex flex-col px-4 pb-2">
        <ComplianceView />
      </main>

      <BottomNav />
    </div>
  );
}
