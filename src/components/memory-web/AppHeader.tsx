import type { ReactNode } from 'react';
import { Plus, ArrowUpRight, Settings as SettingsIcon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { BrandLockup } from '@/components/landing/BrandLockup';
import { useSettingsSheet } from '@/contexts/SettingsSheetContext';
import { BriefingHeaderButton } from '@/components/briefing/BriefingHeaderButton';
import { TuneFeedButton } from '@/components/cockpit/TuneFeedButton';

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

  return (
    <header className="flex-shrink-0 flex items-center justify-between px-5 pt-4 pb-2">
      <div className="flex items-center gap-2">
        <BrandLockup />
      </div>
      {center && (
        <div className="min-w-0 flex flex-1 justify-center px-2">{center}</div>
      )}
      <div className="flex items-center gap-1.5">
        {/* Tune-feed and the audio digest belong to Home (the daily-read door).
            Off Home, the header carries only that page's own actions, so each tab
            reads as its own surface (Play lives on Home, not on Memory/Decisions). */}
        {isHome && <TuneFeedButton compact />}
        {isHome && <BriefingHeaderButton />}
        {onExport && (
          <button
            onClick={onExport}
            className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent hover:bg-accent/20 transition-colors"
            aria-label="Export to AI"
          >
            <ArrowUpRight className="h-4 w-4" />
          </button>
        )}
        {onAdd && (
          <button
            onClick={onAdd}
            className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white hover:bg-accent/90 transition-colors"
            aria-label="Add memory"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={openSheet}
          className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Open settings"
        >
          <SettingsIcon className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
