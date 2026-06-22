// src/components/ui/InitializationLoader.tsx
//
// The very first thing the SPA renders while it boots (AppState 'LOADING',
// before splash/router). This is the in-app handoff from the static
// index.html boot splash, so it must stay branded and anticipatory, never a
// raw spinner on black (CTRL-SYSTEM-SPEC s6).
import { BrandedAppLoader } from '@/components/system/BrandedAppLoader'

export function InitializationLoader() {
  return <BrandedAppLoader fullscreen caption="Bringing your workspace up" />
}
