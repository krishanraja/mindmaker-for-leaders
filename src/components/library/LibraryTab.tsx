import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Zap,
  PenTool,
  Layers,
  FileText,
  Radio,
  Trash2,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useGeneratedArtifacts } from "@/hooks/useGeneratedArtifacts";
import { renderMarkdown } from "@/lib/renderMarkdown";
import {
  ARTIFACT_KIND_LABEL,
  type ArtifactKind,
  type GeneratedArtifact,
} from "@/types/artifact";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<ArtifactKind, React.ComponentType<{ className?: string }>> = {
  skill: Zap,
  draft: PenTool,
  framework: Layers,
  export: FileText,
  briefing_custom: Radio,
};

const KIND_TONE: Record<ArtifactKind, string> = {
  skill: "text-amber-500 bg-amber-500/10",
  draft: "text-accent bg-accent/10",
  framework: "text-purple-500 bg-purple-500/10",
  export: "text-emerald-500 bg-emerald-500/10",
  briefing_custom: "text-blue-500 bg-blue-500/10",
};

/**
 * Library tab - shows every artifact CTRL has generated for this user
 * (skills, drafts, frameworks, exports, custom briefings). Tap a row to
 * inline-preview the markdown, copy it, or delete it. Replaces the
 * "artifacts vanish when the sheet closes" problem.
 */
export function LibraryTab() {
  const { artifacts, loading, remove } = useGeneratedArtifacts();
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Group by kind (newest-first within each group) so the leader sees
  // "Skills (4), Drafts (2)..." rather than a jumbled chronology.
  const grouped = useMemo(() => {
    const map = new Map<ArtifactKind, GeneratedArtifact[]>();
    for (const a of artifacts) {
      const list = map.get(a.kind) ?? [];
      list.push(a);
      map.set(a.kind, list);
    }
    return Array.from(map.entries());
  }, [artifacts]);

  const activeArtifact = useMemo(
    () => artifacts.find((a) => a.id === activeId) ?? null,
    [artifacts, activeId],
  );

  const handleCopy = async (artifact: GeneratedArtifact) => {
    try {
      await navigator.clipboard.writeText(artifact.body);
      setCopiedId(artifact.id);
      toast({ title: `Copied "${artifact.name}"` });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const handleDelete = async (artifact: GeneratedArtifact) => {
    const ok = await remove(artifact.id);
    if (ok) {
      toast({ title: `Removed "${artifact.name}" from your Library` });
      if (activeId === artifact.id) setActiveId(null);
    } else {
      toast({ title: "Couldn't remove", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (artifacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-1">
          <Layers className="w-5 h-5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium text-foreground">
          Your Library is empty
        </h3>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
          Generate a skill, draft, or framework from Edge and we'll save it
          here automatically so you can find it again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {grouped.map(([kind, items]) => {
        const Icon = KIND_ICON[kind];
        return (
          <div key={kind} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <div
                className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center",
                  KIND_TONE[kind],
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-medium text-foreground">
                {ARTIFACT_KIND_LABEL[kind]}
                <span className="text-muted-foreground font-normal ml-1.5">
                  ({items.length})
                </span>
              </h3>
            </div>

            <div className="space-y-2">
              {items.map((artifact) => (
                <motion.div
                  key={artifact.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setActiveId(activeId === artifact.id ? null : artifact.id)
                    }
                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-secondary/30 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {artifact.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(artifact.created_at).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(artifact);
                        }}
                        aria-label="Copy markdown"
                        className={cn(
                          "p-2 rounded-md transition-colors",
                          copiedId === artifact.id
                            ? "text-emerald-600 bg-emerald-500/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                        )}
                      >
                        {copiedId === artifact.id ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(artifact);
                        }}
                        aria-label="Remove from Library"
                        className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </button>

                  {activeArtifact?.id === artifact.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="border-t border-border bg-secondary/20"
                    >
                      <div
                        className="px-4 py-3 max-h-[400px] overflow-y-auto text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(artifact.body),
                        }}
                      />
                      <div className="px-3 py-2 border-t border-border flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveId(null)}
                          className="text-xs"
                        >
                          Close preview
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
