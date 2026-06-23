// src/components/auth/RequireAuth.tsx
import * as React from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "./AuthProvider"
import { BrandedAppLoader } from "@/components/system/BrandedAppLoader"

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    // Auth is resolving. Use the SAME caption as the SPA-boot and lazy-route
    // loaders ("Bringing your workspace up") so the boot reads as ONE continuous
    // branded load, not three near-identical full-screens flipping their text
    // (the "glitchy" multi-loader feel). CTRL-SYSTEM-SPEC s6.
    return <BrandedAppLoader fullscreen caption="Bringing your workspace up" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}
