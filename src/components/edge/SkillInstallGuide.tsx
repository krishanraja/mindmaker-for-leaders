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
}

const CLAUDE_SETTINGS_URL = "https://claude.ai/settings/capabilities";

/**
 * Install guide. The dominant path is Claude.ai - that's what a non-technical
 * CEO will use. We lead with it, render the 3 steps inline (not collapsed),
 * and provide a direct deep-link to Claude's Capabilities settings. Developer
 * paths (Claude Code, Cursor) are tucked into a single "Other install
 * options" disclosure to keep the surface uncluttered.
 */
export function SkillInstallGuide({ skillName, className }: SkillInstallGuideProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card overflow-hidden", className)}>
      <div className="px-4 py-3 border-b border-border bg-secondary/30">
        <h3 className="text-sm font-medium text-foreground">How to install this skill</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Takes about a minute in Claude.ai.
        </p>
      </div>

      {/* Primary path - Claude.ai, surfaced inline */}
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium text-foreground">Install in Claude.ai</span>
        </div>
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-foreground/80">
          <li>
            Open Claude&apos;s Capabilities settings (button below) and turn on
            <span className="font-medium"> Code execution and file creation</span>.
          </li>
          <li>
            Scroll to <span className="font-medium">Skills</span>, click{" "}
            <span className="font-medium">Upload skill</span>, and choose the
            ZIP you just downloaded.
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
          className="gap-1.5 w-full sm:w-auto"
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

      {/* Developer paths - collapsed by default */}
      <div className="border-t border-border">
        <Accordion type="single" collapsible className="px-4">
          <AccordionItem value="developer-paths" className="border-b-0">
            <AccordionTrigger className="text-xs font-medium text-muted-foreground">
              Other install options (Claude Code, Cursor)
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Terminal className="h-3.5 w-3.5 text-accent" />
                    <span className="text-sm font-medium text-foreground">
                      Claude Code
                    </span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-foreground/80">
                    <li>Open your terminal.</li>
                    <li>
                      Run{" "}
                      <code className="px-1.5 py-0.5 rounded bg-secondary text-xs font-mono">
                        unzip {skillName}.zip -d ~/.claude/skills/
                      </code>
                    </li>
                    <li>
                      The skill activates in your next Claude Code session.
                    </li>
                  </ol>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Code2 className="h-3.5 w-3.5 text-accent" />
                    <span className="text-sm font-medium text-foreground">
                      Cursor or other IDE
                    </span>
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
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
