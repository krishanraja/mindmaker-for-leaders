/**
 * Main-app design primitives (the dark ctrl-ds instrument language).
 *
 * These are the counterpart to src/components/kit/kitPrimitives.tsx, but for the
 * core app rather than the /kit portal. They codify the ONE polished card
 * language already used by Home (CockpitHero) and Decisions (DecisionBoard /
 * DecisionResultView) so every other surface - Settings first - can render on it
 * instead of hand-rolling flat cards and off-token colors.
 *
 * Tokens only: accent/border/card/muted-foreground. No raw hex outside the
 * gradient literals that the polished surfaces already ship (kept byte-identical
 * so the look matches exactly).
 */

import type { ComponentType, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// The canonical polished card: soft gradient, hairline border, deep shadow.
// Lifted from CockpitHero / DecisionResultView so it reads as one system.
export const SURFACE_CARD_CLASS =
  'rounded-[18px] border border-border bg-[linear-gradient(180deg,#101620,#0a0e12)] ' +
  'shadow-[0_24px_56px_-34px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.025)]';

/** The polished card container. Use for every settings/section card. */
export function Surface({
  children,
  className,
  accent = false,
}: {
  children: ReactNode;
  className?: string;
  /** Give the card the accent hairline used by heroes (border-accent/30). */
  accent?: boolean;
}) {
  return (
    <div className={cn(SURFACE_CARD_CLASS, accent && 'border-accent/30', className)}>{children}</div>
  );
}

/** The canonical micro-label eyebrow shared by Home, Decisions and the tune sheet. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'font-gobold text-[10px] uppercase tracking-[0.12em] text-muted-foreground',
        className,
      )}
    >
      {children}
    </p>
  );
}

/** A section heading for panels (replaces ad-hoc text-lg font-semibold titles). */
export function SectionHeading({
  title,
  hint,
  meta,
  className,
}: {
  title: ReactNode;
  hint?: ReactNode;
  /** Optional right-aligned meta (e.g. "3 active"). */
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-[15px] font-bold tracking-[-0.01em] text-foreground">{title}</h3>
        {meta && <span className="whitespace-nowrap text-[11px] text-muted-foreground">{meta}</span>}
      </div>
      {hint && <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * The polished list row - the one door metaphor for a navigable settings entry.
 * Replaces the flat divide-y row; matches the app's hover:border-accent/30 scale.
 */
export function SettingRow({
  icon: Icon,
  label,
  description,
  onClick,
  trailing,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  description: string;
  onClick: () => void;
  /** Overrides the default chevron (e.g. a badge). */
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-2xl border border-border bg-card/40 px-3.5 py-3 text-left transition-colors',
        'hover:border-accent/30 hover:bg-secondary/50 active:bg-secondary',
      )}
    >
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold leading-tight text-foreground">{label}</span>
        <span className="block truncate text-[12px] leading-snug text-muted-foreground">{description}</span>
      </span>
      {trailing ?? (
        <ChevronRight className="h-4 w-4 flex-none text-muted-foreground transition-colors group-hover:text-accent" />
      )}
    </button>
  );
}

/**
 * A SOLID pinned footer bar for drawers/sheets. Fixes the see-through "Done"
 * bar: content never shows through it. Sits flush to the sheet edges and pins
 * to the bottom of a scroll container.
 */
export function SheetFooterBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 -mx-5 mt-6 border-t border-border bg-card px-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3',
        className,
      )}
    >
      {children}
    </div>
  );
}
