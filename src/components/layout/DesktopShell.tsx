import { useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Home,
  Zap,
  Brain,
  Radio,
  ArrowUpRight,
  Target,
  TrendingUp,
  Map as MapIcon,
  Settings,
  Shield,
  LogOut,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { CtrlLogo } from '@/components/landing/CtrlLogo';
import { CommandPaletteTrigger } from './CommandPalette';

const navItems = [
  { path: '/dashboard', search: '', icon: Home, label: 'Home', shortcut: 'H' },
  { path: '/dashboard', search: '?view=edge', icon: Zap, label: 'Edge', shortcut: 'E' },
  { path: '/memory', search: '', icon: Brain, label: 'Memory', shortcut: 'M' },
  { path: '/context', search: '', icon: ArrowUpRight, label: 'Export', shortcut: 'X' },
  { path: '/briefing', search: '', icon: Radio, label: 'Briefing', shortcut: 'B' },
  { path: '/goals', search: '', icon: Target, label: 'Goals', shortcut: 'G' },
  { path: '/track-record', search: '', icon: TrendingUp, label: 'Track Record', shortcut: 'T' },
  { path: '/decision-map', search: '', icon: MapIcon, label: 'Decision Map', shortcut: 'D' },
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

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'You';
  const initials = firstName.slice(0, 2).toUpperCase();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-card/30 backdrop-blur-md border-r border-border/60 flex flex-col z-40">
      {/* Brand */}
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="h-14 px-4 flex items-center gap-2.5 border-b border-border/60 hover:bg-secondary/40 transition-colors text-left"
      >
        <CtrlLogo className="h-3.5 w-auto" />
      </button>

      {/* Primary nav */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto scrollbar-hide">
        <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Workspace
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const fullPath = item.path + item.search;
          const isActive =
            (item.search
              ? location.pathname + location.search === fullPath
              : location.pathname === item.path && !location.search) ||
            (item.path !== '/dashboard' && !item.search && location.pathname.startsWith(item.path));

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
                'group w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium',
                'transition-colors duration-100',
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
              )}
            >
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
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
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
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
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
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
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

  return (
    <div className="h-screen-safe overflow-hidden bg-background">
      <DesktopRail />
      <div className="ml-[220px] flex flex-col h-full min-h-0">
        <DesktopTopBar title={title} eyebrow={eyebrow} actions={actions} />
        <div className="flex-1 flex min-h-0">
          <main
            className={cn(
              'flex-1 min-w-0 min-h-0 flex flex-col',
              fit ? 'overflow-hidden' : 'overflow-y-auto scrollbar-hide',
              !bleed && 'px-8 py-6',
            )}
          >
            {children}
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
