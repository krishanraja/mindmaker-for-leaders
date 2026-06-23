import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Mic, Square, Loader2, Check } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { haptics } from '@/lib/haptics'
import { useIsMobile } from '@/hooks/use-mobile'
import { useVoice } from '@/hooks/useVoice'
import { supabase } from '@/integrations/supabase/client'

/**
 * GlobalFAB - the app-wide voice brain-dump.
 *
 * Previously this was a mic-SHAPED button that only opened a navigation menu
 * (Talk to ctrl / Brief me / Settings / Profile) - all of which are already
 * reachable from the header gear + bottom nav, and the floating button overlapped
 * real content. It was "a mic that doesn't listen".
 *
 * Now it is a real, single-purpose affordance: tap to talk, and CTRL parses your
 * raw thinking into memory facts (the extract-user-context pipeline, the same one
 * the Brain tab uses). Voice in CTRL means one thing - a brain-dump that enriches
 * what CTRL knows about you.
 *
 * It is deliberate, not ever-present:
 *   - mobile only (desktop has the command palette + larger inputs).
 *   - hidden on every surface that already invites long-format voice in context
 *     (Decisions capture, Brain add-memory, Automator, Briefing steer, onboarding,
 *     enrich), so it never duplicates or overlaps a contextual mic. It shows on the
 *     reflective surfaces that lack one (Home, You), as the general "tell me
 *     anything and I'll remember it" entry.
 */

// Route prefixes that own a contextual voice affordance (or are utility surfaces
// where a brain-dump makes no sense). startsWith, so '/decision' also covers
// '/decision-map'.
const HIDE_ON = [
  '/dashboard', // Home: the three doors own the bottom band; a floating FAB here
  //              sat directly on top of the "Build a skill" door (content overlap).
  '/decision', // Decisions capture has its own "talk it out" mic
  '/memory', // Brain has Add-memory voice
  '/context', // Automator has "talk through the workflow"
  '/briefing', // Briefing has voice-steer
  '/enrich', // Enrich is itself a long-format context capture
  '/onboarding',
  '/settings',
  '/profile',
  '/compliance',
]

export function GlobalFAB() {
  const isMobile = useIsMobile()
  const location = useLocation()
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  const { isRecording, isProcessing, duration, startRecording, stopRecording } = useVoice({
    maxDuration: 120,
    onTranscript: async (text) => {
      const trimmed = text.trim()
      if (!trimmed) return
      setSaving(true)
      try {
        // Same brain-dump -> structured facts pipeline the Brain tab uses.
        const { data, error } = await supabase.functions.invoke('extract-user-context', {
          body: { transcript: trimmed, source_type: 'voice' },
        })
        if (error) throw error
        const d = (data ?? {}) as { stored_count?: number; pending_verifications?: unknown[] }
        const n = d.stored_count ?? d.pending_verifications?.length ?? 0
        haptics.success()
        setJustSaved(true)
        window.setTimeout(() => setJustSaved(false), 1800)
        toast.success(
          n > 0
            ? `Got it. Added ${n} thing${n === 1 ? '' : 's'} to your brain.`
            : "Got it. I couldn't pull a clear fact from that - try naming specifics.",
        )
      } catch {
        toast.error("Couldn't save that. Try again.")
      } finally {
        setSaving(false)
      }
    },
  })

  const hidden = !isMobile || HIDE_ON.some((p) => location.pathname.startsWith(p))
  if (hidden) return null

  const busy = isProcessing || saving

  const onTap = async () => {
    haptics.light()
    if (isRecording) {
      stopRecording()
      return
    }
    if (busy) return
    try {
      await startRecording()
    } catch {
      toast.error('I could not reach the microphone. Check the permission and try again.')
    }
  }

  return (
    <>
      {/* the recording status pill, above the button */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            style={{ bottom: 'calc(148px + env(safe-area-inset-bottom))' }}
            className="fixed right-4 z-40 flex items-center gap-2 rounded-full border border-accent/30 bg-background/95 px-3.5 py-2 shadow-lg backdrop-blur"
          >
            <span className="flex h-2 w-2 items-center justify-center">
              <span className="absolute h-2 w-2 animate-ping rounded-full bg-accent/60" />
              <span className="h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="text-[12.5px] font-semibold text-foreground">
              Listening... tap to finish
            </span>
            <span className="text-[11px] tabular-nums text-muted-foreground">{duration}s</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => void onTap()}
        aria-label={isRecording ? 'Finish brain-dump' : 'Brain-dump by voice'}
        aria-pressed={isRecording}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.15 }}
        whileTap={{ scale: 0.94 }}
        style={{ bottom: 'calc(80px + env(safe-area-inset-bottom))' }}
        className={cn(
          'fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors',
          isRecording
            ? 'bg-rose-500 text-white shadow-rose-500/30'
            : 'bg-accent text-accent-foreground shadow-accent/25',
          !isRecording && !busy && 'fab-pulse',
        )}
      >
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : justSaved ? (
          <Check className="h-6 w-6" strokeWidth={3} />
        ) : isRecording ? (
          <Square className="h-5 w-5" fill="currentColor" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </motion.button>
    </>
  )
}
