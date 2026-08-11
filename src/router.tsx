/* eslint-disable react-refresh/only-export-components -- router config file legitimately exports the router object and small loading helpers, not fast-refresh components */
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { AuthedLayoutRoute } from '@/components/layout/AuthedLayoutRoute'
import { BrandSplashVisual } from '@/components/ui/splash-screen'
import { FF } from '@/lib/flags'

const CHUNK_RELOAD_KEY = 'chunk_reload'

function readChunkReload(): number {
  try {
    return Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || '0') || 0
  } catch {
    return 0
  }
}
function writeChunkReload(n: number) {
  try {
    if (n <= 0) sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    else sessionStorage.setItem(CHUNK_RELOAD_KEY, String(n))
  } catch {
    /* sessionStorage unavailable (private mode / blocked) - degrade quietly */
  }
}

/**
 * A recoverable fallback for when a route chunk genuinely cannot be fetched
 * (a missing chunk after a deploy, or a network that keeps dropping). We have
 * already tried an automatic reload once; rather than leave a blank screen,
 * give the user an explicit, branded way to recover. Dark/token styling so it
 * reads on the forced-dark shell even if app CSS is the very thing that failed.
 */
function ChunkLoadError() {
  return (
    <div
      className="emergency-fallback"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#0a0e12',
        color: '#e6edf3',
        fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif",
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '20rem' }}>
        <p style={{ fontSize: '15px', lineHeight: 1.5, marginBottom: '20px', color: '#aeb6c2' }}>
          We could not finish loading. This usually clears with a fresh start.
        </p>
        <button
          onClick={() => {
            writeChunkReload(0)
            window.location.reload()
          }}
          style={{
            background: '#00D9B6',
            color: '#06231f',
            padding: '12px 22px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: 700,
          }}
        >
          Reload
        </button>
      </div>
    </div>
  )
}

/**
 * Wrap lazy imports so that stale-chunk 404s trigger a single page
 * reload instead of crashing the app. After a new deploy, the old
 * HTML may reference chunk filenames that no longer exist.
 *
 * A successful load CLEARS the one-shot guard, so a later, unrelated
 * transient failure (e.g. a flaky mobile network mid-session) can still
 * earn its own recovery reload. If a chunk is still unreachable after the
 * one auto-reload, we surface a recoverable UI - never a blank `() => null`,
 * which previously left users staring at a black screen.
 */
function lazyWithRetry(importFn: () => Promise<{ default: React.ComponentType }>) {
  return lazy(() =>
    importFn()
      .then((mod) => {
        writeChunkReload(0)
        return mod
      })
      .catch(() => {
        if (readChunkReload() < 1) {
          writeChunkReload(1)
          window.location.reload()
          // Keep Suspense on the branded loader while the reload navigates
          // away (never resolves) - so the user sees "loading", not black.
          return new Promise<{ default: React.ComponentType }>(() => {})
        }
        // Already auto-reloaded once and still failing: offer a manual,
        // visible recovery instead of rendering nothing.
        return { default: ChunkLoadError } as { default: React.ComponentType }
      }),
  )
}

const Landing = lazyWithRetry(() => import('@/pages/Landing'))
const Auth = lazyWithRetry(() => import('@/pages/Auth'))
const AuthCallback = lazyWithRetry(() => import('@/pages/AuthCallback'))
const Dashboard = lazyWithRetry(() => import('@/pages/Dashboard'))
const MemoryCenter = lazyWithRetry(() => import('@/pages/MemoryCenter'))
const ContextExport = lazyWithRetry(() => import('@/pages/ContextExportSimple'))
const Settings = lazyWithRetry(() => import('@/pages/Settings'))
const Compliance = lazyWithRetry(() => import('@/pages/Compliance'))
const Profile = lazyWithRetry(() => import('@/pages/Profile'))
const BriefingPage = lazyWithRetry(() => import('@/pages/BriefingPage'))
const DecisionPage = lazyWithRetry(() => import('@/pages/DecisionPage'))
const BlindSpot = lazyWithRetry(() => import('@/pages/BlindSpot'))
const Goals = lazyWithRetry(() => import('@/pages/Goals'))
const TrackRecord = lazyWithRetry(() => import('@/pages/TrackRecord'))
const DecisionMap = lazyWithRetry(() => import('@/pages/DecisionMap'))
const Preview = lazyWithRetry(() => import('@/pages/Preview'))
const Agents = lazyWithRetry(() => import('@/pages/Agents'))
const Try = lazyWithRetry(() => import('@/pages/Try'))
const CaptureLanding = lazyWithRetry(() => import('@/pages/CaptureLanding'))
const Pricing = lazyWithRetry(() => import('@/pages/Pricing'))
const EnrichPage = lazyWithRetry(() => import('@/pages/EnrichPage'))
// The check (harness chain stage 2). URL-reachable only for now: which door it
// sits behind is a later call, so it is deliberately absent from primary nav
// and from the authed prefetch list.
const SortPage = lazyWithRetry(() => import('@/pages/SortPage'))
// The review (harness chain stages 5 to 7), and the only writer the observation
// ledger has. URL-reachable only for now, same call as the check above: which
// door it sits behind is a later decision, and it stays out of primary nav and
// out of the authed prefetch list until that decision is made.
const ReviewPage = lazyWithRetry(() => import('@/pages/ReviewPage'))
// The learning loop's decision surface (harness chain stage 9), where the
// weekly pass's proposals get a yes or a no. URL-reachable only, same call as
// the two above: it has nothing on it until somebody has been checking work for
// a few weeks, so it stays out of primary nav and out of the authed prefetch
// list until that decision is made.
const ProposalsPage = lazyWithRetry(() => import('@/pages/ProposalsPage'))
const NotFound = lazyWithRetry(() => import('@/pages/NotFound'))

/**
 * Warm the route chunk the app is booting into while the splash is still showing, so the first
 * paint after the splash is real content - not a flash of the Suspense fallback (the second
 * "loader" the boot used to show right after the splash). Vite dedupes this against the route's
 * lazy import, so the route resolves from cache. Coarse by area so a public-landing visit never
 * downloads the authed bundle. Best-effort and fire-and-forget; failure is harmless (the lazy
 * import + its retry still run normally).
 */
function preloadInitialRouteChunk() {
  if (typeof window === 'undefined') return
  const warm = (fn: () => Promise<unknown>) => { try { void fn() } catch { /* noop */ } }
  const p = window.location.pathname
  if (p === '/' || p.startsWith('/build')) {
    warm(() => import('@/pages/Landing'))
  } else if (p.startsWith('/auth')) {
    warm(() => import('@/pages/Auth'))
  } else {
    // The authed area: the home/dashboard is the overwhelmingly common entry point.
    warm(() => import('@/pages/Dashboard'))
  }
}
preloadInitialRouteChunk()

/**
 * Warm ALL authed-area route chunks once the app is up, so switching tabs never
 * hits the full-screen Suspense fallback (`LoadingPage`) - that flash, stacked
 * in front of each page's own data skeleton, was the "two loaders per tab" the
 * user reported. With the chunk already in cache, `<Suspense>` resolves
 * synchronously and the ONLY loader per tab is the page's own branded one.
 *
 * Fire-and-forget on idle so it never competes with the first paint; Vite
 * dedupes each import against the route's lazy import, so no double download.
 */
let authedRoutesPrefetched = false
export function prefetchAuthedRoutes() {
  if (typeof window === 'undefined' || authedRoutesPrefetched) return
  authedRoutesPrefetched = true
  const warm = () => {
    const imports: Array<() => Promise<unknown>> = [
      () => import('@/pages/Dashboard'),
      () => import('@/pages/DecisionPage'),
      () => import('@/pages/BlindSpot'),
      () => import('@/pages/MemoryCenter'),
      () => import('@/pages/BriefingPage'),
    ]
    for (const fn of imports) { try { void fn() } catch { /* best-effort */ } }
  }
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback
  if (typeof ric === 'function') ric(warm)
  else setTimeout(warm, 1200)
}

// The lazy-route Suspense fallback. This is the SAME rotating-ring + Mindmaker-icon splash the
// SPA-boot shows (BrandSplashVisual), so the very first route resolving right after the boot
// splash reads as ONE continuous splash - never a flip to a second, differently-branded
// "Bringing your workspace up" loader for the ~tens of ms a chunk takes to resolve. Every
// full-screen app loader is now this one visual. CTRL-SYSTEM-SPEC s6.
function LoadingPage() {
  return <BrandSplashVisual />
}

function LazyWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingPage />}>{children}</Suspense>
}

/**
 * Gate for the /download public capture page. Checked at render time (not at
 * router-construction time) so a ?ff_capture=1 override on THIS navigation is
 * honored even when the route is reached via client-side routing rather than
 * a fresh page load. Flag off degrades to the app's standard not-found page,
 * same as any other unrecognized path.
 */
function CaptureLandingGate() {
  return FF.publicCapture() ? <CaptureLanding /> : <NotFound />
}

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/',
    element: <LazyWrapper><Landing /></LazyWrapper>,
  },
  {
    path: '/auth',
    element: <LazyWrapper><Auth /></LazyWrapper>,
  },
  {
    path: '/auth/callback',
    element: <LazyWrapper><AuthCallback /></LazyWrapper>,
  },
  {
    path: '/build',
    element: <Navigate to="/" replace />,
  },
  {
    // Dev/QC fixture-render harness (public so it can be screenshot without auth). Unlinked.
    path: '/preview',
    element: <LazyWrapper><Preview /></LazyWrapper>,
  },
  {
    // Agent-native marketing page (public): the read-only Memory Web MCP offering.
    path: '/agents',
    element: <LazyWrapper><Agents /></LazyWrapper>,
  },
  {
    // Pre-login magic moment (public): a canned but real-shaped pressure-test demo.
    path: '/try',
    element: <LazyWrapper><Try /></LazyWrapper>,
  },
  {
    // Public email-capture landing page (behind FF.publicCapture).
    path: '/download',
    element: <LazyWrapper><CaptureLandingGate /></LazyWrapper>,
  },
  {
    // Interactive in-app upgrade surface (the static /pricing.html is the public
    // SEO page via the vercel.json rewrite; /upgrade is the one with a live
    // checkout button). A willing buyer never has to hunt.
    path: '/upgrade',
    element: <LazyWrapper><Pricing /></LazyWrapper>,
  },

  // Authenticated routes (share a persistent chrome: GlobalFAB + SettingsSheet)
  {
    element: <AuthedLayoutRoute />,
    children: [
      {
        path: '/dashboard',
        element: <LazyWrapper><RequireAuth><Dashboard /></RequireAuth></LazyWrapper>,
      },
      {
        path: '/think',
        element: <Navigate to="/dashboard?view=edge" replace />,
      },
      {
        path: '/memory',
        element: <LazyWrapper><RequireAuth><MemoryCenter /></RequireAuth></LazyWrapper>,
      },
      {
        path: '/context',
        element: <LazyWrapper><RequireAuth><ContextExport /></RequireAuth></LazyWrapper>,
      },
      {
        path: '/briefing',
        element: <LazyWrapper><RequireAuth><BriefingPage /></RequireAuth></LazyWrapper>,
      },
      {
        path: '/decision',
        element: <LazyWrapper><RequireAuth><DecisionPage /></RequireAuth></LazyWrapper>,
      },
      {
        path: '/blind-spot',
        element: <LazyWrapper><RequireAuth><BlindSpot /></RequireAuth></LazyWrapper>,
      },
      {
        path: '/goals',
        element: <LazyWrapper><RequireAuth><Goals /></RequireAuth></LazyWrapper>,
      },
      {
        path: '/track-record',
        element: <LazyWrapper><RequireAuth><TrackRecord /></RequireAuth></LazyWrapper>,
      },
      {
        path: '/decision-map',
        element: <LazyWrapper><RequireAuth><DecisionMap /></RequireAuth></LazyWrapper>,
      },
      {
        path: '/enrich',
        element: <LazyWrapper><RequireAuth><EnrichPage /></RequireAuth></LazyWrapper>,
      },
      {
        path: '/sort',
        element: <LazyWrapper><RequireAuth><SortPage /></RequireAuth></LazyWrapper>,
      },
      {
        path: '/review',
        element: <LazyWrapper><RequireAuth><ReviewPage /></RequireAuth></LazyWrapper>,
      },
      {
        path: '/proposals',
        element: <LazyWrapper><RequireAuth><ProposalsPage /></RequireAuth></LazyWrapper>,
      },
      {
        path: '/settings',
        element: <LazyWrapper><RequireAuth><Settings /></RequireAuth></LazyWrapper>,
      },
      {
        path: '/compliance',
        element: <LazyWrapper><RequireAuth><Compliance /></RequireAuth></LazyWrapper>,
      },
      {
        path: '/profile',
        element: <LazyWrapper><RequireAuth><Profile /></RequireAuth></LazyWrapper>,
      },
    ],
  },

  // Legacy redirects
  {
    path: '/today',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/pulse',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/voice',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/diagnostic',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '*',
    element: <LazyWrapper><NotFound /></LazyWrapper>,
  },
])
