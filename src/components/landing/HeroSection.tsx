import * as React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Brain, Zap, MessageSquare, ArrowRight, Download, Shield } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { SwipeableCards } from "@/components/mobile/SwipeableCards"
import { CtrlLogo } from "./CtrlLogo"
import { DesktopLanding } from "./DesktopLanding"
import { VoiceDemo } from "./VoiceDemo"
import { FF } from "@/lib/flags"

const PILLARS = [
  {
    icon: Brain,
    title: "Memory Web",
    description: "Your thoughts, organized. A living map of what you know, what you want, and how you think, portable to any AI.",
    color: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/20",
  },
  {
    icon: Zap,
    title: "Team Instructions",
    description: "Your thinking, delegated. Turn your context into clear instructions for anyone on your team.",
    color: "from-amber-500 to-orange-600",
    glow: "shadow-amber-500/20",
  },
  {
    icon: MessageSquare,
    title: "Context Export",
    description: "Your context, everywhere. One click to ChatGPT, Claude, Cursor, or any AI tool.",
    color: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-500/20",
  },
]

const JOURNEY_STEPS = [
  "Voice a thought",
  "It organizes itself",
  "Export anywhere",
  "Every decision gets clearer",
]

/* ------------------------------------------------------------------ */
/*  Logo Lockup - MINDMAKER icon + "CTRL" text                         */
/* ------------------------------------------------------------------ */
function HeroLogo({ size = "large" }: { size?: "large" | "small" }) {
  const isLarge = size === "large"
  return (
    <div className={cn("flex flex-col items-center", isLarge ? "gap-4" : "gap-2")}>
      {/* Mindmaker brand logo - nudged right ~4px to optically center over CTRL */}
      <img
        src="/mindmaker-full-logo.png"
        alt="Mindmaker"
        className={cn("w-auto translate-x-1", isLarge ? "h-4" : "h-2.5")}
      />
      {/* CTRL product logo - nudged right for optical balance */}
      <CtrlLogo
        className={cn(
          "w-auto translate-x-1",
          isLarge ? "h-9 sm:h-11" : "h-5"
        )}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Screen 1 - Hero                                                    */
/* ------------------------------------------------------------------ */
function HeroScreen({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-5">
      {/* Logo lockup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="mb-6"
      >
        <HeroLogo size="large" />
      </motion.div>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed text-center mb-5"
      >
        Your portable memory for every AI conversation and decision. No plugins. No permissions. Just you.
      </motion.p>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col items-center gap-2"
      >
        <Button
          onClick={onGetStarted}
          size="lg"
          className="h-12 px-8 text-base font-semibold bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/25"
        >
          Get Started Free
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        <p className="text-xs text-muted-foreground/60">
          2 minutes to clarity
        </p>
        <p className="text-xs text-muted-foreground/60 flex items-center gap-1.5">
          <Shield className="h-3 w-3" />
          No integrations. Your data stays yours.
        </p>
      </motion.div>

      {/* Flagged: landing voice/text demo (mobile) - only mounts when flag is on */}
      {FF.landingVoiceDemo() && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="w-full max-w-xs"
        >
          <VoiceDemo />
        </motion.div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Screen 2 - Three Pillars                                           */
/* ------------------------------------------------------------------ */
function PillarsScreen() {
  return (
    <div className="h-full flex flex-col items-center justify-center px-5">
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-lg font-semibold text-foreground mb-5"
      >
        What you get
      </motion.h2>

      <div className="w-full max-w-sm space-y-3">
        {PILLARS.map((pillar, idx) => (
          <motion.div
            key={pillar.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
            className={cn(
              "rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-4",
              "flex items-start gap-3"
            )}
          >
            <div className={cn(
              "flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center",
              "shadow-lg",
              pillar.color,
              pillar.glow,
            )}>
              <pillar.icon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-0.5">{pillar.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{pillar.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Screen 3 - How It Works + Export                                   */
/* ------------------------------------------------------------------ */
function JourneyScreen({ onGetStarted }: { onGetStarted: () => void }) {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % JOURNEY_STEPS.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-full flex flex-col items-center justify-center px-5">
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-lg font-semibold text-foreground mb-5"
      >
        How it works
      </motion.h2>

      {/* Journey steps */}
      <div className="w-full max-w-sm space-y-2 mb-6">
        {JOURNEY_STEPS.map((step, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.08 }}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-500",
              idx === activeStep
                ? "bg-accent/10 border border-accent/20"
                : "bg-transparent border border-transparent"
            )}
          >
            <span className={cn(
              "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500",
              idx === activeStep
                ? "bg-accent text-accent-foreground"
                : idx < activeStep
                  ? "bg-accent/20 text-accent"
                  : "bg-muted text-muted-foreground"
            )}>
              {idx + 1}
            </span>
            <span className={cn(
              "text-sm transition-colors duration-500",
              idx === activeStep ? "text-foreground font-medium" : "text-muted-foreground"
            )}>
              {step}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Export targets */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center mb-5"
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Download className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="text-xs text-muted-foreground/50 uppercase tracking-wider font-medium">
            Export to
          </span>
        </div>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {["ChatGPT", "Claude", "Gemini", "Cursor", "Any LLM"].map((name) => (
            <span key={name} className="text-xs text-muted-foreground/40 font-medium">
              {name}
            </span>
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          onClick={onGetStarted}
          size="lg"
          className="h-11 px-7 text-sm font-semibold bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/25"
        >
          Get Started Free
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  HeroSection - entry point                                          */
/* ------------------------------------------------------------------ */
export function HeroSection() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const handleGetStarted = () => navigate('/auth')

  // Desktop gets the world-class landing experience. Mobile keeps the
  // swipeable 3-card hero (designed for thumb-first interaction).
  if (!isMobile) {
    return <DesktopLanding />
  }

  return (
    <div className="relative h-screen-safe overflow-hidden flex flex-col bg-black">
      {/* Background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
      >
        <source src="/Mindmaker for Leaders - background video.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      {/* Header - sign in only */}
      <header className="relative z-10 flex items-center justify-end px-5 sm:px-8 py-4 flex-shrink-0">
        <Button
          onClick={() => navigate('/auth')}
          variant="outline"
          size="sm"
          className="text-sm border-white/20 text-white/80 hover:bg-white/10 hover:text-white bg-transparent"
        >
          Sign In
        </Button>
      </header>

      {/* Mobile - swipeable 3-screen experience */}
      <SwipeableCards
        className="relative z-10 flex-1 min-h-0"
        dotClassName="pb-1"
      >
        <HeroScreen onGetStarted={handleGetStarted} />
        <PillarsScreen />
        <JourneyScreen onGetStarted={handleGetStarted} />
      </SwipeableCards>

      {/* Footer - always visible */}
      <footer className="relative z-10 px-5 sm:px-8 py-3 text-center flex-shrink-0">
        <p className="text-xs text-white/40">
          Self-contained. No Slack. No email. No calendar. Just your voice and your context.
        </p>
      </footer>
    </div>
  )
}
