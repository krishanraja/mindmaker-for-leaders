/* eslint-disable react-refresh/only-export-components -- co-locates the brand primitives with the KIT_SCOPE_VARS token map they share */
/**
 * Kit brand primitives, shared across the intake cascade (KitIntake) and the
 * post-build wizard (KitRevealWizard / KitBuildTrace). These are a literal port
 * of the approved mock (prototypes/kit-vibe-coding.html), scoped to the
 * `.kit-portal` `--kit-*` custom properties so they render on-brand wherever
 * the portal stylesheet (kit-portal.css) is in scope.
 *
 * KIT_SCOPE_VARS is also exported so a surface can guarantee the tokens are
 * present even before the global stylesheet lands (the same inline-scope trick
 * the forked intake already uses).
 */

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The mock's brand palette as inline custom properties. A literal port of the
 * locked mock; mirrors kit-portal.css so the primitives never render unstyled.
 */
export const KIT_SCOPE_VARS: CSSProperties & Record<`--${string}`, string> = {
  "--kit-bg": "#F3F5F1",
  "--kit-card": "#FFFFFF",
  "--kit-ink": "#13282C",
  "--kit-ink2": "#2B4248",
  "--kit-mut": "#697578",
  "--kit-faint": "#99A4A5",
  "--kit-line": "#E5E8E2",
  "--kit-line2": "#EEF1EB",
  "--kit-rail": "#D5DAD2",
  "--kit-acc": "#2A9E7C",
  "--kit-acc-deep": "#1E7860",
  "--kit-acc-soft": "#E6F4EE",
  "--kit-acc-line": "#BCE2D2",
  "--kit-ind": "#3E6E94",
  "--kit-ind-soft": "#E9F0F5",
  "--kit-ind-line": "#D2E0EA",
  "--kit-clay": "#B5563F",
  "--kit-clay-soft": "#F6E9E5",
  "--kit-slate": "#5A6A6D",
  "--kit-slate-soft": "#EDF1EF",
  "--kit-slate-line": "#DBE3E0",
  "--kit-display": "'Gobold', ui-sans-serif, -apple-system, 'Segoe UI', sans-serif",
};

export function KitCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn("rounded-2xl border p-5 sm:p-7", className)}
      style={{
        background: "var(--kit-card)",
        borderColor: "var(--kit-line)",
        boxShadow: "0 1px 2px rgba(16,28,30,.05), 0 18px 40px -24px rgba(16,28,30,.20)",
      }}
    >
      {children}
    </div>
  );
}

export function KitEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn("kit-label mb-3 text-[12px] font-bold uppercase", className)}
      style={{
        fontFamily: "var(--kit-display)",
        letterSpacing: "0.1em",
        color: "var(--kit-acc-deep)",
      }}
    >
      {children}
    </div>
  );
}

export function KitHeadline({ children, className }: { children: ReactNode; className?: string }) {
  // Inter, lowercase, slightly smaller so headlines do not wrap.
  return (
    <h1
      className={cn(
        "m-0 text-[clamp(20px,2.4vw,25px)] font-extrabold leading-[1.14] lowercase",
        className,
      )}
      style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.02em", color: "var(--kit-ink)" }}
    >
      {children}
    </h1>
  );
}

export function KitSub({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("mt-2 max-w-[42ch] text-[14.5px]", className)} style={{ color: "var(--kit-mut)" }}>
      {children}
    </p>
  );
}

export function KitPrimaryButton({
  children,
  disabled,
  onClick,
  className,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex flex-1 items-center justify-center rounded-[13px] px-4 py-3.5 text-[15px] font-extrabold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      style={{
        background: "linear-gradient(180deg, var(--kit-acc), var(--kit-acc-deep))",
        boxShadow: disabled ? "none" : "0 12px 26px -14px rgba(10,158,132,.85)",
        letterSpacing: "-0.005em",
      }}
    >
      {children}
    </button>
  );
}

/** The mock's ".btn.ghost": white, inked, bordered. Used for the secondary output action. */
export function KitGhostButton({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-2 rounded-[13px] border px-4 py-3.5 text-[15px] font-extrabold transition-all",
        className,
      )}
      style={{
        background: "var(--kit-card)",
        borderColor: "var(--kit-line)",
        color: "var(--kit-ink)",
        boxShadow: "0 1px 2px rgba(16,28,30,.05)",
      }}
    >
      {children}
    </button>
  );
}

/** The mock's ".linkish": a centered, quiet, full-width secondary link button. */
export function KitLinkish({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("block w-full cursor-pointer border-none bg-transparent py-3 text-center text-[13.5px] font-semibold", className)}
      style={{ color: "var(--kit-mut)" }}
    >
      {children}
    </button>
  );
}

/** The quiet back link the cascade and wizard share. */
export function KitBack({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[13px] px-1.5 py-3.5 text-[15px] font-medium transition-colors"
      style={{ color: "var(--kit-mut)" }}
    >
      &larr; Back
    </button>
  );
}
