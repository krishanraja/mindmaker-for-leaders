/**
 * CtrlLogo - the real "ctrl." wordmark.
 *
 * The approved mock retires the old Mindmaker green-gradient block-letter
 * SVG in favour of a lowercase emerald "ctrl." wordmark: lowercase letters
 * plus a period, emerald (#00D9B6 via the accent token), clean sans, tight
 * tracking. The trailing period is dimmed slightly so it reads as a beat,
 * not a fifth letter.
 *
 * Same export name and prop signature (className) as before so every
 * existing import keeps working. Pass a height/font-size class to size it,
 * e.g. <CtrlLogo className="text-2xl" />.
 */

interface CtrlLogoProps {
  className?: string;
}

export function CtrlLogo({ className }: CtrlLogoProps) {
  return (
    <span
      aria-label="ctrl."
      className={`inline-flex items-baseline font-bold tracking-tight text-accent leading-none select-none ${className ?? ""}`}
    >
      ctrl
      <span className="text-accent/60">.</span>
    </span>
  );
}
