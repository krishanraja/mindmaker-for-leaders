import { useState } from "react";
import { Check, Copy, Download, MonitorSmartphone, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SkillReleaseBlock } from "@/types/skill";
import {
  readSkillRelease,
  threeNumbers,
  type SkillRelease,
} from "../../../supabase/functions/_shared/skill-release.ts";

/**
 * SkillDelivery - the three honest beats of the payoff screen (spec 6.7).
 *
 * The payoff screen is where the biggest lie in this product would be easiest
 * to tell, so the three things it shows are the three things that are checkable:
 *
 * 1. WHAT THIS IS. Draft, Provisional or Verified, from releaseVerdict, in the
 *    sentence releaseVerdict wrote, with the numbers when numbers exist. Not a
 *    badge. A badge implies a grade was awarded; what happened is that some
 *    things were measured and most were not.
 *
 * 2. ONE TRIGGER PHRASE, copyable, framed as something to go and try. This
 *    turns an abstract artefact into an observable event: paste it, and either
 *    the skill fires or it does not. That is also a real test of the
 *    description, which is the field that decides whether the skill ever loads.
 *
 * 3. AN ACTION THE PERSON CAN ACTUALLY TAKE ON THE DEVICE THEY ARE HOLDING.
 *    Installing a skill is a desktop action: it needs a file manager, a
 *    terminal or a settings upload. Offering "install it" on a phone dead-ends
 *    at the exact moment the person is most willing, so on mobile the primary
 *    action moves the artefact to where it can be installed and says so.
 *
 * The download stays available everywhere and stays SECONDARY, because a file
 * in a downloads folder is not a live skill and this screen never implies it is.
 */

export interface SkillDeliveryProps {
  skillName: string;
  /** The release block from the generate response, or the artifact metadata. */
  release?: SkillRelease | SkillReleaseBlock | Record<string, unknown> | null;
  /** test_prompts from the generated skill. The first one is the trigger shown. */
  testPrompts?: string[] | null;
  /** Downloads the package. Always secondary; never described as installing. */
  onDownload: () => void;
  /** Scrolls to / reveals the install steps. Desktop primary. */
  onInstall?: () => void;
  /** Where a desktop can pick this up. Defaults to the current library URL. */
  shareUrl?: string;
  className?: string;
}

/**
 * A release from any of the three shapes it arrives in, through ONE reader.
 *
 * Whatever the shape, the label is re-derived from the numbers rather than
 * read off the row: a stored 'verified' with nothing under it has to render as
 * what it is, and that rule only holds if every path goes through the reader.
 */
function toRelease(input: SkillDeliveryProps["release"]): SkillRelease {
  const raw = (input ?? {}) as Record<string, unknown>;
  // Already read (a caller that resolved it itself).
  if ("labelText" in raw) return raw as unknown as SkillRelease;
  // The whole artifact metadata bag.
  if ("release" in raw) return readSkillRelease(raw);
  // The response's release block: numbers plus its own version fields.
  return readSkillRelease({
    release: raw,
    criteria_version: raw.criteria_version,
    rendered_at: raw.rendered_at,
  });
}

export function SkillDelivery({
  skillName,
  release,
  testPrompts,
  onDownload,
  onInstall,
  shareUrl,
  className,
}: SkillDeliveryProps) {
  const isMobile = useIsMobile();
  const [copied, setCopied] = useState(false);
  const resolved = toRelease(release);
  const numbers = threeNumbers(resolved);
  const trigger = (testPrompts ?? []).map((p) => (p ?? "").trim()).find((p) => p.length > 0) ?? null;

  const copyTrigger = async () => {
    if (!trigger) return;
    try {
      await navigator.clipboard.writeText(trigger);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Select the text and copy it by hand.");
    }
  };

  /**
   * "Send it to your desktop" does one real thing: hands the link to whatever
   * the phone can send with. The share sheet where there is one, the clipboard
   * where there is not. Nothing is emailed and nothing is claimed to be.
   */
  const sendToDesktop = async () => {
    const url = shareUrl ?? (typeof window !== "undefined" ? window.location.href : "");
    const text = `${skillName} is ready in CTRL. Open this on your desktop to install it.`;
    const nav = typeof navigator !== "undefined" ? navigator : null;
    if (nav && typeof nav.share === "function") {
      try {
        await nav.share({ title: skillName, text, url });
        return;
      } catch {
        // Cancelled or unavailable; fall through to the clipboard.
      }
    }
    try {
      await nav?.clipboard?.writeText(`${text} ${url}`);
      toast.success("Link copied. Open it on your desktop to install.");
    } catch {
      toast.error("Could not copy the link. Open CTRL on your desktop to install this.");
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* 1. What this is, in the words the verdict wrote. */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Where this stands
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">{resolved.labelText}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
          {resolved.reason}
        </p>
        {numbers && (
          <p className="mt-1.5 text-[12px] font-medium text-foreground/80">{numbers}</p>
        )}
      </div>

      {/* 2. One thing to go and try, right now. */}
      {trigger && (
        <div className="rounded-2xl border border-accent/25 bg-accent/[0.05] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-accent/90">
            Try it
          </p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Paste this into Claude and it should fire.
          </p>
          <p className="mt-2 rounded-xl border border-border bg-background/70 p-3 text-[13px] leading-relaxed text-foreground">
            {trigger}
          </p>
          <button
            type="button"
            onClick={() => void copyTrigger()}
            className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-accent transition-opacity hover:opacity-80"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy the phrase"}
          </button>
        </div>
      )}

      {/* 3. The action this device can finish. */}
      {isMobile ? (
        <>
          <button
            type="button"
            onClick={() => void sendToDesktop()}
            className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[13px] bg-accent text-[15px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
          >
            <Send className="h-[18px] w-[18px]" />
            Send it to your desktop
          </button>
          <p className="text-center text-[11.5px] leading-relaxed text-muted-foreground">
            Installing a skill needs a desktop, so this sends you the link. Your skill is saved
            either way.
          </p>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex h-[44px] w-full items-center justify-center gap-2 rounded-[13px] border border-border bg-background/60 text-[14px] font-semibold text-foreground transition-colors hover:bg-secondary/50"
          >
            <Download className="h-4 w-4" />
            Download it anyway (.zip)
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              onDownload();
              onInstall?.();
            }}
            className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[13px] bg-accent text-[15px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
          >
            <MonitorSmartphone className="h-[18px] w-[18px]" />
            Install it in your AI
          </button>
          <p className="text-center text-[11.5px] leading-relaxed text-muted-foreground">
            That downloads the package. It is not live until you install it, and the steps are
            below.
          </p>
        </>
      )}
    </div>
  );
}
