import { Navigate } from "react-router-dom"
import { ClarityHome } from "@/components/landing/ClarityHome"
import { useAuth } from "@/components/auth/AuthProvider"
import { BrandedAppLoader } from "@/components/system/BrandedAppLoader"

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth()

  // While the Supabase session is being restored we don't yet know whether this
  // is a public visitor or a returning leader - show the branded loader, never
  // the marketing hero.
  if (isLoading) {
    return <BrandedAppLoader fullscreen caption="Bringing your workspace up" />
  }

  // Redirect authenticated users SYNCHRONOUSLY during render. The old
  // effect-based navigate let <ClarityHome /> paint for one frame first, which
  // is the "CTRL · Clarity for leaders" ghost-flash users saw on load.
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <ClarityHome />
}
