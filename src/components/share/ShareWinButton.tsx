import { useState } from 'react';
import { Share2, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const SHARE_CARD = `${import.meta.env.VITE_SUPABASE_URL || 'https://bkyuxvschuwngtcdhsyg.supabase.co'}/functions/v1/share-card`;
const LANDING = 'https://ctrl.themindmaker.ai/agents';

export interface ShareWin {
  title: string; // the headline on the card
  stat?: string; // optional big accent stat ("4/4", "~40%")
  sub?: string; // optional subline
  text?: string; // the post text
}

function cardUrl({ title, stat, sub }: ShareWin): string {
  const p = new URLSearchParams();
  p.set('t', title);
  if (stat) p.set('s', stat);
  if (sub) p.set('l', sub);
  return `${SHARE_CARD}?${p.toString()}`;
}

/**
 * One-click share of an in-app win as a branded image. Uses the Web Share API
 * with the generated PNG file where supported; otherwise opens the card and
 * copies the link. The card is rendered server-side (share-card edge fn).
 */
export function ShareWinButton({ win, label = 'Share', variant = 'secondary', className }: {
  win: ShareWin;
  label?: string;
  variant?: 'secondary' | 'outline' | 'ghost' | 'default';
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleShare() {
    setBusy(true);
    const url = cardUrl(win);
    const text = win.text ?? win.title;
    try {
      // Prefer native share with the actual image file.
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], 'ctrl-win.png', { type: 'image/png' });
      const navAny = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (navAny.share && navAny.canShare?.({ files: [file] })) {
        await navAny.share({ files: [file], text, url: LANDING });
      } else if (navAny.share) {
        await navAny.share({ text, url: LANDING });
      } else {
        // Desktop fallback: open the card + copy the link.
        window.open(url, '_blank', 'noopener');
        await navigator.clipboard.writeText(LANDING).catch(() => {});
        toast.success('Card opened. Link copied - paste it with your post.');
      }
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch (e) {
      // user cancelling the native sheet throws AbortError - ignore it
      if ((e as Error)?.name !== 'AbortError') toast.error('Could not share that.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant={variant} size="sm" className={className} onClick={handleShare} disabled={busy}>
      {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : done ? <Check className="mr-1.5 h-3.5 w-3.5 text-accent" /> : <Share2 className="mr-1.5 h-3.5 w-3.5" />}
      {label}
    </Button>
  );
}
