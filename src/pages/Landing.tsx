import * as React from "react"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ClarityHome } from "@/components/landing/ClarityHome"
import { useAuth } from "@/components/auth/AuthProvider"

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent" />
      </div>
    )
  }

  return <ClarityHome />
}
