import { useState } from 'react';
import { Copy, Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CopyablePromptProps {
  prompt: string;
  title?: string;
  className?: string;
}

export function CopyablePrompt({ prompt, title = "Ready to use", className }: CopyablePromptProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className={cn('rounded-xl border border-accent/30 bg-accent/5 overflow-hidden', className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-accent/20 bg-accent/10">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-accent-foreground" />
          <span className="text-sm font-medium text-accent-foreground">{title}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 px-3 text-accent-foreground hover:bg-accent/20"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      <div className="p-4">
        <p className="text-foreground text-base leading-relaxed whitespace-pre-wrap">
          {prompt}
        </p>
      </div>
    </div>
  );
}
