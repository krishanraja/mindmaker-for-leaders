import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, X, Download, Zap, Star, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { renderMarkdown } from "@/lib/renderMarkdown";
import { cn } from "@/lib/utils";
import { SkillQualityGate } from "./SkillQualityGate";
import { SkillInstallGuide } from "./SkillInstallGuide";
import type { SkillData, SkillQualityGate as SkillQualityGateType } from "@/types/skill";

interface SkillPreviewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  skill: SkillData;
  qualityGate: SkillQualityGateType;
  onDownload: () => void;
  zipFilename: string;
}

/**
 * Bottom sheet (mobile) / dialog (desktop) showing the generated skill.
 *
 * Layout (top to bottom):
 *   - Skill name + archetype tag
 *   - Description (highlighted)
 *   - Primary action: Download Agent Skill (.zip)
 *   - Quality gate checklist
 *   - Test prompts (copy each)
 *   - Install guide (accordion)
 *   - Collapsible SKILL.md body preview
 */
export function SkillPreviewSheet({
  isOpen,
  onClose,
  skill,
  qualityGate,
  onDownload,
  zipFilename,
}: SkillPreviewSheetProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl px-6 pb-6 pt-6 h-[90vh] flex flex-col"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{skill.name}</SheetTitle>
            <SheetDescription>Preview of generated Agent Skill</SheetDescription>
          </SheetHeader>
          <PreviewContent
            skill={skill}
            qualityGate={qualityGate}
            onClose={onClose}
            onDownload={onDownload}
            zipFilename={zipFilename}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>{skill.name}</DialogTitle>
          <DialogDescription>Preview of generated Agent Skill</DialogDescription>
        </DialogHeader>
        <PreviewContent
          skill={skill}
          qualityGate={qualityGate}
          onClose={onClose}
          onDownload={onDownload}
          zipFilename={zipFilename}
        />
      </DialogContent>
    </Dialog>
  );
}

function PreviewContent({
  skill,
  qualityGate,
  onClose,
  onDownload,
  zipFilename,
}: {
  skill: SkillData;
  qualityGate: SkillQualityGateType;
  onClose: () => void;
  onDownload: () => void;
  zipFilename: string;
}) {
  const { toast } = useToast();
  const [showRawBody, setShowRawBody] = useState(false);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Title bar */}
      <div className="flex items-center gap-3 pb-4 border-b border-border flex-shrink-0">
        <div className="p-2 rounded-lg bg-amber-500/10">
          <Zap className="h-4 w-4 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-foreground truncate">
            {skill.name}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {skill.archetype && (
              <p className="text-[11px] text-muted-foreground capitalize">
                {String(skill.archetype).replace(/-/g, " ")}
              </p>
            )}
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-medium">
              <CheckCircle2 className="w-2.5 h-2.5" />
              Saved to Library
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto py-4 min-h-0 space-y-4">
        {/* Description */}
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-3.5 w-3.5 text-accent" />
            <h4 className="text-xs font-medium text-foreground uppercase tracking-wide">
              Description
            </h4>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">{skill.description}</p>
        </div>

        {/* Primary download CTA */}
        <Button
          onClick={onDownload}
          className="w-full gap-2 h-12 text-sm font-medium"
          size="lg"
        >
          <Download className="h-4 w-4" />
          Download Agent Skill ({zipFilename})
        </Button>

        {/* Quality gate */}
        <SkillQualityGate qualityGate={qualityGate} />

        {/* Test prompts */}
        <TestPromptsSection prompts={skill.test_prompts} />

        {/* Install guide */}
        <SkillInstallGuide skillName={skill.name} />

        {/* Raw body preview */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <button
            onClick={() => setShowRawBody((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors"
          >
            <span className="text-sm font-medium text-foreground">SKILL.md preview</span>
            {showRawBody ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {showRawBody && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-border"
            >
              <div
                className="p-4 max-h-[400px] overflow-y-auto text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(skill.body) }}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 pt-4 border-t border-border flex-shrink-0">
        <Button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(skill.body);
              toast({ title: "SKILL.md copied to clipboard" });
            } catch {
              toast({ title: "Failed to copy", variant: "destructive" });
            }
          }}
          variant="outline"
          size="sm"
          className="gap-1.5"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy SKILL.md
        </Button>
        <div className="flex-1" />
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Close
        </Button>
      </div>
    </div>
  );
}

function TestPromptsSection({ prompts }: { prompts: string[] }) {
  const { toast } = useToast();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = useCallback(async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast({ title: "Test prompt copied" });
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  }, [toast]);

  if (!prompts || prompts.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-secondary/30">
        <h3 className="text-sm font-medium text-foreground">Test your skill</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Open a fresh Claude conversation, paste any of these, and confirm the skill triggers.
        </p>
      </div>
      <ul className="divide-y divide-border">
        {prompts.map((prompt, i) => (
          <li key={i} className="px-4 py-3">
            <div className="flex items-start gap-2">
              <span className="text-[11px] font-medium text-muted-foreground mt-1 w-5 flex-shrink-0">
                {i + 1}.
              </span>
              <p className="flex-1 text-sm text-foreground/80 leading-relaxed italic">
                "{prompt}"
              </p>
              <button
                onClick={() => handleCopy(prompt, i)}
                className={cn(
                  "flex-shrink-0 p-1.5 rounded-md transition-colors",
                  copiedIndex === i
                    ? "text-emerald-600 bg-emerald-500/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                )}
                aria-label="Copy prompt"
              >
                {copiedIndex === i ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
