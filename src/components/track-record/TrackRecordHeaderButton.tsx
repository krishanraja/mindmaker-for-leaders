// TrackRecordHeaderButton - a small ring glyph in the Decisions top bar that
// visually represents the leader's track record (a progress ring by capability
// stage) and opens the TrackRecordDrawer on tap. This is what freed the prime
// real estate on the Decisions tab: the reflective "how you are doing" read is
// one calm tap away instead of two cards above the actual decisions.
//
// Self-contained: reads the already-cached useCapabilitySignals (react-query,
// shared) + useTrackRecord (session-cached), so it adds no round trips on the
// Decisions tab. Route-gated by the header (rendered only on /decision).

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale } from 'lucide-react';
import { useCapabilitySignals } from '@/hooks/useCapabilitySignals';
import { useTrackRecord } from '@/hooks/useTrackRecord';
import { buildTrackRecordModel } from './trackRecordModel';
import { TrackRecordDrawer } from './TrackRecordDrawer';
import { STAGE_ORDER, type CapabilityNextMove } from '@/lib/capabilityLadder';

export function TrackRecordHeaderButton() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { capability } = useCapabilitySignals();
  const { records } = useTrackRecord();
  const model = useMemo(() => buildTrackRecordModel(records), [records]);

  // The ring fills by capability stage (1..4) - an honest, always-available
  // signal (never a fabricated hit-rate for a leader with no scored calls).
  const total = STAGE_ORDER.length;
  const stageIndex = capability?.stageIndex ?? 1;
  const progress = Math.min(1, Math.max(0, stageIndex / total));
  const R = 8.5;
  const C = 2 * Math.PI * R;

  // The single next-move opens its home; the drawer closes first so the route
  // change is clean. Same behaviour wherever the drawer is opened from.
  const onCapabilityGo = (move: CapabilityNextMove) => {
    setOpen(false);
    navigate(move.route, move.prefill ? { state: { prefill: move.prefill } } : undefined);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Your track record"
        title="Your track record"
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card/70 text-muted-foreground transition-colors hover:border-accent/30 hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" className="absolute inset-1.5 h-8 w-8 -rotate-90" aria-hidden="true">
          <circle cx="12" cy="12" r={R} fill="none" stroke="hsl(var(--border))" strokeWidth="2" />
          <circle
            cx="12"
            cy="12"
            r={R}
            fill="none"
            stroke="hsl(var(--accent))"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            style={{ filter: 'drop-shadow(0 0 3px hsl(var(--accent)/0.6))' }}
          />
        </svg>
        <Scale className="relative h-3.5 w-3.5 text-accent" strokeWidth={2.2} />
      </button>
      <TrackRecordDrawer
        open={open}
        onOpenChange={setOpen}
        model={model}
        capability={capability}
        onCapabilityGo={onCapabilityGo}
      />
    </>
  );
}
