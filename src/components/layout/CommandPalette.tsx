import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Zap,
  Brain,
  Radio,
  ArrowUpRight,
  Target,
  Settings,
  Shield,
  User,
  LogOut,
  Mic,
  Download,
  Scale,
  History,
  Boxes,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useAuth } from '@/components/auth/AuthProvider';
import { CommandPaletteContext, useCommandPalette } from './useCommandPalette';

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((v) => !v);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen, toggle }}>
      {children}
      <CommandPalette />
    </CommandPaletteContext.Provider>
  );
}

function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  // Search-first: at rest we show a SHORT primary set (the four tabs + the core
  // actions); the rest only appears once the leader types, so the door is never
  // a wall of 13 options. cmdk filters across everything that is rendered, so
  // rendering "More" only while searching keeps everything findable.
  const [q, setQ] = useState('');
  const searching = q.trim().length > 0;

  const go = (path: string) => () => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput value={q} onValueChange={setQ} placeholder="Search or jump anywhere..." />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>No matches.</CommandEmpty>

        {/* PRIMARY: the four tabs (matching the app nav + its G_ chords) + the
            two actions a leader reaches for most. Always shown. */}
        <CommandGroup heading="Go to">
          <CommandItem onSelect={go('/dashboard')}>
            <Home className="mr-2 h-4 w-4" />
            Home
            <CommandShortcut>G H</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={go('/decision')}>
            <Scale className="mr-2 h-4 w-4" />
            Decisions
            <CommandShortcut>G D</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={go('/memory')}>
            <Brain className="mr-2 h-4 w-4" />
            Brain
            <CommandShortcut>G B</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={go('/track-record')}>
            <History className="mr-2 h-4 w-4" />
            History
            <CommandShortcut>G Y</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Do">
          <CommandItem onSelect={go('/briefing')}>
            <Radio className="mr-2 h-4 w-4" />
            Read today's briefing
          </CommandItem>
          <CommandItem onSelect={go('/context')}>
            <Boxes className="mr-2 h-4 w-4" />
            Build a skill
          </CommandItem>
        </CommandGroup>

        {/* MORE: only while searching, so it never crowds the resting palette. */}
        {searching && (
          <>
            <CommandSeparator />
            <CommandGroup heading="More">
              <CommandItem onSelect={go('/dashboard?view=edge')}>
                <Zap className="mr-2 h-4 w-4" />
                Edge
              </CommandItem>
              <CommandItem onSelect={go('/goals')}>
                <Target className="mr-2 h-4 w-4" />
                Goals
              </CommandItem>
              <CommandItem onSelect={go('/context')}>
                <Download className="mr-2 h-4 w-4" />
                Quick export to AI
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  window.dispatchEvent(new CustomEvent('mm:capture-voice'));
                }}
              >
                <Mic className="mr-2 h-4 w-4" />
                Capture a thought (voice)
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  window.dispatchEvent(new CustomEvent('mm:generate-briefing'));
                }}
              >
                <Zap className="mr-2 h-4 w-4" />
                Generate today's briefing
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Account">
              <CommandItem onSelect={go('/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </CommandItem>
              <CommandItem onSelect={go('/compliance')}>
                <Shield className="mr-2 h-4 w-4" />
                Compliance
              </CommandItem>
              <CommandItem onSelect={go('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  signOut();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

/** Trigger button styled for the top bar. */
export function CommandPaletteTrigger({ className = '' }: { className?: string }) {
  const { toggle } = useCommandPalette();
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(/Mac/i.test(navigator.platform));
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      className={`group flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm w-full max-w-md ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 shrink-0 opacity-60"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <span className="flex-1 text-left text-xs">Jump anywhere, search, run actions...</span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono">
        {isMac ? '⌘' : 'Ctrl'} K
      </kbd>
    </button>
  );
}
