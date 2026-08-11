import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, X } from 'lucide-react'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useSettingsSheet } from '@/contexts/SettingsSheetContext'
import { useDevice } from '@/hooks/useDevice'
import { SettingsList, SETTINGS_SECTION_LABELS } from './SettingsList'
import { SettingsSectionView } from './SettingsSectionView'

function SettingsPanel({ title }: { title: ReactNode }) {
  const { section, closeSheet, setSection } = useSettingsSheet()

  return (
    <>
      <div className="flex min-h-[58px] flex-shrink-0 items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {section && (
            <button
              type="button"
              onClick={() => setSection(null)}
              className="-ml-1 grid h-11 w-11 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Back to settings"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {title}
        </div>
        <button
          type="button"
          onClick={closeSheet}
          className="grid h-11 w-11 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-accent/30 hover:text-foreground"
          aria-label="Close settings"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hide">
        <AnimatePresence mode="wait" initial={false}>
          {section ? (
            <motion.div
              key={`section-${section}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
              className="px-4 py-4"
            >
              <SettingsSectionView section={section} />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
            >
              <SettingsList onSelect={setSection} />
              <div className="h-[env(safe-area-inset-bottom,0px)]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

export function SettingsSheet() {
  const { open, section, closeSheet } = useSettingsSheet()
  const { isMobile } = useDevice()
  const label = section ? SETTINGS_SECTION_LABELS[section] : 'Settings'

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(next) => (next ? null : closeSheet())}>
        <DrawerContent className="h-[calc(100svh-12px)] max-h-[calc(100svh-12px)] rounded-t-[22px] p-0">
          <DrawerDescription className="sr-only">Manage your CTRL account, briefing, memory, privacy and delivery preferences.</DrawerDescription>
          <SettingsPanel
            title={<DrawerTitle className="font-ctrl-display truncate text-base font-semibold">{label}</DrawerTitle>}
          />
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? null : closeSheet())}>
      <SheetContent
        side="right"
        className="flex h-full w-[462px] max-w-[min(462px,100vw)] flex-col gap-0 border-l border-border bg-background p-0 sm:max-w-[462px] [&>button]:hidden"
      >
        <SheetDescription className="sr-only">Manage your CTRL account, briefing, memory, privacy and delivery preferences.</SheetDescription>
        <SettingsPanel
          title={<SheetTitle className="font-ctrl-display truncate text-base font-semibold">{label}</SheetTitle>}
        />
      </SheetContent>
    </Sheet>
  )
}
