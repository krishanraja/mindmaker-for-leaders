/**
 * ContextFileButton - the first-class "your context file" affordance.
 *
 * The single most portable thing the brain produces is one page of markdown
 * (my-ai-context.md: identity, business, objectives, decisions, patterns,
 * voice) that a leader can paste into ANY AI session so it starts already
 * knowing them. The builder has existed all along behind the export wizard's
 * "Raw Markdown" option; this component promotes it to one click.
 *
 * Two variants, no new screens:
 *   pill - the quiet chip that sits in the brain's meta line
 *   row  - the fuller row on the /context entry step (copy + download)
 */
import { useState } from 'react';
import { Check, Copy, Download, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemoryExport } from '@/hooks/useMemoryExport';

export function ContextFileButton({ variant }: { variant: 'pill' | 'row' }) {
  const { isExporting, generateExport } = useMemoryExport();
  const [copied, setCopied] = useState(false);

  const copyContextFile = async () => {
    if (isExporting) return;
    const result = await generateExport('markdown', 'general');
    if (!result?.content) return;
    try {
      await navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard unavailable; the button simply does not confirm */
    }
  };

  const downloadContextFile = async () => {
    if (isExporting) return;
    const result = await generateExport('markdown', 'general');
    if (!result?.content) return;
    const blob = new Blob([result.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-ai-context-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={copyContextFile}
        disabled={isExporting}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-foreground/[0.03] px-3 py-2 text-[11.5px] text-muted-foreground transition-colors hover:border-accent/30 hover:text-foreground disabled:opacity-60"
      >
        {isExporting ? (
          <Loader2 className="h-3 w-3 animate-spin text-accent" />
        ) : copied ? (
          <Check className="h-3 w-3 text-accent" />
        ) : (
          <FileText className="h-3 w-3" />
        )}
        <span>{copied ? 'Copied - paste it into any AI' : 'Copy my context file'}</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 grid place-items-center w-8 h-8 rounded-lg bg-secondary border border-border text-muted-foreground">
          <FileText className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground">Your context file</span>
          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
            One page with everything I know about you. Paste it into any AI session and it starts already knowing you - no re-explaining.
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={copyContextFile}
              disabled={isExporting}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-3 py-1.5 text-xs font-semibold text-foreground/90 transition-colors hover:border-accent/30 disabled:opacity-60"
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
              ) : copied ? (
                <Check className="h-3.5 w-3.5 text-accent" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={downloadContextFile}
              disabled={isExporting}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-3 py-1.5 text-xs font-semibold text-foreground/90 transition-colors hover:border-accent/30 disabled:opacity-60',
              )}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
