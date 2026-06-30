// src/components/auth/RequireAuth.tsx
import * as React from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "./AuthProvider"
import { BrandSplashVisual } from "@/components/ui/splash-screen"

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    // Auth is resolving. App.tsx already holds the boot at the splash until auth
    // settles, so this rarely fires - but when it does (e.g. a slow token refresh)
    // it shows the SAME rotating-ring splash as the boot, so there is never a flip
    // to a second branded full-screen. CTRL-SYSTEM-SPEC s6.
    return <BrandSplashVisual />
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}
