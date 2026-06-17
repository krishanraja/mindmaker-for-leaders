/**
 * BrandLockup - the Mindmaker icon + the ctrl. logo, side by side.
 *
 * Per Krish (2026-06-17): the top-left app logo is NOT generated "ctrl." text;
 * it is the Mindmaker brand icon (the emerald bars) followed by the ctrl. logo
 * wordmark to its right - Mindmaker the parent, CTRL the product. The Mindmaker
 * icon is also the favicon + social/OG image across the app.
 *
 * Both assets are emerald-on-transparent, so the lockup sits cleanly on the
 * forced-dark chrome. Pass a height class via `className` if a surface needs a
 * different scale; the two marks scale together off the icon height.
 */
import mindmakerIcon from '@/assets/mindmaker-icon.png';
import ctrlLogo from '@/assets/ctrl-logo.png';

interface BrandLockupProps {
  className?: string;
}

export function BrandLockup({ className }: BrandLockupProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 select-none ${className ?? ''}`}
      aria-label="Mindmaker CTRL"
    >
      <img src={mindmakerIcon} alt="" aria-hidden className="h-[19px] w-auto" />
      <img src={ctrlLogo} alt="ctrl" className="h-[13px] w-auto" />
    </span>
  );
}
