/* eslint-disable react-refresh/only-export-components -- co-locates the brand primitives with the CAPTURE_SCOPE_VARS token map they share */
/**
 * Light-palette primitives for the public /download capture page.
 *
 * These lived in components/kit/ because /download was the front door into the
 * Kit funnel. The Kit is now retired and this page is still LIVE (Vercel sets
 * VITE_FF_CAPTURE=true in production), which is why they moved out ahead of the
 * deletion rather than with it. Not merged into components/system/surface.tsx:
 * that is the DARK main-app system and would fight this light palette.
 *
 * Every value is inline, on purpose. The primitives once relied on a portal
 * stylesheet that has been deleted with the rest of the Kit, so CAPTURE_SCOPE_VARS
 * carries the whole palette and they cannot render unstyled.
 */

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The brand palette as inline custom properties, so nothing external is needed. */
export const CAPTURE_SCOPE_VARS: CSSProperties & Record<`--${string}`, string> = {
  "--capture-bg": "#F3F5F1",
  "--capture-card": "#FFFFFF",
  "--capture-ink": "#13282C",
  "--capture-ink2": "#2B4248",
  "--capture-mut": "#697578",
  "--capture-faint": "#99A4A5",
  "--capture-line": "#E5E8E2",
  "--capture-line2": "#EEF1EB",
  "--capture-rail": "#D5DAD2",
  "--capture-acc": "#2A9E7C",
  "--capture-acc-deep": "#1E7860",
  "--capture-acc-soft": "#E6F4EE",
  "--capture-acc-line": "#BCE2D2",
  "--capture-ind": "#3E6E94",
  "--capture-ind-soft": "#E9F0F5",
  "--capture-ind-line": "#D2E0EA",
  "--capture-clay": "#B5563F",
  "--capture-clay-soft": "#F6E9E5",
  "--capture-slate": "#5A6A6D",
  "--capture-slate-soft": "#EDF1EF",
  "--capture-slate-line": "#DBE3E0",
  "--capture-display": "'Gobold', ui-sans-serif, -apple-system, 'Segoe UI', sans-serif",
};

export function CaptureCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn("rounded-2xl border p-5 sm:p-7", className)}
      style={{
        background: "var(--capture-card)",
        borderColor: "var(--capture-line)",
        boxShadow: "0 1px 2px rgba(16,28,30,.05), 0 18px 40px -24px rgba(16,28,30,.20)",
      }}
    >
      {children}
    </div>
  );
}

export function CaptureEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn("mb-3 text-[12px] font-bold uppercase", className)}
      style={{
        fontFamily: "var(--capture-display)",
        letterSpacing: "0.1em",
        color: "var(--capture-acc-deep)",
      }}
    >
      {children}
    </div>
  );
}

export function CaptureHeadline({ children, className }: { children: ReactNode; className?: string }) {
  // Inter, lowercase, slightly smaller so headlines do not wrap.
  return (
    <h1
      className={cn(
        "m-0 text-[clamp(20px,2.4vw,25px)] font-extrabold leading-[1.14] lowercase",
        className,
      )}
      style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.02em", color: "var(--capture-ink)" }}
    >
      {children}
    </h1>
  );
}

export function CaptureSub({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("mt-2 max-w-[42ch] text-[14.5px]", className)} style={{ color: "var(--capture-mut)" }}>
      {children}
    </p>
  );
}

export function CapturePrimaryButton({
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
        background: "linear-gradient(180deg, var(--capture-acc), var(--capture-acc-deep))",
        boxShadow: disabled ? "none" : "0 12px 26px -14px rgba(10,158,132,.85)",
        letterSpacing: "-0.005em",
      }}
    >
      {children}
    </button>
  );
}

/** The mock's ".btn.ghost": white, inked, bordered. Used for the secondary output action. */
export function CaptureGhostButton({
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
        background: "var(--capture-card)",
        borderColor: "var(--capture-line)",
        color: "var(--capture-ink)",
        boxShadow: "0 1px 2px rgba(16,28,30,.05)",
      }}
    >
      {children}
    </button>
  );
}

/** The mock's ".linkish": a centered, quiet, full-width secondary link button. */
export function CaptureLinkish({
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
      style={{ color: "var(--capture-mut)" }}
    >
      {children}
    </button>
  );
}

/** The quiet back link the cascade and wizard share. */
export function CaptureBack({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[13px] px-1.5 py-3.5 text-[15px] font-medium transition-colors"
      style={{ color: "var(--capture-mut)" }}
    >
      &larr; Back
    </button>
  );
}
