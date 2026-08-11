import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import { ContestPanel } from '@/components/contest/ContestPanel'
import { useContest } from '@/hooks/useContest'
import type { ContestKind, ContestResult, ContestTarget } from '@/types/contest'

interface ContestDrawerProps {
  open: boolean
  target: ContestTarget
  onOpenChange: (open: boolean) => void
}

export function ContestDrawer({ open, target, onOpenChange }: ContestDrawerProps) {
  const { submitContest, submitting } = useContest()
  const [kind, setKind] = useState<ContestKind | null>(null)
  const [note, setNote] = useState('')
  const [result, setResult] = useState<ContestResult | null>(null)

  useEffect(() => {
    setKind(null)
    setNote('')
    setResult(null)
  }, [target])

  const handleSubmit = useCallback(async () => {
    if (!kind) return
    try {
      setResult(await submitContest(target, kind, note))
    } catch (error) {
      console.error('contest submit failed', error)
      toast.error('Could not send that. Try again.')
    }
  }, [kind, note, submitContest, target])

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-md">
        <DrawerTitle className="sr-only">Contest this</DrawerTitle>
        <ContestPanel
          target={target}
          selectedKind={kind}
          onSelectKind={setKind}
          note={note}
          onNoteChange={setNote}
          onSubmit={handleSubmit}
          submitting={submitting}
          result={result}
          onClose={() => onOpenChange(false)}
        />
      </DrawerContent>
    </Drawer>
  )
}
