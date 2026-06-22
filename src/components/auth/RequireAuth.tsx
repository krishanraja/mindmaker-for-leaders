// src/components/auth/RequireAuth.tsx
import * as React from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "./AuthProvider"
import { BrandedAppLoader } from "@/components/system/BrandedAppLoader"

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    // Auth is resolving. Show the branded, anticipatory app-shell loader rather
    // than raw "Loading..." text (CTRL-SYSTEM-SPEC s6).
    return <BrandedAppLoader fullscreen caption="Getting you signed in" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}
