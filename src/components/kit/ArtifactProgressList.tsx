import { useMemo } from "react";
import { CheckCircle2, Circle, Loader2, MinusCircle, XCircle } from "lucide-react";
import type { KitPreset } from "@/content/kits";
import type { KitArtifactBuildStatus, KitBuildRow } from "@/lib/kit";
import { cn } from "@/lib/utils";

interface ProgressEntry {
  id: string;
  title: string;
  status: KitArtifactBuildStatus;
  order: number;
}

function humanise(id: string): string {
  const words = id.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Honest per-artifact staging for the composing wait. Statuses come straight
 * from the polled build row; titles come from the preset where known.
 */
export function ArtifactProgressList({
  preset,
  build,
}: {
  preset: KitPreset;
  build: KitBuildRow;
}) {
  const entries = useMemo<ProgressEntry[]>(() => {
    const statuses = build.artifact_statuses ?? {};
    const keys = Object.keys(statuses);
    const specById = new Map(preset.artifacts.map((spec) => [spec.id, spec]));

    if (keys.length === 0) {
      // The orchestrator has not written statuses yet; stage the manifest.
      if (build.kind === "initial") {
        return preset.artifacts
          .filter((spec) => spec.strategy !== "static")
          .sort((a, b) => a.order - b.order)
          .map((spec) => ({ id: spec.id, title: spec.title, status: "queued", order: spec.order }));
      }
      return [
        {
          id: build.kind,
          title: build.kind === "new_skill" ? "Your new skill" : "Refreshing your kit",
          status: "queued",
          order: 0,
        },
      ];
    }

    return keys
      .map((key) => ({
        id: key,
        title: specById.get(key)?.title ?? humanise(key),
        status: statuses[key]?.status ?? "queued",
        order: specById.get(key)?.order ?? 999,
      }))
      .sort((a, b) => a.order - b.order);
  }, [build, preset]);

  const done = entries.filter((e) => e.status === "done").length;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Building your kit</h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {done} of {entries.length} done
        </span>
      </div>
      <ul className="space-y-2">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-center gap-2.5 text-sm">
            <StatusIcon status={entry.status} />
            <span
              className={cn(
                entry.status === "done" && "text-foreground",
                entry.status === "running" && "text-foreground",
                (entry.status === "queued" || entry.status === "skipped") &&
                  "text-muted-foreground",
                entry.status === "failed" && "text-destructive",
              )}
            >
              {entry.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusIcon({ status }: { status: KitArtifactBuildStatus }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />;
    case "running":
      return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />;
    case "failed":
      return <XCircle className="h-4 w-4 shrink-0 text-destructive" />;
    case "skipped":
      return <MinusCircle className="h-4 w-4 shrink-0 text-muted-foreground/60" />;
    default:
      return <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />;
  }
}
