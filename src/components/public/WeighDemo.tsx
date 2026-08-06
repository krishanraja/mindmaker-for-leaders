import { useEffect, useState } from 'react';
import { GitFork } from 'lucide-react';
import { ConsiderationStone } from '@/components/decision-map/ConsiderationStone';
import { CLAIMS, STATEMENT } from './sampleWeigh';

/**
 * The worked weigh, rendered by the product's own ConsiderationStone so a
 * visitor is looking at the instrument rather than a mock of it. Click any
 * consideration to open the sources it was checked against.
 *
 * `stagger` resolves them one at a time, the way the engine does. The statement
 * sits above the stones because four considerations with no decision attached
 * do not mean anything on their own.
 */
export function WeighDemo({ stagger = false, showStatement = true }: { stagger?: boolean; showStatement?: boolean }) {
  const [shown, setShown] = useState(stagger ? 0 : CLAIMS.length);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!stagger || shown >= CLAIMS.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), shown === 0 ? 500 : 750);
    return () => clearTimeout(t);
  }, [stagger, shown]);

  return (
    <div className="mx-auto w-full max-w-[600px] text-left">
      {showStatement && (
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card/60 p-4">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground">
            <GitFork className="h-4 w-4 rotate-90" />
          </span>
          <p className="text-sm font-medium leading-snug text-foreground">{STATEMENT}</p>
        </div>
      )}

      <div className={`space-y-2 ${showStatement ? 'mt-4' : ''}`}>
        {CLAIMS.slice(0, shown).map((c) => (
          <ConsiderationStone
            key={c.claim.id}
            claim={c.claim}
            evidence={c.evidence}
            expanded={open === c.claim.id}
            onToggle={() => setOpen(open === c.claim.id ? null : c.claim.id)}
          />
        ))}
      </div>
    </div>
  );
}
