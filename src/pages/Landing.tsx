import { Navigate } from "react-router-dom"
import { ClarityHome } from "@/components/landing/ClarityHome"
import { useAuth } from "@/components/auth/AuthProvider"
import { BrandedAppLoader } from "@/components/system/BrandedAppLoader"

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth()

  // Capture a portfolio warm-handoff token before any auth redirect drops the
  // query string. Stashed so it survives signup -> /auth/callback -> /dashboard,
  // where HandoffWelcome resolves it. Idempotent; safe in render.
  if (typeof window !== "undefined") {
    try {
      const h = new URLSearchParams(window.location.search).get("h")
      if (h) sessionStorage.setItem("handoff_token", h)
    } catch {
      /* private mode / blocked storage */
    }
  }

  // While the Supabase session is being restored we don't yet know whether this
  // is a public visitor or a returning leader - show the branded loader, never
  // the marketing hero.
  if (isLoading) {
    return <BrandedAppLoader fullscreen caption="Bringing your workspace up" />
  }

  // Redirect authenticated users SYNCHRONOUSLY during render. The old
  // effect-based navigate let <ClarityHome /> paint for one frame first, which
  // is the marketing-hero ghost-flash users saw on load.
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <ClarityHome />
}
