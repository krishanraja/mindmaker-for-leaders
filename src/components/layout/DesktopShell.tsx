import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Home,
  Zap,
  Brain,
  Scale,
  Radio,
  ArrowUpRight,
  Target,
  Map as MapIcon,
  Settings,
  Shield,
  LogOut,
  User,
  History,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { resolveDisplayName } from '@/components/cockpit/cockpitGreeting';
import { BrandLockup } from '@/components/landing/BrandLockup';
import { CommandPaletteTrigger } from './CommandPalette';
import { PageTransition } from './PageTransition';
import { BriefingHeaderButton } from '@/components/briefing/BriefingHeaderButton';
import { TrackRecordHeaderButton } from '@/components/track-record/TrackRecordHeaderButton';
import { useBriefingContext } from '@/contexts/BriefingContext';

// The audio mini-player floats `fixed` near the bottom; reserve its height on the
// content column so no page's content hides under it (mirrors MobileFrame).
const MINI_PLAYER_CLEARANCE = '60px';

// PRIMARY nav: the SAME 3 stable tabs as the mobile BottomNav cockpit model
// (Home / Decisions / Memory), in the same order and with the same icons, so
// desktop and mobile read as one system (CTRL-SYSTEM-SPEC s1). Track record is
// folded into Decisions (a Now|History toggle), so the spine is now three tabs.
// Plain names: every tab says exactly what it is.
const primaryNavItems = [
  { path: '/dashboard', search: '', icon: Home, label: 'Home', shortcut: 'H' },
  { path: '/decision', search: '', icon: Scale, label: 'Decisions', shortcut: 'D' },
  { path: '/memory', search: '', icon: Brain, label: 'Memory', shortcut: 'B' },
];

// SECONDARY surfaces: still one click away, just demoted out of the primary spine.
// No routes removed; everything stays reachable. Track record keeps its own route
// here for deep links even though it now also lives inside the Decisions tab.
const secondaryNavItems = [
  { path: '/dashboard', search: '?view=edge', icon: Zap, label: 'Edge', shortcut: 'E' },
  { path: '/briefing', search: '', icon: Radio, label: 'Briefing', shortcut: 'R' },
  { path: '/track-record', search: '', icon: History, label: 'Track record', shortcut: 'Y' },
  { path: '/context', search: '', icon: ArrowUpRight, label: 'Export', shortcut: 'X' },
  { path: '/goals', search: '', icon: Target, label: 'Goals', shortcut: 'G' },
  { path: '/decision-map', search: '', icon: MapIcon, label: 'Decision Map', shortcut: 'M' },
];

const accountItems = [
  { path: '/profile', icon: User, label: 'Profile' },
  { path: '/compliance', icon: Shield, label: 'Compliance' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

/**
 * Desktop sidebar - dense rail with icon + label, keyboard hints on hover.
 * Width 220px to leave more room for content.
 */
function DesktopRail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  const { signOut, user } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  // Clean display name (omits ugly email/handle/id). Footer falls back to "You".
  const displayName = resolveDisplayName(user);
  const firstName = displayName ?? 'You';
  const initials = firstName.slice(0, 2).toUpperCase();

  // Radical focus: the default sidebar is the 3 primary tabs; the secondary
  // surfaces sit behind a collapsed "More" (they are also all reachable via the
  // command palette). Auto-open More when the leader is already on one of them so
  // the active item is never hidden.
  const onSecondary = secondaryNavItems.some((item) =>
    item.search
      ? location.pathname + location.search === item.path + item.search
      : location.pathname === item.path && !location.search,
  );
  const [moreOpen, setMoreOpen] = useState(onSecondary);
  useEffect(() => {
    if (onSecondary) setMoreOpen(true);
  }, [onSecondary]);

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-card/30 backdrop-blur-md border-r border-border/60 flex flex-col z-40">
      {/* Brand */}
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="h-14 px-4 flex items-center gap-2.5 border-b border-border/60 hover:bg-secondary/50 transition-colors text-left"
      >
        <BrandLockup />
      </button>

      {/* Nav. The PRIMARY group is the 4 stable tabs (matches mobile); the
          secondary + account groups are demoted but always one click away. */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto scrollbar-hide">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const fullPath = item.path + item.search;
          // Exact match: a primary tab is active only on its own path (so
          // Decisions /decision is NOT lit by the secondary Decision Map
          // /decision-map). Home is active on /dashboard with no ?view.
          const isActive = item.search
            ? location.pathname + location.search === fullPath
            : location.pathname === item.path && !location.search;

          return (
            <button
              key={item.label}
              onClick={() => {
                if (location.pathname === item.path) {
                  setSearchParams(item.search ? new URLSearchParams(item.search) : {});
                } else {
                  navigate({ pathname: item.path, search: item.search });
                }
              }}
              className={cn(
                'group relative w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium',
                'transition-colors duration-100',
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
              )}
            >
              {/* Active glow indicator: the same emerald affordance the mobile
                  BottomNav active item carries, so desktop and mobile read as
                  one system. A left-edge accent bar with a soft accent glow. */}
              {isActive && (
                <motion.span
                  layoutId="desktop-nav-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-accent"
                  style={{
                    boxShadow:
                      '0 0 8px hsl(var(--accent) / 0.55), 0 0 14px hsl(var(--accent) / 0.35)',
                  }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 400, damping: 30 }
                  }
                  aria-hidden="true"
                />
              )}
              <Icon className={cn('h-4 w-4', isActive ? 'text-accent' : '')} />
              <span className="flex-1 text-left">{item.label}</span>
              <kbd
                className={cn(
                  'hidden group-hover:inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded border text-[10px] font-mono',
                  isActive
                    ? 'border-accent/30 text-accent/70'
                    : 'border-border/60 text-muted-foreground/70',
                )}
              >
                G {item.shortcut}
              </kbd>
            </button>
          );
        })}

        {/* SECONDARY surfaces (demoted out of the primary 3, still reachable):
            collapsed by default so the sidebar stays focused. */}
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          className="w-full flex items-center justify-between px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          <span>More</span>
          <ChevronRight className={cn('h-3 w-3 transition-transform', moreOpen && 'rotate-90')} />
        </button>
        {moreOpen && secondaryNavItems.map((item) => {
          const Icon = item.icon;
          const fullPath = item.path + item.search;
          const isActive = item.search
            ? location.pathname + location.search === fullPath
            : location.pathname === item.path && !location.search;
          return (
            <button
              key={item.label}
              onClick={() => {
                if (location.pathname === item.path) {
                  setSearchParams(item.search ? new URLSearchParams(item.search) : {});
                } else {
                  navigate({ pathname: item.path, search: item.search });
                }
              }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}

        <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Account
        </p>
        {accountItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-border/60 p-2.5">
        <div className="flex items-center gap-2 px-2 py-2 rounded-md">
          <div className="h-7 w-7 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{firstName}</p>
            {/* Show the email only when we resolved a real name. A leader who
                signed up with just an email (or a throwaway id-like address) sees
                a clean "You", never a raw machine identifier under the avatar,
                matching resolveDisplayName's greeting rule. */}
            {displayName && (
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            )}
          </div>
          <button
            type="button"
            onClick={signOut}
            className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

type DesktopTopBarProps = {
  title?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
};

function DesktopTopBar({ title, eyebrow, actions }: DesktopTopBarProps) {
  const location = useLocation();
  // Play belongs to Home (the daily-read door), matching the mobile header. Off
  // Home the top bar carries only that page's own actions; the briefing stays
  // reachable from Home and the "Briefing" rail item.
  const isHome = location.pathname === '/dashboard' && !location.search;
  const isDecision = location.pathname === '/decision';
  return (
    <header className="h-14 flex-shrink-0 flex items-center gap-4 px-6 border-b border-border/60 bg-background/80 backdrop-blur-md z-30">
      <div className="min-w-0 flex-1 flex items-center gap-4">
        {(title || eyebrow) && (
          <div className="min-w-0 flex-shrink-0">
            {eyebrow && (
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 leading-none mb-1">
                {eyebrow}
              </p>
            )}
            {title && (
              <h1 className="text-sm font-semibold text-foreground leading-none truncate">
                {title}
              </h1>
            )}
          </div>
        )}
        <div className="flex-1 max-w-md">
          <CommandPaletteTrigger />
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Your audio digest lives on Home (matches the mobile header). */}
        {isHome && <BriefingHeaderButton />}
        {/* The track-record ring lives on the Decisions tab (matches mobile). */}
        {isDecision && <TrackRecordHeaderButton />}
        {actions}
      </div>
    </header>
  );
}

type DesktopShellProps = {
  title?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  rightRail?: React.ReactNode;
  rightRailWidth?: number;
  children: React.ReactNode;
  /** When true, removes default padding from the main content area. */
  bleed?: boolean;
  /**
   * When true, the page owns its own scroll/fit behaviour: <main> becomes a
   * bounded `flex flex-col min-h-0` column with NO scroll of its own, and the
   * page is responsible for fitting its content (the fit-to-viewport default).
   * When false (legacy), <main> provides a single hidden-scrollbar region so
   * overflow is reachable without ever producing a page/body scrollbar.
   */
  fit?: boolean;
};

/**
 * Unified desktop shell. Pins the whole app to the viewport (100dvh via the
 * shared --mobile-vh var) so the WINDOW never scrolls on any device:
 *  - Fixed 220px navigation rail
 *  - 56px top bar (page title + command palette + page actions)
 *  - A bounded main region that hands children a `flex flex-col min-h-0`
 *    context. Children fit-to-viewport; any overflow lives in an internal
 *    hidden-scrollbar region, never the page itself.
 */
export function DesktopShell({
  title,
  eyebrow,
  actions,
  rightRail,
  rightRailWidth = 360,
  bleed = false,
  fit = true,
  children,
}: DesktopShellProps) {
  // Lock the body/window scroll only while an authed app surface is mounted.
  // The CSS rule `body.app-locked { overflow: hidden }` keys off this class, and
  // the touchmove rubber-band suppression in mobileViewport.ts is gated on it too.
  // Public marketing pages never mount this shell, so they scroll normally.
  useEffect(() => {
    document.body.classList.add('app-locked');
    return () => {
      document.body.classList.remove('app-locked');
    };
  }, []);

  const { isMiniPlayerVisible } = useBriefingContext();

  return (
    <div className="h-screen-safe overflow-hidden bg-background">
      <DesktopRail />
      <div
        className="ml-[220px] flex flex-col h-full min-h-0"
        style={isMiniPlayerVisible ? { paddingBottom: MINI_PLAYER_CLEARANCE } : undefined}
      >
        <DesktopTopBar title={title} eyebrow={eyebrow} actions={actions} />
        <div className="flex-1 flex min-h-0">
          <main
            className={cn(
              'flex-1 min-w-0 min-h-0 flex flex-col',
              fit ? 'overflow-hidden' : 'overflow-y-auto scrollbar-hide',
              !bleed && 'px-8 py-6',
            )}
          >
            <PageTransition>{children}</PageTransition>
          </main>
          {rightRail && (
            <aside
              className="hidden xl:flex flex-col min-h-0 border-l border-border/60 bg-card/20 overflow-y-auto scrollbar-hide"
              style={{ width: rightRailWidth, flexShrink: 0 }}
            >
              {rightRail}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
