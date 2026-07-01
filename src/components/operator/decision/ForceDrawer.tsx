/**
 * ForceDrawer - the "interrogate" surface for a tapped force in the DecisionSpider.
 *
 * Shows the force's health verdict in one line, then - per claim tagged to that force - the
 * supporting vs countering evidence (reusing EvidenceList: one-line key points + trust score,
 * tap a source to read/verify). Mobile = a bottom Sheet (consistent with the existing ClaimSheet);
 * desktop = a persistent right rail beside the spider.
 */

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { DecisionEvidence } from '@/hooks/useDecisionEngine';
import { EvidenceList } from './EvidenceList';
import { emptyEvidenceMessage } from './decisionParts';
import { FORCE_HEALTH_STYLE, forceVerdict, type Force } from './decisionSpiderModel';

function ForceBody({ force, evidenceFor }: { force: Force; evidenceFor: (claimId: string) => DecisionEvidence[] }) {
  const style = FORCE_HEALTH_STYLE[force.health];
  const specific = force.caption !== force.name ? force.caption : null;
  return (
    <div className="space-y-3.5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.13em] text-muted-foreground">{force.name}</span>
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold', style.chip)}>{style.verb}</span>
        </div>
        {specific && <h3 className="mt-1 text-[17px] font-extrabold leading-tight text-foreground text-balance">{specific}</h3>}
        <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">{forceVerdict(force)}</p>
      </div>

      {force.claims.length === 0 ? (
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Nothing in this decision bears on {force.name.toLowerCase()} yet. If it matters here, it is a judgment only you can make.
        </p>
      ) : (
        <div className="space-y-4">
          {force.claims.map((c) => (
            <div key={c.id}>
              <p className="mb-1.5 text-[12.5px] font-semibold leading-snug text-foreground/90 [overflow-wrap:anywhere]">{c.text}</p>
              <EvidenceList evidence={evidenceFor(c.id)} emptyMessage={emptyEvidenceMessage(c.type)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ForceDrawer({
  force,
  evidenceFor,
  isDesktop,
  onClose,
}: {
  force: Force | null;
  evidenceFor: (claimId: string) => DecisionEvidence[];
  isDesktop: boolean;
  onClose: () => void;
}) {
  // Desktop: a persistent right rail. Empty prompt until a force is chosen.
  if (isDesktop) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-y-auto scrollbar-hide rounded-2xl border border-border bg-foreground/[0.02] p-4">
        {force ? (
          <ForceBody force={force} evidenceFor={evidenceFor} />
        ) : (
          <div className="grid h-full place-items-center text-center">
            <p className="max-w-[220px] text-[12.5px] leading-relaxed text-muted-foreground">
              Tap a force to see where it stands and the evidence behind it.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Mobile: a bottom sheet.
  return (
    <Sheet open={force !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl scrollbar-hide sm:mx-auto sm:max-w-lg">
        <SheetTitle className="sr-only">{force ? `${force.name}: ${force.caption}` : 'Force detail'}</SheetTitle>
        {force && <div className="pt-1"><ForceBody force={force} evidenceFor={evidenceFor} /></div>}
      </SheetContent>
    </Sheet>
  );
}
