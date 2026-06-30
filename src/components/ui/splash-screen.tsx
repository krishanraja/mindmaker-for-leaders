import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SplashScreenProps {
  onComplete: () => void
  duration?: number
}

/**
 * SplashCore - the rotating gradient ring + pulsing Mindmaker icon, with no positioning or
 * timers of its own. The single boot brand visual, shared by the animated SplashScreen and the
 * static BrandSplashVisual so the whole boot reads as ONE continuous splash, never a flip
 * between two different brand marks.
 */
function SplashCore() {
  return (
    <>
      {/* Subtle dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Centered content */}
      <div className="relative flex flex-col items-center">
        {/* Animated ring container */}
        <div className="relative w-32 h-32 sm:w-40 sm:h-40">
          {/* Rotating gradient ring */}
          <div
            className="absolute inset-0 rounded-full splash-ring"
            style={{
              background: `conic-gradient(from 0deg, transparent 0deg, hsl(158 64% 45%) 60deg, hsl(158 64% 45% / 0.8) 120deg, transparent 180deg)`,
              padding: '3px',
            }}
          >
            <div className="w-full h-full rounded-full bg-[#0a0a0a]" />
          </div>

          {/* Glow effect */}
          <div
            className="absolute inset-0 rounded-full opacity-40 blur-xl"
            style={{
              background: `radial-gradient(circle, hsl(158 64% 45% / 0.5) 0%, transparent 70%)`,
            }}
          />

          {/* Inner circle with icon */}
          <div className="absolute inset-2 rounded-full bg-[#121212] flex items-center justify-center">
            <img
              src="/mindmaker-favicon.png"
              alt="Mindmaker"
              className="w-14 h-14 sm:w-18 sm:h-18 splash-icon-pulse"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * BrandSplashVisual - the static, full-screen boot loader. Use this anywhere the app is warming
 * up before the first screen paints (the SPA-boot LOADING state, the auth gate) so there is ONE
 * branded visual across the whole boot instead of the splash flipping to a second skeleton loader.
 */
export function BrandSplashVisual() {
  return (
    <div
      className="fixed inset-0 z-[100] bg-[#0a0a0a] flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <SplashCore />
    </div>
  )
}

export function SplashScreen({ onComplete, duration = 2500 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const fadeOutTimer = setTimeout(() => {
      setIsVisible(false)
    }, duration - 400)

    const completeTimer = setTimeout(() => {
      onComplete()
    }, duration)

    return () => {
      clearTimeout(fadeOutTimer)
      clearTimeout(completeTimer)
    }
  }, [duration, onComplete])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed inset-0 z-[100] bg-[#0a0a0a] flex items-center justify-center"
        >
          <SplashCore />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
