// src/components/ui/InitializationLoader.tsx
//
// The very first thing the SPA renders while it boots (AppState 'LOADING',
// before splash/router). It shows the SAME rotating ring + Mindmaker icon as the
// static index.html boot splash and the SplashScreen, so the whole boot reads as
// ONE continuous branded splash - never a flip from the splash to a second
// "Bringing your workspace up" skeleton (CTRL-SYSTEM-SPEC s6).
import { BrandSplashVisual } from '@/components/ui/splash-screen'

export function InitializationLoader() {
  return <BrandSplashVisual />
}
