/**
 * BrandLockup - the Mindmaker brand icon (the emerald bars).
 *
 * Per Krish (2026-06-22): the top-left app logo is now the Mindmaker brand icon
 * ALONE - the "ctrl" wordmark was removed at his request. The Mindmaker icon is
 * also the favicon + social/OG image across the app.
 *
 * The icon is emerald-on-transparent, so it sits cleanly on the forced-dark
 * chrome. Pass a height class via `className` if a surface needs a different
 * scale.
 */
import mindmakerIcon from '@/assets/mindmaker-icon.png';

interface BrandLockupProps {
  className?: string;
}

export function BrandLockup({ className }: BrandLockupProps) {
  return (
    <span
      className={`inline-flex items-center select-none ${className ?? ''}`}
      aria-label="Mindmaker CTRL"
    >
      <img src={mindmakerIcon} alt="Mindmaker CTRL" className="h-[19px] w-auto" />
    </span>
  );
}
