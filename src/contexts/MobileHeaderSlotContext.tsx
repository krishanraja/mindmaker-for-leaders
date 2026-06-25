import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * MobileHeaderSlotContext: lets a page teleport a small control into the
 * persistent mobile AppHeader (between the brand lockup and the right-hand
 * actions) instead of spending a row of vertical content space on it.
 *
 * Why: on phones the no-scroll surfaces are tight on height. A page-level
 * switcher (for example the Decisions "Now | History" toggle) reads as chrome,
 * not content, so it belongs in the header bar. MobileFrame owns the slot state
 * and renders whatever a page pushes; the page pushes via `useMobileHeaderSlot`.
 *
 * Off the mobile frame (for example the desktop DesktopShell) there is no
 * provider, so the hook is a safe no-op and pages fall back to rendering the
 * control inline.
 */
interface MobileHeaderSlotValue {
  slot: React.ReactNode;
  setSlot: (node: React.ReactNode) => void;
}

const MobileHeaderSlotContext = createContext<MobileHeaderSlotValue | null>(null);

export function MobileHeaderSlotProvider({ children }: { children: React.ReactNode }) {
  const [slot, setSlot] = useState<React.ReactNode>(null);
  return (
    <MobileHeaderSlotContext.Provider value={{ slot, setSlot }}>
      {children}
    </MobileHeaderSlotContext.Provider>
  );
}

/** Read the current header slot (MobileFrame -> AppHeader). */
export function useMobileHeaderSlotValue(): React.ReactNode {
  return useContext(MobileHeaderSlotContext)?.slot ?? null;
}

/**
 * Push `node` into the mobile header for the lifetime of the calling component
 * (cleared on unmount). Re-runs whenever `node` changes; pass a fresh node when
 * the control's state changes so the header reflects it. A no-op when there is
 * no provider (desktop / non-MobileFrame surfaces).
 */
export function useMobileHeaderSlot(node: React.ReactNode): void {
  const ctx = useContext(MobileHeaderSlotContext);
  const setSlot = ctx?.setSlot;
  useEffect(() => {
    if (!setSlot) return;
    setSlot(node);
    return () => setSlot(null);
  }, [setSlot, node]);
}
