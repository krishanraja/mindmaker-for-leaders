import ctrlLogo from '@/assets/ctrl-logo.png';

/**
 * The real "ctrl." wordmark: the drawn monoline mark, not the generated text
 * stand-in. Squared terminals, wide tracking, emerald fading to pale mint left
 * to right, with the trailing dot as its own beat.
 *
 * Sized by height so it sits on the same baseline as the Mindmaker icon beside
 * it. The asset is 1064x270, so the width follows at roughly 3.9:1.
 */
export function CtrlWordmark({ className = 'h-[15px]' }: { className?: string }) {
  return <img src={ctrlLogo} alt="ctrl." className={`w-auto select-none ${className}`} />;
}
