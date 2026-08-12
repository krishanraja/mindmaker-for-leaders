import { useReducedMotion } from 'framer-motion';
import { CtrlMonogram } from '@/components/brand/CtrlMonogram';

interface OnboardingBrandMarkProps {
  progress: number;
  size?: number;
  animated?: boolean;
  className?: string;
}

const TRANSITION = 'opacity 560ms cubic-bezier(0.22, 1, 0.36, 1)';

export function OnboardingBrandMark({
  progress,
  size = 32,
  animated = false,
  className,
}: OnboardingBrandMarkProps) {
  const reducedMotion = useReducedMotion();
  const ctrlProgress = Math.min(1, Math.max(0, progress));
  const ctrlOpacity = Math.sin(ctrlProgress * Math.PI * 0.5);
  const onboardingOpacity = Math.cos(ctrlProgress * Math.PI * 0.5);
  const transition = reducedMotion ? undefined : TRANSITION;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center select-none ${className ?? ''}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Mindmaker CTRL"
      data-brand-progress={ctrlProgress.toFixed(2)}
    >
      <span
        className="absolute inset-0"
        aria-hidden="true"
        style={{ opacity: onboardingOpacity, transition }}
      >
        <CtrlMonogram size={size} animated={animated} tone="mymu" />
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{ opacity: ctrlOpacity, transition }}
      >
        <CtrlMonogram size={size} animated={animated} tone="ctrl" />
      </span>
    </span>
  );
}
