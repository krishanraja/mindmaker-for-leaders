/* eslint-disable react-refresh/only-export-components -- co-locates the panel with its filesFromArtifacts builder */
import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import type { KitArtifactRow } from "@/lib/kit";

/**
 * "What's inside" (spec 2.4 + 2.6, Part 3): the kit's files as a clean list,
 * each row with EXACTLY two affordances, Download and Copy. The full artifact
 * body never renders inline as a wall of text; it lives behind the buttons.
 *
 * This is generic across all four kits: it reads the real `artifacts` rows and
 * presents the hero (PDF, download-only) plus the supporting markdown files
 * (download + copy). On desktop it is the living right pane; on mobile it is a
 * clean one-screen list.
 */

export interface WhatsInsideFile {
  /** The artifact id (stable). */
  id: string;
  /** Display name, e.g. "how-i-work.md" or "your-kit.pdf". */
  filename: string;
  /** Short type tag for the file glyph (PDF / MD / ZIP / JSON). */
  tag: string;
  /** Download handler; absent => the row shows no Download button. */
  onDownload?: () => void | Promise<void>;
  /** Copy handler; absent => the row shows no Copy button (e.g. the PDF/ZIP). */
  onCopy?: () => void | Promise<boolean> | Promise<void>;
}

/** Save a text body (markdown / json) as a file. Best-effort; no-op on failure. */
function downloadText(body: string, filename: string): void {
  try {
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  } catch {
    // Best-effort; the copy affordance remains as the fallback.
  }
}

/** A short, human filename for an artifact, deterministic per artifact id. */
function filenameFor(artifact: KitArtifactRow): string {
  const meta = artifact.metadata as { zip_filename?: string } | null;
  if (artifact.content_type === "zip") {
    return meta?.zip_filename ?? `${artifact.artifact_id}.zip`;
  }
  if (artifact.content_type === "json") return `${artifact.artifact_id}.json`;
  return `${artifact.artifact_id}.md`;
}

function tagFor(artifact: KitArtifactRow): string {
  if (artifact.content_type === "zip") return "ZIP";
  if (artifact.content_type === "json") return "JSON";
  return "MD";
}

/**
 * Build the file list from the real artifacts plus the synthetic hero-PDF row.
 * The hero PDF row leads (download-only); then the training files. Skips
 * artifacts with no usable payload so a still-building file never shows a dead
 * button.
 */
export function filesFromArtifacts(
  artifacts: KitArtifactRow[],
  opts: {
    onDownloadPdf: () => void;
    onDownloadArtifact: (artifact: KitArtifactRow) => Promise<boolean>;
    onCopyArtifact: (artifact: KitArtifactRow) => Promise<boolean>;
    pdfName: string;
  },
): WhatsInsideFile[] {
  const heroPdf: WhatsInsideFile = {
    id: "__hero_pdf__",
    filename: opts.pdfName,
    tag: "PDF",
    onDownload: opts.onDownloadPdf,
  };

  const files: WhatsInsideFile[] = artifacts
    .filter((a) => {
      if (a.content_type === "zip") return !!a.zip_base64;
      return !!a.body;
    })
    .map((a) => {
      const name = filenameFor(a);
      if (a.content_type === "zip") {
        // Binary ZIP: download only (its bytes cannot be pasted), two-max kept.
        return { id: a.id, filename: name, tag: tagFor(a), onDownload: () => opts.onDownloadArtifact(a) };
      }
      // Text + json training files: BOTH affordances (spec 2.4). Download saves
      // the file; copy pastes it straight into the user's tool. The text body
      // never renders inline as a wall.
      return {
        id: a.id,
        filename: name,
        tag: tagFor(a),
        onDownload: () => downloadText(a.body ?? "", name),
        onCopy: () => opts.onCopyArtifact(a),
      };
    });

  return [heroPdf, ...files];
}

export function KitWhatsInside({
  files,
  toolName,
  className,
}: {
  files: WhatsInsideFile[];
  /** The user's chosen tool, named in the platform-agnostic note. */
  toolName: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      data-testid="kit-whats-inside"
    >
      <div className="mb-3 flex items-center gap-2 text-[15px] font-extrabold" style={{ color: "var(--kit-ink)" }}>
        What's inside
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
          style={{
            fontFamily: "var(--kit-display)",
            letterSpacing: "0.08em",
            color: "var(--kit-acc-deep)",
            background: "var(--kit-acc-soft)",
            border: "1px solid var(--kit-acc-line)",
          }}
        >
          ready
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {files.map((file) => (
          <FileRow key={file.id} file={file} />
        ))}
      </div>

      <p className="mt-3 text-[12px] leading-relaxed" style={{ color: "var(--kit-faint)" }}>
        Ready for any AI platform. Download the lot, or copy any file straight into {toolName}.
      </p>
    </div>
  );
}

function FileRow({ file }: { file: WhatsInsideFile }) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const doCopy = async () => {
    if (!file.onCopy) return;
    const result = await file.onCopy();
    if (result === false) {
      toast.error("Could not copy. Select the text and copy it manually.");
      return;
    }
    setCopied(true);
    toast.success(`${file.filename} copied.`);
    window.setTimeout(() => setCopied(false), 2200);
  };

  const doDownload = async () => {
    if (!file.onDownload) return;
    setDownloading(true);
    try {
      await file.onDownload();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="flex items-center gap-3 rounded-xl border p-3"
      style={{
        background: "var(--kit-card)",
        borderColor: "var(--kit-line)",
        boxShadow: "0 1px 2px rgba(16,28,30,.04)",
      }}
    >
      <span
        className="grid h-[30px] w-[30px] flex-none place-items-center rounded-lg text-[8px] font-bold"
        style={{
          fontFamily: "var(--kit-display)",
          letterSpacing: "0.04em",
          background: "var(--kit-acc-soft)",
          color: "var(--kit-acc-deep)",
        }}
      >
        {file.tag}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold" style={{ color: "var(--kit-ink2)" }}>
        {file.filename}
      </span>
      <span className="flex flex-none gap-1.5">
        {file.onDownload && (
          <button
            type="button"
            onClick={() => void doDownload()}
            disabled={downloading}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-colors disabled:opacity-50"
            style={{ background: "var(--kit-line2)", color: "var(--kit-mut)" }}
            aria-label={`Download ${file.filename}`}
          >
            <Download className="h-3 w-3" />
            Download
          </button>
        )}
        {file.onCopy && (
          <button
            type="button"
            onClick={() => void doCopy()}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-colors"
            style={{ background: "var(--kit-line2)", color: "var(--kit-mut)" }}
            aria-label={`Copy ${file.filename}`}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </span>
    </div>
  );
}
