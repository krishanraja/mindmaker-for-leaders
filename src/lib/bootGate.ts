// bootGate - a one-shot signal for a cold HOME landing.
//
// The app boot splash (the MindMaker icon + rotating wheel) is held on top of
// the app until Home's first data has settled, so a full app load shows ONLY
// that splash and then content - never the splash followed by Home's globe
// loader as a second full-screen loader. `useCockpit` calls `markHomeReady()`
// the first time its data settles; `App` waits for it (capped) before removing
// the overlay. Only meaningful on the very first load; a no-op thereafter.

let ready = false;
const listeners = new Set<() => void>();

/** True once Home's first data has settled this session (survives route
    unmount/remount - module singleton). Used to show the branded GlobeLoader
    ONLY on the genuine first entry; returns to Home render instantly / quiet. */
export function isHomeReady(): boolean {
  return ready;
}

/** Home's first data has settled (success OR failure). Idempotent. */
export function markHomeReady(): void {
  if (ready) return;
  ready = true;
  const snapshot = [...listeners];
  listeners.clear();
  for (const l of snapshot) {
    try { l(); } catch { /* noop */ }
  }
}

/** Run `cb` once Home is ready (immediately if already ready). Returns an unsubscribe. */
export function onHomeReady(cb: () => void): () => void {
  if (ready) {
    cb();
    return () => {};
  }
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
