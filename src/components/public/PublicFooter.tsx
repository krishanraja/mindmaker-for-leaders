import { Link } from 'react-router-dom';
import { LANDING } from './publicCopy';

/**
 * The public footer. The landing page carries the manifesto line above the
 * Mindmaker line; the inner pages carry the Mindmaker line alone, which is the
 * only thing a visitor deep in /try or /agents still needs to be told.
 */
export function PublicFooter({ full = false }: { full?: boolean }) {
  return (
    <footer className="border-t border-border px-5 py-8 text-[12.5px] text-muted-foreground sm:px-8 sm:py-9">
      <div className="mx-auto w-full max-w-4xl">
        {full && <p className="max-w-[52ch] italic leading-relaxed text-foreground/60">{LANDING.footMani}</p>}
        <p className={`max-w-[52ch] leading-relaxed ${full ? 'mt-3' : ''}`}>{LANDING.footMM}</p>
        {full && (
          <div className="mt-5 flex flex-wrap gap-4 opacity-70">
            <Link to="/try" className="transition-colors hover:text-foreground">
              Watch it work
            </Link>
            <Link to="/upgrade" className="transition-colors hover:text-foreground">
              Pricing
            </Link>
            <Link to="/agents" className="transition-colors hover:text-foreground">
              For agents
            </Link>
            <a href="/llms.txt" className="transition-colors hover:text-foreground">
              llms.txt
            </a>
            <a href="/.well-known/product.json" className="transition-colors hover:text-foreground">
              product.json
            </a>
          </div>
        )}
      </div>
    </footer>
  );
}
