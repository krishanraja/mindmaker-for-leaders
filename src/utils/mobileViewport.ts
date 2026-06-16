// src/utils/mobileViewport.ts
export function initMobileViewport(): () => void {
  const setVH = () => {
    const vh = window.innerHeight * 0.01
    const root = document.documentElement
    root.style.setProperty('--vh', `${vh}px`)
    root.style.setProperty('--mobile-vh', `${window.innerHeight}px`)
  }

  setVH()
  window.addEventListener('resize', setVH)
  window.addEventListener('orientationchange', () => {
    setTimeout(setVH, 100) // Delay for orientation change
  })

  // Prevent overscroll bounce on iOS
  document.body.style.overscrollBehavior = 'none'
  document.documentElement.style.overscrollBehavior = 'none'

  // Prevent pull-to-refresh and rubber banding, but ONLY on authed app
  // surfaces. Those surfaces add `app-locked` to <body> while mounted; public
  // marketing pages do not, so touch scroll works normally there.
  document.addEventListener('touchmove', (e) => {
    // Public pages (no app-locked): do nothing, let the browser scroll.
    if (!document.body.classList.contains('app-locked')) {
      return
    }
    // Allow scrolling inside elements with overflow-y-auto or overscroll-contain
    const target = e.target as HTMLElement
    const scrollable = target.closest('.overflow-y-auto, .overscroll-contain, [data-allow-scroll]')
    if (!scrollable) {
      e.preventDefault()
    }
  }, { passive: false })

  return () => {
    window.removeEventListener('resize', setVH)
    window.removeEventListener('orientationchange', setVH)
  }
}

// CSS usage: height: calc(var(--vh, 1vh) * 100);
// Tailwind class: h-[calc(var(--vh,1vh)*100)]
// Or use: height: var(--mobile-vh, 100vh)
