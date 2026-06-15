/* eslint-disable react-refresh/only-export-components -- router config file legitimately exports the router object and small loading helpers, not fast-refresh components */
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { AuthedLayoutRoute } from '@/components/layout/AuthedLayoutRoute'

/**
 * Wrap lazy imports so that stale-chunk 404s trigger a single page
 * reload instead of crashing the app. After a new deploy, the old
 * HTML may reference chunk filenames that no longer exist.
 */
function lazyWithRetry(importFn: () => Promise<{ default: React.ComponentType }>) {
  return lazy(() =>
    importFn().catch(() => {
      const key = 'chunk_reload'
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        window.location.reload()
      }
      // Return a no-op module so TypeScript is happy; the reload above
      // means this line is effectively unreachable.
      return { default: () => null } as { default: React.ComponentType }
    }),
  )
}

const Landing = lazyWithRetry(() => import('@/pages/Landing'))
const Auth = lazyWithRetry(() => import('@/pages/Auth'))
const AuthCallback = lazyWithRetry(() => import('@/pages/AuthCallback'))
const Dashboard = lazyWithRetry(() => import('@/pages/Dashboard'))
const MemoryCenter = lazyWithRetry(() => import('@/pages/MemoryCenter'))
const ContextExport = lazyWithRetry(() => import('@/pages/ContextExport'))
const Settings = lazyWithRetry(() => import('@/pages/Settings'))
const Compliance = lazyWithRetry(() => import('@/pages/Compliance'))
const Profile = lazyWithRetry(() => import('@/pages/Profile'))
const Booking = lazyWithRetry(() => import('@/pages/Booking'))
const BuildLap = lazyWithRetry(() => import('@/pages/BuildLap'))
const KitRedeem = lazyWithRetry(() => import('@/pages/kit/KitRedeem'))
const KitHome = lazyWithRetry(() => import('@/pages/kit/KitHome'))
const KitIntake = lazyWithRetry(() => import('@/pages/kit/KitIntake'))
const KitReading = lazyWithRetry(() => import('@/pages/kit/KitReading'))
const BriefingPage = lazyWithRetry(() => import('@/pages/BriefingPage'))
const DecisionPage = lazyWithRetry(() => import('@/pages/DecisionPage'))
const Goals = lazyWithRetry(() => import('@/pages/Goals'))
const TrackRecord = lazyWithRetry(() => import('@/pages/TrackRecord'))
const DecisionMap = lazyWithRetry(() => import('@/pages/DecisionMap'))
const EnrichPage = lazyWithRetry(() => import('@/pages/EnrichPage'))
const NotFound = lazyWithRetry(() => import('@/pages/NotFound'))

function LoadingPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00D9B6]" />
      <p className="text-sm text-white/40">Loading...</p>
    </div>
  )
}

function LazyWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingPage />}>{children}</Suspense>
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
    path: '/booking',
    element: <LazyWrapper><Booking /></LazyWrapper>,
  },
  {
    path: '/build',
    element: <LazyWrapper><BuildLap /></LazyWrapper>,
  },
  {
    path: '/kit',
    element: <LazyWrapper><KitRedeem /></LazyWrapper>,
  },
  {
    path: '/kit/me',
    element: <LazyWrapper><KitHome /></LazyWrapper>,
  },
  {
    path: '/kit/me/intake',
    element: <LazyWrapper><KitIntake /></LazyWrapper>,
  },
  {
    path: '/kit/reading/:pageId',
    element: <LazyWrapper><KitReading /></LazyWrapper>,
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
