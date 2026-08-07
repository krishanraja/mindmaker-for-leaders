import ctrlWordmark from '@/assets/ctrl-wordmark-new.png';

/**
 * The CTRL wordmark: drawn caps with the emerald fading to pale mint left to
 * right, sitting beside the Mindmaker icon that BrandLockup renders.
 *
 * Sized by height so it shares a baseline with that icon. The asset is
 * 1020x295, so the width follows at roughly 3.5:1; pass a height class and the
 * width takes care of itself.
 *
 * It replaced ctrl-logo.png, the earlier monoline stand-in. The import points
 * at the real filename rather than keeping the old name with new bytes inside
 * it, because a file called ctrl-logo.png containing something else is a trap
 * for whoever opens it next.
 */
export function CtrlWordmark({ className = 'h-[15px]' }: { className?: string }) {
  return <img src={ctrlWordmark} alt="ctrl." className={`w-auto select-none ${className}`} />;
}
