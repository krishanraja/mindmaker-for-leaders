import { useState } from "react";
import { Check, Copy, Download, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ArtifactSpec } from "@/content/kits";
import type { KitArtifactRow, KitArtifactStatusEntry } from "@/lib/kit";

/**
 * One artifact in the kit: title, the what-to-do-with-this line, a scrollable
 * copy-first preview, and the action that matches its type (copy or ZIP
 * download). "Tune this" opens the regenerate sheet scoped to this artifact.
 */
export function ArtifactCard({
  spec,
  artifact,
  buildStatus,
  staticBody,
  onCopy,
  onDownload,
  onTune,
}: {
  spec: Pick<ArtifactSpec, "id" | "title" | "description" | "contentType" | "strategy">;
  artifact: KitArtifactRow | undefined;
  buildStatus: KitArtifactStatusEntry | undefined;
  /** Client-rendered body for strategy "static" artifacts (never in the DB). */
  staticBody?: string | null;
  onCopy: (artifact: KitArtifactRow) => Promise<boolean>;
  onDownload: (artifact: KitArtifactRow) => Promise<boolean>;
  onTune?: (artifactId: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const body = artifact?.body ?? staticBody ?? null;
  const isZip = spec.contentType === "zip";
  const failed = !artifact && !staticBody && buildStatus?.status === "failed";
  const missing = !artifact && !staticBody && !failed;
  const tunable = spec.strategy !== "static" && onTune;

  const copyBody = async () => {
    let ok = false;
    if (artifact) {
      ok = await onCopy(artifact);
    } else if (staticBody) {
      try {
        await navigator.clipboard.writeText(staticBody);
        ok = true;
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      toast.success(`${spec.title} copied.`);
      window.setTimeout(() => setCopied(false), 2500);
    } else {
      toast.error("Could not copy. Select the text and copy it manually.");
    }
  };

  const downloadZip = async () => {
    if (!artifact) return;
    setDownloading(true);
    const ok = await onDownload(artifact);
    setDownloading(false);
    if (!ok) toast.error("The download did not start. Try again.");
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <div className="space-y-1">
        <h4 className="font-semibold leading-snug">{spec.title}</h4>
        <p className="text-sm text-muted-foreground">{spec.description}</p>
      </div>

      {failed && (
        <p className="rounded-xl bg-destructive/[0.06] px-3 py-2 text-sm text-destructive">
          This one did not build. {buildStatus?.error ?? "Tune it below to rebuild it."}
        </p>
      )}

      {body && (
        <div className="max-h-52 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-secondary/40 p-4 text-sm leading-relaxed text-foreground/85">
          {body}
        </div>
      )}

      <div className="flex items-center gap-2">
        {isZip && artifact?.storage_path ? (
          <Button size="lg" className="flex-1" onClick={() => void downloadZip()} disabled={downloading}>
            <Download className="mr-2 h-4 w-4" />
            Download ZIP
          </Button>
        ) : body ? (
          <Button size="lg" className="flex-1" onClick={() => void copyBody()}>
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            Copy
          </Button>
        ) : failed && tunable ? (
          <Button size="lg" variant="outline" className="flex-1" onClick={() => onTune?.(spec.id)}>
            Rebuild this
          </Button>
        ) : missing ? (
          <p className="flex-1 text-sm text-muted-foreground">Still on its way.</p>
        ) : null}

        {tunable && !failed && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted-foreground"
            onClick={() => onTune?.(spec.id)}
          >
            <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
            Tune this
          </Button>
        )}
      </div>
    </div>
  );
}
