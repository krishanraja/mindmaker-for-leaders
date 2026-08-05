import { Link } from 'react-router-dom';
import { BrandLockup } from '@/components/landing/BrandLockup';
import { CtrlLogo } from '@/components/landing/CtrlLogo';
import { NAV } from './publicCopy';

/**
 * The one header every public front door wears. Brand left, the two places a
 * visitor might want to go next, and the single primary action.
 *
 * The nav links are suppressed on small screens (the mock's rule): on a phone
 * the only thing in the header besides the mark is the action.
 */
interface PublicHeaderProps {
  /** Route to leave out of the nav because you are already on it. */
  omit?: '/try' | '/upgrade';
  /** Auth wears a plain Back link instead of the nav plus action. */
  variant?: 'default' | 'back';
}

export function PublicHeader({ omit, variant = 'default' }: PublicHeaderProps) {
  return (
    <header className="relative z-10 flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3.5 sm:px-8">
      <Link to="/" className="flex items-center gap-2" aria-label="CTRL home">
        <BrandLockup />
        <CtrlLogo className="text-[15px]" />
      </Link>

      {variant === 'back' ? (
        <Link to="/" className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">
          Back
        </Link>
      ) : (
        <nav className="flex items-center gap-5">
          {omit !== '/try' && (
            <Link to="/try" className="hidden text-[13px] text-muted-foreground transition-colors hover:text-foreground sm:block">
              Watch it work
            </Link>
          )}
          {omit !== '/upgrade' && (
            <Link to="/upgrade" className="hidden text-[13px] text-muted-foreground transition-colors hover:text-foreground sm:block">
              Pricing
            </Link>
          )}
          <Link
            to="/auth"
            className="rounded-full bg-accent px-3.5 py-1.5 text-[12.5px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
          >
            {NAV.cta}
          </Link>
        </nav>
      )}
    </header>
  );
}
