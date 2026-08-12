import { motion, useReducedMotion } from 'framer-motion';
import { useId } from 'react';

interface CtrlMonogramProps {
  size?: number;
  animated?: boolean;
  className?: string;
  tone?: 'ctrl' | 'mymu';
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function CtrlMonogram({ size = 32, animated = false, className, tone = 'ctrl' }: CtrlMonogramProps) {
  const gradientId = useId();
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;

  const motionProps = (index: number) =>
    shouldAnimate
      ? ({
          initial: { opacity: 0, scale: 0.62 },
          animate: { opacity: 1, scale: 1 },
          transition: { delay: 0.08 + index * 0.11, duration: 0.72, ease: EASE },
          style: { transformOrigin: '100px 100px' },
        } as const)
      : {};

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="CTRL by Mindmaker"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={tone === 'ctrl' ? '#9DEDCB' : '#EC4899'} />
          <stop offset="100%" stopColor={tone === 'ctrl' ? '#2D8B72' : '#F97316'} />
        </linearGradient>
      </defs>
      <motion.rect x="48" y="100" width="50" height="50" fill={`url(#${gradientId})`} {...motionProps(0)} />
      <motion.rect x="102" y="100" width="50" height="50" fill={`url(#${gradientId})`} {...motionProps(1)} />
      <motion.polygon points="65,96 81,96 89,72 57,72" fill={`url(#${gradientId})`} {...motionProps(2)} />
      <motion.polygon points="114,96 138,96 148,52 104,52" fill={`url(#${gradientId})`} {...motionProps(3)} />
    </svg>
  );
}
