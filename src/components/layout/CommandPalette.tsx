import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { CommandPaletteContext, useCommandPalette } from './useCommandPalette';

const CommandPaletteDialog = lazy(() => import('./CommandPaletteDialog').then((module) => ({ default: module.CommandPaletteDialog })))

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((value) => !value), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggle]);

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen, toggle }}>
      {children}
      {open && (
        <Suspense fallback={null}>
          <CommandPaletteDialog open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </CommandPaletteContext.Provider>
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
      className={`group flex min-h-11 items-center gap-2 px-3 rounded-lg border border-border bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-sm w-full max-w-md ${className}`}
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
