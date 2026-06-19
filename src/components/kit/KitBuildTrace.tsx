import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import type { KitArtifactStatusEntry, KitBuildRow } from "@/lib/kit";
import { isTerminalBuildStatus } from "@/lib/kit";
import { KitEyebrow, KitHeadline, KitSub } from "@/components/kit/kitPrimitives";

/**
 * The build trace (spec 2.6): the honest, decomposed-work window that replaces
 * the composing spinner. It is NOT a timed animation; it is driven by the real
 * build state.
 *
 * Spec decision 5 (the honest hybrid):
 * - The instant capture + enrich lines (Capture, Normalize/Enrich) show as a
 *   brief pre-roll, a beat each. They are genuinely instant on the backend, so
 *   we do not pretend they take real time; we just let them resolve one at a
 *   time so the eye can follow.
 * - The genuinely async stages (per-artifact compose, then the verify line) are
 *   driven by the REAL `build.artifact_statuses` transitions. The compose lines
 *   advance with how many artifacts have reached a settled status (done /
 *   failed / skipped); the verify line keeps spinning honestly until the build
 *   itself reaches a terminal status.
 * - If the real build finishes before the pre-roll lines have all shown, we fast
 *   forward to done. We never invent latency to look busy, and a long stage keeps
 *   spinning rather than stalling silently.
 *
 * When every line is done, `onComplete` fires once and the caller hands straight
 * to the reveal.
 */

interface TraceLine {
  /** Stable id for the resolve bookkeeping. */
  id: string;
  /** The human label (calm, plain, second person). */
  label: string;
  /** "preroll" lines resolve on a beat; "compose"/"verify"/"assemble" track real state. */
  kind: "preroll" | "compose" | "verify" | "assemble";
}

// The six human labels from the approved mock (prototypes/kit-vibe-coding.html),
// shared by every kit (the trace is generic; only the build state differs).
const LINES: TraceLine[] = [
  { id: "read", label: "Reading what you told us", kind: "preroll" },
  { id: "enrich", label: "Pulling in what your AI already knows about you", kind: "preroll" },
  { id: "work", label: "Writing how you like to work into it", kind: "compose" },
  { id: "brief", label: "Briefing your build so any tool can follow it", kind: "compose" },
  { id: "verify", label: "Checking every step is followable on any platform", kind: "verify" },
  { id: "assemble", label: "Putting your kit together", kind: "assemble" },
];

// One pre-roll beat. Long enough to read, short enough not to pad.
const PREROLL_BEAT_MS = 560;
// The beat after the last line lands before we hand to the reveal.
const HANDOFF_BEAT_MS = 600;

type LineState = "idle" | "run" | "done";

function settledCount(statuses: Record<string, KitArtifactStatusEntry> | undefined): {
  settled: number;
  total: number;
} {
  if (!statuses) return { settled: 0, total: 0 };
  const entries = Object.values(statuses);
  const settled = entries.filter(
    (e) => e.status === "done" || e.status === "failed" || e.status === "skipped",
  ).length;
  return { settled, total: entries.length };
}

export function KitBuildTrace({
  build,
  onComplete,
}: {
  build: KitBuildRow | null;
  /** Fires exactly once when the whole trace has resolved. */
  onComplete: () => void;
}) {
  // Which line index is the "front" (currently running). Lines before it are
  // done; lines after are idle. The front advances either on a pre-roll beat or
  // on real build progress, whichever is driving that line.
  const [front, setFront] = useState(0);
  const completedRef = useRef(false);
  const buildTerminal = build ? isTerminalBuildStatus(build.status) : false;

  const { settled, total } = useMemo(
    () => settledCount(build?.artifact_statuses),
    [build?.artifact_statuses],
  );

  // The two compose lines map across the real artifact fraction: line "work"
  // resolves once the first half of artifacts settle, "brief" once the rest do.
  // With no per-artifact statuses yet (early poll), they wait honestly.
  const composeFraction = total > 0 ? settled / total : 0;

  // Drive the front forward. Pre-roll lines advance on a timed beat; compose /
  // verify / assemble lines advance only when the real state says so.
  useEffect(() => {
    if (completedRef.current) return;
    const line = LINES[front];
    if (!line) return;

    // If the real build is already terminal, sweep every remaining line to done
    // (the work finished fast; we do not pad).
    if (buildTerminal) {
      if (front < LINES.length) {
        const t = window.setTimeout(() => setFront(LINES.length), HANDOFF_BEAT_MS / 2);
        return () => window.clearTimeout(t);
      }
      return;
    }

    if (line.kind === "preroll") {
      const t = window.setTimeout(() => setFront((f) => f + 1), PREROLL_BEAT_MS);
      return () => window.clearTimeout(t);
    }

    if (line.kind === "compose") {
      // "work" is the first compose line, "brief" the second. Resolve each as
      // real artifacts settle: half done unlocks the first, all-but-assembly the
      // second. Non-terminal builds with no statuses keep this line spinning.
      const isFirstCompose = LINES.slice(0, front).every((l) => l.kind !== "compose");
      const threshold = isFirstCompose ? 0.5 : 0.99;
      if (composeFraction >= threshold && total > 0) {
        const t = window.setTimeout(() => setFront((f) => f + 1), 120);
        return () => window.clearTimeout(t);
      }
      return;
    }

    if (line.kind === "verify") {
      // Verify is the quality promise made visible. It stays spinning until the
      // build itself goes terminal (the verify layer is the last real backend
      // gate before the artifacts land). buildTerminal is handled above.
      return;
    }

    // "assemble": the final line. Only resolves when the build is terminal,
    // handled by the buildTerminal branch above.
  }, [front, buildTerminal, composeFraction, total]);

  // Fire onComplete once when the front has passed the last line.
  useEffect(() => {
    if (completedRef.current) return;
    if (front >= LINES.length) {
      completedRef.current = true;
      const t = window.setTimeout(onComplete, HANDOFF_BEAT_MS);
      return () => window.clearTimeout(t);
    }
  }, [front, onComplete]);

  const lineState = (index: number): LineState => {
    if (index < front) return "done";
    if (index === front) return "run";
    return "idle";
  };

  return (
    <div className="flex h-full flex-col">
      <KitEyebrow>Building, just for you</KitEyebrow>
      <KitHeadline>Putting your kit together.</KitHeadline>
      <KitSub>A few seconds. Here is what is happening.</KitSub>

      <div className="mt-5 flex flex-col gap-0.5" data-testid="kit-build-trace">
        {LINES.map((line, index) => {
          const state = lineState(index);
          return <TraceRow key={line.id} label={line.label} state={state} />;
        })}
      </div>
    </div>
  );
}

function TraceRow({ label, state }: { label: string; state: LineState }) {
  const shown = state !== "idle";
  return (
    <div
      className="flex items-center gap-3 py-2.5 transition-all duration-300"
      style={{ opacity: shown ? 1 : 0.25, transform: shown ? "none" : "translateY(4px)" }}
    >
      <span
        className="relative grid h-5 w-5 flex-none place-items-center rounded-full"
        style={{
          border: `2px solid ${state === "idle" ? "var(--kit-line)" : "var(--kit-acc)"}`,
          background: state === "done" ? "var(--kit-acc)" : "transparent",
        }}
      >
        {state === "run" && (
          <span
            className="absolute rounded-full"
            style={{
              inset: 3,
              border: "2px solid var(--kit-acc)",
              borderRightColor: "transparent",
              animation: "kit-trace-spin .7s linear infinite",
            }}
          />
        )}
        {state === "done" && <Check className="h-3 w-3" style={{ stroke: "#fff", strokeWidth: 3.2 }} />}
      </span>
      <span
        className="text-[14px] font-semibold"
        style={{ color: state === "run" ? "var(--kit-ink)" : "var(--kit-ink2)" }}
      >
        {label}
      </span>
      <style>{`@keyframes kit-trace-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
