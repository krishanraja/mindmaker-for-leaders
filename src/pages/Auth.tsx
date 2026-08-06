import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { SignInForm } from "@/components/auth/SignInForm"
import { SignUpForm } from "@/components/auth/SignUpForm"
import { useAuth } from "@/components/auth/AuthProvider"
import { HeroBackdrop } from "@/components/public/HeroBackdrop"
import { PublicHeader } from "@/components/public/PublicHeader"
import { AUTH_COPY } from "@/components/public/publicCopy"

/**
 * The last front door. Sign up leads, because every public CTA that lands here
 * is an invitation to start; a returning leader takes one tap to switch.
 *
 * A visitor who weighed something on /try arrives with an anonymous session,
 * which AuthProvider.signUp converts in place, so their weigh is waiting for
 * them on the other side rather than orphaned behind a second account.
 */
export default function Auth() {
  const [isSignIn, setIsSignIn] = useState(false)
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="h-screen-safe bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PublicHeader variant="back" />

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-10 sm:py-16">
        <HeroBackdrop weight="quiet" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative z-10 w-full max-w-[400px] rounded-2xl border border-border bg-card p-6 sm:p-7"
        >
          {/* No mark in here: the header two inches above already carries it,
              and one lockup twice on one screen reads as a mistake. */}
          <div className="flex gap-1 rounded-xl border border-border bg-popover p-1">
            <button
              onClick={() => setIsSignIn(true)}
              className={`flex-1 rounded-lg px-4 py-2 font-display text-[12.5px] font-bold transition-all ${
                isSignIn ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => setIsSignIn(false)}
              className={`flex-1 rounded-lg px-4 py-2 font-display text-[12.5px] font-bold transition-all ${
                !isSignIn ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign up
            </button>
          </div>

          <h1 className="mt-5 text-center font-display text-xl font-bold tracking-tight text-foreground">
            {isSignIn ? 'Welcome back.' : AUTH_COPY.h1}
          </h1>
          <p className="mt-1.5 mb-5 text-center text-sm text-muted-foreground">
            {isSignIn ? 'Everything is where you left it.' : AUTH_COPY.sub}
          </p>

          {isSignIn ? <SignInForm /> : <SignUpForm />}

          <p className="mt-5 text-center text-[11.5px] text-muted-foreground">{AUTH_COPY.foot}</p>
        </motion.div>
      </main>
    </div>
  )
}
