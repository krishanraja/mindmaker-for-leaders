// src/components/landing/Logo.tsx
//
// The full lockup logo. Retires the old Mindmaker PNG wordmark
// (/mindmaker-full-logo.png) in favour of the approved "ctrl." emerald
// wordmark. Same export and prop shape so existing imports keep working.
// The PNG asset is left in /public on purpose; it is just no longer
// referenced from here.
import * as React from "react"

export function Logo() {
  return (
    <span
      aria-label="ctrl."
      className="inline-flex items-baseline font-bold tracking-tight text-accent leading-none select-none text-3xl sm:text-4xl"
    >
      ctrl
      <span className="text-accent/60">.</span>
    </span>
  )
}
