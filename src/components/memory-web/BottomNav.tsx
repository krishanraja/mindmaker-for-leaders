import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Zap, Brain, Scale, Radio, History } from 'lucide-react';
import { cn } from '@/lib/utils';

// COCKPIT v1 (flag on): the 4-tab model. Home=cockpit, Decisions=Decide + map,
// Brain=memory, You=profile + record. Briefing dissolves into the cockpit hero;
// Edge/automate is contextual (zap on a blocker + an Edge card on Home).
const cockpitNav = [
  { path: '/dashboard', search: '', icon: Home, label: 'Home' },
  { path: '/decision', search: '', icon: Scale, label: 'Decisions' },
  { path: '/memory', search: '', icon: Brain, label: 'Memory' },
  { path: '/track-record', search: '', icon: History, label: 'Track record' },
];

// Legacy 6-tab nav (flag off). "Decide" leads over the old "Export" tab.
const legacyNav = [
  { path: '/dashboard', search: '', icon: Home, label: 'Home' },
  { path: '/dashboard', search: '?view=edge', icon: Zap, label: 'Edge' },
  { path: '/memory', search: '', icon: Brain, label: 'Memory' },
  { path: '/decision', search: '', icon: Scale, label: 'Decide' },
  { path: '/briefing', search: '', icon: Radio, label: 'Briefing' },
  { path: '/track-record', search: '', icon: History, label: 'History' },
];

const COCKPIT_ENABLED = import.meta.env.VITE_COCKPIT_ENABLED === 'true';
const navItems = COCKPIT_ENABLED ? cockpitNav : legacyNav;

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 pb-safe bg-background/95 backdrop-blur-lg border-t border-white/[0.04] z-50">
      <div className="flex items-center justify-around h-full max-w-lg mx-auto px-2">
        {navItems.map((item) => {
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
                'relative flex flex-col items-center justify-center gap-1 flex-1 h-full',
                'transition-colors duration-200 min-h-[44px]',
                isActive ? 'text-accent' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {/* Active glow dot */}
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-accent"
                  style={{
                    boxShadow: '0 0 8px rgba(16,185,129,0.4), 0 2px 12px rgba(16,185,129,0.2)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <motion.div
                animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                transition={isActive ? { duration: 0.3 } : {}}
              >
                <Icon className={cn('h-5 w-5', isActive && 'text-accent')} />
              </motion.div>
              <span className={cn(
                'text-[10px] font-medium',
                isActive && 'text-accent',
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
