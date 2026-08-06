import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import mindmakerIcon from '@/assets/mindmaker-icon.png';
import { EDGE_PRO_PRICE_LONG } from '@/constants/billing';
import { HeroBackdrop } from '@/components/public/HeroBackdrop';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { ToolMarquee } from '@/components/public/ToolMarquee';
import { WeighDemo } from '@/components/public/WeighDemo';
import { LANDING } from '@/components/public/publicCopy';

/**
 * The CTRL front door, built to the approved copy deck (2026-08-05).
 *
 * Six beats, in this order and no other: the hero, a real decision being
 * weighed, taste as the moat, a brain you own and can take with you, the
 * expertise built into the product, the price, and the line to leave on.
 * Copy lives in components/public/publicCopy.ts, not inline, so the five
 * public surfaces stay in lockstep.
 */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block font-display text-[10.5px] font-bold uppercase tracking-[0.13em] text-accent">{children}</span>
  );
}

function Section({
  children,
  center = false,
  className = '',
}: {
  children: React.ReactNode;
  center?: boolean;
  className?: string;
}) {
  return (
    <section className={`border-t border-border px-5 py-12 sm:px-8 sm:py-[74px] ${className}`}>
      <div className={`mx-auto w-full max-w-4xl ${center ? 'text-center' : ''}`}>{children}</div>
    </section>
  );
}

function Heading({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <h2
      className={`mt-3 max-w-[28ch] text-balance font-display text-[23px] font-extrabold leading-[1.14] tracking-[-0.025em] sm:text-[33px] ${
        center ? 'mx-auto' : ''
      }`}
    >
      {children}
    </h2>
  );
}

function Body({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <p
      className={`mt-4 max-w-[58ch] text-[14.5px] leading-[1.62] text-muted-foreground sm:text-base ${
        center ? 'mx-auto' : ''
      }`}
    >
      {children}
    </p>
  );
}

export function ClarityHome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />

      {/* HERO. Sized to own the screen it lands on: the viewport minus the
          header, so on a phone nothing from the next section peeks in under the
          fold. svh rather than vh because mobile browser chrome moves.
          The moving background is clipped to the hero; the page below it stays
          in normal flow so the document scrolls as usual. */}
      <section className="relative flex min-h-[calc(100svh-57px)] flex-col items-center justify-center overflow-hidden px-5 py-14 text-center sm:px-8 sm:py-20">
        <HeroBackdrop weight="full" />
        <div className="relative z-10 mx-auto w-full max-w-4xl">
          <img src={mindmakerIcon} alt="Mindmaker" className="mx-auto h-9 w-auto sm:h-11" />

          <h1 className="mx-auto mt-6 max-w-[15ch] text-balance font-display text-[2rem] font-extrabold leading-[1.03] tracking-[-0.033em] sm:text-[3.5rem]">
            {LANDING.h1}
          </h1>

          <p className="mx-auto mt-5 max-w-[60ch] text-balance text-[15px] leading-[1.55] text-muted-foreground sm:text-[18.5px]">
            {LANDING.sub}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate('/try')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-6 py-3 font-display text-[15px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
            >
              {LANDING.cta1} <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="rounded-xl border border-border bg-transparent px-6 py-3 font-display text-[15px] font-bold text-foreground transition-colors hover:bg-secondary/60"
            >
              {LANDING.cta2}
            </button>
          </div>

          <p className="mt-6 text-[12.5px] text-foreground/50">{LANDING.trust}</p>

          <div className="mt-10">
            <ToolMarquee />
          </div>
        </div>
      </section>

      {/* JUDGEMENT. The claim is made and then immediately shown. */}
      <Section center>
        <Eyebrow>{LANDING.judgeEy}</Eyebrow>
        <Heading center>{LANDING.judgeH}</Heading>
        <Body center>{LANDING.judgeBody}</Body>

        <div className="mt-8">
          <WeighDemo />
        </div>

        <p className="mt-5 text-[13px] text-muted-foreground">{LANDING.judgeCap}</p>

        <button
          onClick={() => navigate('/try')}
          className="mt-6 rounded-full border border-border px-5 py-2.5 font-display text-[13px] font-bold text-foreground transition-colors hover:bg-secondary/60"
        >
          {LANDING.judgeCta}
        </button>
      </Section>

      {/* TASTE */}
      <Section>
        <Eyebrow>{LANDING.tasteEy}</Eyebrow>
        <Heading>{LANDING.tasteH}</Heading>
        <Body>{LANDING.tasteBody}</Body>
      </Section>

      {/* PORTABLE */}
      <Section>
        <Eyebrow>{LANDING.portEy}</Eyebrow>
        <Heading>{LANDING.portH}</Heading>
        <Body>{LANDING.portBody}</Body>
        <button
          onClick={() => navigate('/agents')}
          className="mt-6 rounded-full border border-border px-5 py-2.5 text-[13px] font-bold text-foreground transition-colors hover:bg-secondary/60"
        >
          {LANDING.portCta}
        </button>
      </Section>

      {/* WHAT WE COUNT */}
      <Section>
        <Eyebrow>{LANDING.countEy}</Eyebrow>
        <Heading>{LANDING.countH}</Heading>
        <Body>{LANDING.countBody}</Body>
      </Section>

      {/* PRICE */}
      <Section center>
        <Heading center>{LANDING.priceH}</Heading>
        <Body center>{LANDING.priceBody}</Body>

        <div className="mx-auto mt-7 grid max-w-[640px] gap-3.5 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 text-left">
            <h3 className="font-display text-[13px] font-bold tracking-wide">Free</h3>
            <p className="mb-2.5 mt-1.5 font-display text-[29px] font-extrabold tracking-[-0.025em]">$0</p>
            <p className="text-[13.5px] leading-[1.55] text-muted-foreground">{LANDING.freeDesc}</p>
          </div>
          <div className="rounded-2xl border border-accent/35 bg-card p-5 text-left">
            <h3 className="font-display text-[13px] font-bold tracking-wide text-accent">Edge Pro</h3>
            <p className="mb-2.5 mt-1.5 text-[29px] font-extrabold tracking-[-0.025em]">
              {EDGE_PRO_PRICE_LONG.split(' / ')[0]} <span className="text-[13px] font-semibold text-muted-foreground">/ month</span>
            </p>
            <p className="text-[13.5px] leading-[1.55] text-muted-foreground">{LANDING.proDesc}</p>
          </div>
        </div>

        <p className="mx-auto mt-5 max-w-[58ch] text-[13px] leading-relaxed text-muted-foreground">
          {LANDING.priceNote}
        </p>
      </Section>

      {/* CLOSE */}
      <Section center className="!py-14 sm:!py-16">
        <h2 className="mx-auto max-w-[18ch] text-balance font-display text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[52px]">
          {LANDING.closeH}
        </h2>
        <button
          onClick={() => navigate('/auth')}
          className="mt-8 inline-flex items-center gap-1.5 rounded-xl bg-accent px-7 py-3.5 font-display text-[15px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
        >
          {LANDING.closeCta} <ArrowRight className="h-4 w-4" />
        </button>
      </Section>

      <PublicFooter full />
    </div>
  );
}
