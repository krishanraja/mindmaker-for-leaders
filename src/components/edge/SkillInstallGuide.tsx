import { Terminal, Globe, Code2, ExternalLink } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SkillInstallGuideProps {
  skillName: string;
  className?: string;
  /**
   * Optional: the tool the user already lives in. Reorders the guide so the
   * matching install path renders first and expanded; everything else folds
   * into the disclosure. Tools without their own path (ChatGPT, Gemini,
   * Lovable, none) keep the Claude.ai default.
   */
  preferredTool?: "claude" | "chatgpt" | "claude-code" | "cursor" | "gemini" | "lovable" | "none";
}

const CLAUDE_SETTINGS_URL = "https://claude.ai/settings/customize";

type InstallPathId = "claude" | "claude-code" | "cursor";

const PATH_LABELS: Record<InstallPathId, string> = {
  claude: "Claude.ai",
  "claude-code": "Claude Code",
  cursor: "Cursor",
};

const PATH_TAGLINES: Record<InstallPathId, string> = {
  claude: "Takes about a minute in Claude.ai.",
  "claude-code": "Takes about a minute in your terminal.",
  cursor: "Takes about a minute in your IDE.",
};

function primaryPathFor(preferredTool?: SkillInstallGuideProps["preferredTool"]): InstallPathId {
  if (preferredTool === "claude-code") return "claude-code";
  if (preferredTool === "cursor") return "cursor";
  // Claude.ai is the dominant path for everyone else - that's what a
  // non-technical CEO will use, and ChatGPT/Gemini/Lovable have no skill
  // install surface of their own.
  return "claude";
}

/**
 * Install guide. The primary path (Claude.ai by default, or the user's own
 * tool when `preferredTool` says so) renders inline with its steps open; the
 * remaining paths are tucked into a single "Other install options"
 * disclosure to keep the surface uncluttered.
 */
export function SkillInstallGuide({ skillName, className, preferredTool }: SkillInstallGuideProps) {
  const primary = primaryPathFor(preferredTool);
  const others = (Object.keys(PATH_LABELS) as InstallPathId[]).filter((id) => id !== primary);

  return (
    <div className={cn("rounded-xl border border-border bg-card overflow-hidden", className)}>
      <div className="px-4 py-3 border-b border-border bg-secondary/30">
        <h3 className="text-sm font-medium text-foreground">How to install this skill</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">{PATH_TAGLINES[primary]}</p>
      </div>

      {/* Primary path - surfaced inline */}
      <div className="px-4 py-4 space-y-3">
        <PathSteps pathId={primary} skillName={skillName} primary />
      </div>

      {/* Remaining paths - collapsed by default */}
      <div className="border-t border-border">
        <Accordion type="single" collapsible className="px-4">
          <AccordionItem value="other-paths" className="border-b-0">
            <AccordionTrigger className="text-xs font-medium text-muted-foreground">
              Other install options ({others.map((id) => PATH_LABELS[id]).join(", ")})
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pb-2">
                {others.map((id) => (
                  <PathSteps key={id} pathId={id} skillName={skillName} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

function PathSteps({
  pathId,
  skillName,
  primary = false,
}: {
  pathId: InstallPathId;
  skillName: string;
  primary?: boolean;
}) {
  if (pathId === "claude") {
    return (
      <div>
        <div className={cn("flex items-center gap-2", primary ? "mb-3" : "mb-1.5")}>
          <Globe className={cn("text-accent", primary ? "h-4 w-4" : "h-3.5 w-3.5")} />
          <span className="text-sm font-medium text-foreground">Install in Claude.ai</span>
        </div>
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-foreground/80">
          <li>
            In Claude, open <span className="font-medium">Settings</span>, then{" "}
            <span className="font-medium">Customize</span> (button below).
          </li>
          <li>
            Go to <span className="font-medium">Skills</span>, click the{" "}
            <span className="font-medium">+</span> button, choose{" "}
            <span className="font-medium">Create skill</span>, then{" "}
            <span className="font-medium">Upload a skill</span> and pick the ZIP
            you just downloaded.
          </li>
          <li>
            Done - the skill triggers automatically when your prompt matches
            its trigger phrase.
          </li>
        </ol>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="gap-1.5 w-full sm:w-auto mt-3"
        >
          <a
            href={CLAUDE_SETTINGS_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open Claude settings
          </a>
        </Button>
      </div>
    );
  }

  if (pathId === "claude-code") {
    return (
      <div>
        <div className={cn("flex items-center gap-2", primary ? "mb-3" : "mb-1.5")}>
          <Terminal className={cn("text-accent", primary ? "h-4 w-4" : "h-3.5 w-3.5")} />
          <span className="text-sm font-medium text-foreground">Claude Code</span>
        </div>
        <ol className="list-decimal list-inside space-y-1 text-sm text-foreground/80">
          <li>Open your terminal.</li>
          <li>
            Run{" "}
            <code className="px-1.5 py-0.5 rounded bg-secondary text-xs font-mono">
              unzip {skillName}.zip -d ~/.claude/skills/
            </code>
          </li>
          <li>The skill activates in your next Claude Code session.</li>
        </ol>
      </div>
    );
  }

  return (
    <div>
      <div className={cn("flex items-center gap-2", primary ? "mb-3" : "mb-1.5")}>
        <Code2 className={cn("text-accent", primary ? "h-4 w-4" : "h-3.5 w-3.5")} />
        <span className="text-sm font-medium text-foreground">Cursor or other IDE</span>
      </div>
      <ol className="list-decimal list-inside space-y-1 text-sm text-foreground/80">
        <li>
          Unzip the file into your project&apos;s{" "}
          <code className="px-1.5 py-0.5 rounded bg-secondary text-xs font-mono">
            .claude/skills/
          </code>{" "}
          directory.
        </li>
        <li>The skill is available in your next session.</li>
      </ol>
    </div>
  );
}
