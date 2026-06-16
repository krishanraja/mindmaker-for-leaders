import { useMemo, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { KitPortalLayout } from "@/components/kit/KitPortalLayout";
import { useKitRedemption } from "@/hooks/useKitRedemption";
import { PRESETS } from "@/content/kits";
import type { KitReadingPage as ReadingPage } from "@/content/kits";

/**
 * Renders a preset reading page by id. The student's own preset is checked
 * first; falling back across all presets keeps shared pages linkable.
 */
export default function KitReading() {
  const { pageId } = useParams<{ pageId: string }>();
  const { redemption, preset } = useKitRedemption();

  const page = useMemo<ReadingPage | null>(() => {
    if (!pageId) return null;
    const own = preset?.reading?.find((p) => p.id === pageId);
    if (own) return own;
    for (const candidate of Object.values(PRESETS)) {
      const hit = candidate.reading?.find((p) => p.id === pageId);
      if (hit) return hit;
    }
    return null;
  }, [pageId, preset]);

  return (
    <KitPortalLayout classTitle={preset?.title ?? null} passEndsAt={redemption?.expires_at}>
      <div className="space-y-6">
        <Link
          to="/kit/me"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to your kit
        </Link>

        {page ? (
          <article className="space-y-4">
            <h1 className="kit-headline text-3xl sm:text-4xl">{page.title}</h1>
            <div className="space-y-4">{renderMarkdownish(page.markdown)}</div>
          </article>
        ) : (
          <div className="space-y-3 py-12 text-center">
            <h1 className="kit-headline text-2xl">page not found</h1>
            <p className="text-sm text-muted-foreground">
              This page is not part of your kit. Head back and pick a reading link from there.
            </p>
          </div>
        )}
      </div>
    </KitPortalLayout>
  );
}

/**
 * A deliberately small markdown renderer: headings, bullets, paragraphs.
 * Kit reading pages are copy-first, so styled plain text is the contract.
 */
function renderMarkdownish(markdown: string): ReactNode[] {
  const blocks = markdown.split(/\n{2,}/);
  return blocks.map((block, index) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("### ")) {
      return (
        <h3 key={index} className="pt-2 text-lg font-semibold tracking-tight">
          {trimmed.slice(4)}
        </h3>
      );
    }
    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={index} className="pt-3 text-xl font-semibold tracking-tight">
          {trimmed.slice(3)}
        </h2>
      );
    }
    if (trimmed.startsWith("# ")) {
      return (
        <h2 key={index} className="pt-3 text-2xl font-semibold tracking-tight">
          {trimmed.slice(2)}
        </h2>
      );
    }

    const lines = trimmed.split("\n");
    const isList = lines.every((line) => /^[-*]\s+/.test(line.trim()));
    if (isList) {
      return (
        <ul key={index} className="list-disc space-y-1.5 pl-5 text-base leading-relaxed text-foreground/85">
          {lines.map((line, i) => (
            <li key={i}>{line.trim().replace(/^[-*]\s+/, "")}</li>
          ))}
        </ul>
      );
    }

    return (
      <p key={index} className="whitespace-pre-wrap text-base leading-relaxed text-foreground/85">
        {trimmed}
      </p>
    );
  });
}
