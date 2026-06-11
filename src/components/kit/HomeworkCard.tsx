import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { KIT_TOOL_LABELS, toolFromIntake } from "@/content/kits";
import type { IntakeAnswers, KitPreset } from "@/content/kits";
import { KIT_TOOL_URLS } from "@/lib/kit";

/**
 * The compose-wait turned into the student's first action: a context-pull
 * prompt they paste into their AI tool while CTRL builds.
 */
export function HomeworkCard({
  preset,
  intake,
}: {
  preset: KitPreset;
  intake: IntakeAnswers;
}) {
  const [copied, setCopied] = useState(false);
  const tool = toolFromIntake(preset, intake);
  const toolLabel = KIT_TOOL_LABELS[tool];
  const toolUrl = KIT_TOOL_URLS[tool];
  const prompt = preset.contextPullPrompt(tool, { intake });

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success(`Copied. Paste it into ${toolLabel}.`);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy. Select the text and copy it manually.");
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-accent/30 bg-accent/[0.04] p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          While CTRL builds, give your AI its homework
        </h2>
        <p className="text-sm text-muted-foreground">
          Paste this into {toolLabel}. It pulls together what your AI already knows about you,
          and the answer makes your kit sharper when you bring it back here.
        </p>
      </div>

      <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl bg-card p-4 font-mono text-xs leading-relaxed text-foreground/85 border border-border">
        {prompt}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" className="flex-1" onClick={copyPrompt}>
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          Copy the prompt
        </Button>
        {toolUrl && (
          <Button asChild variant="outline" size="lg" className="flex-1">
            <a href={toolUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open {toolLabel}
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
