import type { ReactNode } from 'react';
import { Plus, ArrowUpRight, Settings as SettingsIcon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { BrandLockup } from '@/components/landing/BrandLockup';
import { useSettingsSheet } from '@/contexts/SettingsSheetContext';
import { BriefingHeaderButton } from '@/components/briefing/BriefingHeaderButton';
import { TrackRecordHeaderButton } from '@/components/track-record/TrackRecordHeaderButton';

interface AppHeaderProps {
  /**
   * Retained for compatibility. The profile button no longer renders in the
   * header on any platform; Profile is reachable from the Settings sheet.
   */
  showProfile?: boolean;
  onAdd?: () => void;
  onExport?: () => void;
  /**
   * Optional control teleported into the header center by the active page (for
   * example the Decisions "Now | History" toggle), so a page-level switcher
   * lives in the bar instead of spending a row of content space. Centered
   * between the brand lockup and the right-hand actions.
   */
  center?: ReactNode;
  /** Retained for route compatibility. The handoff still keeps Settings
      reachable because privacy and delivery controls must never disappear. */
  handoff?: boolean;
}

/**
 * Shared app header: small favicon icon + CTRL logo in top-left, and a
 * Settings gear in the top-right so chrome is always reachable. Used on all
 * authenticated mobile pages. Optionally renders Add / Export action buttons,
 * and an optional page-pushed control in the center.
 */
export function AppHeader({ onAdd, onExport, center }: AppHeaderProps) {
  const { openSheet } = useSettingsSheet();
  const location = useLocation();
  const isHome = location.pathname === '/dashboard' && !location.search;
  // The track-record ring lives on the Decisions tab only (that is the surface
  // whose prime real estate it freed).
  const isDecision = location.pathname === '/decision';

  return (
    <header className="flex-shrink-0 flex items-center justify-between px-5 pt-4 pb-2">
      <div className="flex items-center gap-2">
        <BrandLockup />
      </div>
      {center && (
        <div className="min-w-0 flex flex-1 justify-center px-2">{center}</div>
      )}
      <div className="flex items-center gap-1.5">
        {/* Home keeps one premium audio door. Feed tuning now lives in Settings,
            so the header does not become a row of competing utility icons. */}
        {isHome && <BriefingHeaderButton />}
        {isDecision && <TrackRecordHeaderButton />}
        {onExport && (
          <button
            onClick={onExport}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent transition-colors hover:bg-accent/20"
            aria-label="Export to AI"
          >
            <ArrowUpRight className="h-4 w-4" />
          </button>
        )}
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-colors hover:bg-accent/90"
            aria-label="Add memory"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={openSheet}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-card/70 text-muted-foreground transition-colors hover:border-accent/30 hover:text-foreground"
          aria-label="Open settings"
          title="Settings"
        >
          <SettingsIcon className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  );
}
