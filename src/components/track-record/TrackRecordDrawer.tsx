// TrackRecordDrawer - the reflective "how your judgment is holding up" read,
// pulled OUT of the Decisions tab's prime real estate and into a drawer opened
// from a small ring glyph in the top bar. It explains, in plain words, what the
// track record is, shows where the leader is on the road to running AI-native
// (the capability stage), the honest calibration read, and the ONE next step
// that compounds (which is where "teach me your voice" belongs - a progression
// step, not a Decisions-surface card). No em dashes.

import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { CapabilityHeader } from './CapabilityHeader';
import { CalibrationSummary } from './CalibrationSummary';
import type { TrackRecordModel } from './trackRecordModel';
import type { CapabilityNextMove, CapabilityRead } from '@/lib/capabilityLadder';

export interface TrackRecordDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: TrackRecordModel;
  capability?: CapabilityRead | null;
  /** The single next-move action; the caller closes the drawer + routes. */
  onCapabilityGo?: (move: CapabilityNextMove) => void;
}

export function TrackRecordDrawer({ open, onOpenChange, model, capability, onCapabilityGo }: TrackRecordDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[88vh] border-border bg-[linear-gradient(180deg,#0d1219,#0a0e12)]">
        <DrawerTitle className="sr-only">Your track record</DrawerTitle>
        <div className="mx-auto flex w-full max-w-md flex-col gap-3.5 overflow-y-auto px-5 pb-6 pt-1 scrollbar-hide">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-accent">Your track record</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#c2cad6]">
              How your judgment is holding up over time: the calls you have made, how they turned out, and the one next
              step that makes you sharper.
            </p>
          </div>

          {/* Where you are on the road to running AI-native + the ONE next move. */}
          {capability && <CapabilityHeader capability={capability} onGo={onCapabilityGo} />}

          {/* The honest calibration read (n/N warm, % rich, or the cold promise). */}
          <CalibrationSummary model={model} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
