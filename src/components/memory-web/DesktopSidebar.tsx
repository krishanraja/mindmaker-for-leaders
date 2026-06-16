import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Home, Zap, Brain, Radio, ArrowUpRight, Settings, Shield, LogOut, User, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { CtrlLogo } from '@/components/landing/CtrlLogo';

const navItems = [
  { path: '/dashboard', search: '', icon: Home, label: 'Home' },
  { path: '/dashboard', search: '?view=edge', icon: Zap, label: 'Edge' },
  { path: '/memory', search: '', icon: Brain, label: 'Memory Web' },
  { path: '/goals', search: '', icon: Target, label: 'Goals' },
  { path: '/context', search: '', icon: ArrowUpRight, label: 'Export' },
  { path: '/briefing', search: '', icon: Radio, label: 'Briefing' },
];

export function DesktopSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  const { signOut } = useAuth();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-background border-r border-border flex flex-col z-40">
      <div
        className="px-5 py-4 border-b border-border flex items-center gap-2.5 cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={() => navigate('/dashboard')}
      >
        <CtrlLogo className="h-4 w-auto translate-x-0.5" />
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
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
                'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium',
                'transition-colors duration-150',
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
              )}
            >
              <Icon
                className={cn(
                  'h-[18px] w-[18px]',
                  isActive ? 'text-accent' : 'text-muted-foreground',
                )}
              />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-0.5">
        <button
          onClick={() => navigate('/profile')}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium',
            'transition-colors duration-150',
            location.pathname === '/profile'
              ? 'bg-accent/10 text-accent'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
          )}
        >
          <User className="h-[18px] w-[18px]" />
          Profile
        </button>
        <button
          onClick={() => navigate('/compliance')}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium',
            'transition-colors duration-150',
            location.pathname === '/compliance'
              ? 'bg-accent/10 text-accent'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
          )}
        >
          <Shield className="h-[18px] w-[18px]" />
          Compliance
        </button>
        <button
          onClick={() => navigate('/settings')}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium',
            'transition-colors duration-150',
            location.pathname === '/settings'
              ? 'bg-accent/10 text-accent'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
          )}
        >
          <Settings className="h-[18px] w-[18px]" />
          Settings
        </button>
        <button
          onClick={signOut}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium',
            'transition-colors duration-150',
            'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
          )}
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
