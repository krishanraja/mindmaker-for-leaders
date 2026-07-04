// NewsPreferencesSheet - the Home "Tune feed" drawer. It is now just the Drawer
// shell around NewsPreferencesPanel (the shared picker body), so the exact same
// tuning experience renders here and inside Settings -> Interests. One door.
//
// Every pick applies LIVE (auto-saved through the shared useNewsPreferences store
// + briefing_interests), so the footer button only dismisses. It is pinned and
// SOLID (SheetFooterBar) so feed content never shows through it.

import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { SheetFooterBar } from '@/components/system/surface';
import { NewsPreferencesPanel } from './NewsPreferencesPanel';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewsPreferencesSheet({ open, onOpenChange }: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[88vh] border-border bg-[linear-gradient(180deg,#0d1219,#0a0e12)]">
        <DrawerTitle className="sr-only">Tune your feed</DrawerTitle>
        <div className="mx-auto flex w-full max-w-md flex-col overflow-y-auto px-5 pb-1 pt-2">
          <NewsPreferencesPanel />
          <SheetFooterBar>
            <Button onClick={() => onOpenChange(false)} className="w-full" size="lg">
              Done
            </Button>
          </SheetFooterBar>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
