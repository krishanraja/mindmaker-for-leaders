import { Link } from 'react-router-dom';
import { LANDING } from './publicCopy';

/**
 * The public footer. The landing page carries the manifesto line above the
 * Mindmaker line; the inner pages carry the Mindmaker line alone, which is the
 * only thing a visitor deep in /try or /agents still needs to be told.
 *
 * The privacy lead and the notebook test sit here on every page. They are the
 * affirmational version of the question every leader is quietly asking about
 * what is safe to put in, and answering it in the footer means never having
 * to raise a security posture in the pitch itself.
 */
export function PublicFooter({ full = false }: { full?: boolean }) {
  return (
    <footer className="border-t border-border px-5 py-8 text-[12.5px] text-muted-foreground sm:px-8 sm:py-9">
      <div className="mx-auto w-full max-w-4xl">
        {full && <p className="max-w-[52ch] italic leading-relaxed text-foreground/60">{LANDING.footMani}</p>}
        <p className={`max-w-[52ch] leading-relaxed ${full ? 'mt-3' : ''}`}>{LANDING.privLead}</p>
        <p className="mt-3 max-w-[52ch] leading-relaxed">{LANDING.privTest}</p>
        <p className="mt-3 max-w-[52ch] leading-relaxed">{LANDING.footMM}</p>
        <p className="mt-3 max-w-[52ch] leading-relaxed text-muted-foreground/70">{LANDING.footFunnel}</p>
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
            <a href="/faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
            <a href="/trust" className="transition-colors hover:text-foreground">
              Security
            </a>
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
