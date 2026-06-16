import * as React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { SignInForm } from "@/components/auth/SignInForm"
import { SignUpForm } from "@/components/auth/SignUpForm"
import { useAuth } from "@/components/auth/AuthProvider"
import { CtrlLogo } from "@/components/landing/CtrlLogo"
import { motion } from "framer-motion"

export default function Auth() {
  const [isSignIn, setIsSignIn] = useState(true)
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
    <div className="h-screen-safe overflow-hidden flex flex-col bg-background">
      <header className="flex items-center px-4 sm:px-6 py-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto scrollbar-hide flex items-center justify-center px-4 sm:px-6 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="flex justify-center mb-6">
            <CtrlLogo className="h-7 w-auto" />
          </div>

          <h2 className="text-xl font-semibold text-center text-foreground mb-1">
            {isSignIn ? "Welcome back" : "Start thinking clearly"}
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {isSignIn
              ? "Sign in to your mind"
              : "Voice your first thought in 2 minutes"}
          </p>

          <div className="flex gap-1 p-1 bg-secondary rounded-lg mb-6">
            <button
              onClick={() => setIsSignIn(true)}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${
                isSignIn
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignIn(false)}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${
                !isSignIn
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          {isSignIn ? <SignInForm /> : <SignUpForm />}
        </motion.div>
      </main>
    </div>
  )
}
