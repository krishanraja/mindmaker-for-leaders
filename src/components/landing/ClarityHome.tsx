import { useNavigate } from 'react-router-dom';
import { ArrowRight, Scale, Brain, Plug, Radio, ShieldCheck, GitFork } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TOOLS = ['ChatGPT', 'Claude', 'Gemini', 'Cursor', 'Claude Code'];

const PILLARS = [
  { icon: Scale, title: 'Pressure-test the call', body: 'Decompose a real decision into its considerations, check each against live evidence, and see exactly where only you can decide. It clarifies; it never recommends from a thin signal.' },
  { icon: Brain, title: 'Your portable AI double', body: 'A Memory Web of who you are - ranked by importance, kept fresh. Export it to any AI in one tap so nothing starts from zero.' },
  { icon: Plug, title: 'Agent-native', body: 'A read-only MCP server: your own AI agents pull your live context on every call. No pasting, never stale.' },
  { icon: Radio, title: 'A daily read, not noise', body: 'A ~3-minute briefing anchored to your real priorities - and a structured feed your agents can read too.' },
];

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`mx-auto w-full max-w-5xl px-5 ${className}`}>{children}</section>;
}

export function ClarityHome() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HERO - complete above the fold, no-scroll feel */}
      <Section className="flex min-h-[88vh] flex-col items-center justify-center py-16 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
          CTRL · Clarity for leaders
        </span>
        <h1 className="mt-6 text-balance text-[2rem] font-bold leading-[1.1] tracking-tight sm:text-6xl">
          See clearly through the spaghetti.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Most leaders run a business they can&rsquo;t quite see through, with no time for a two-year transformation.
          CTRL pressure-tests your decisions against live evidence and gives your own AI agents your live context -
          so you decide with the full picture, and your fleet acts on who you are <em>right now</em>.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" className="h-12 px-7 text-base" onClick={() => navigate('/auth')}>
            Start free <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
          <Button size="lg" variant="secondary" className="h-12 px-7 text-base" onClick={() => navigate('/try')}>
            Watch it work
          </Button>
        </div>
        <p className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground/70">
          <ShieldCheck className="h-3.5 w-3.5" /> No integrations, no plugins. Just your voice.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/40">Works with</span>
          {TOOLS.map((t) => (
            <span key={t} className="text-xs font-medium text-muted-foreground/50">{t}</span>
          ))}
        </div>
      </Section>

      {/* PROBLEM */}
      <Section className="py-16">
        <div className="rounded-2xl border border-border bg-card/50 p-8 sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">The problem</p>
          <p className="mt-3 max-w-2xl text-2xl font-medium leading-snug sm:text-3xl">
            Every AI conversation starts from zero, and every big call rests on evidence you don&rsquo;t have time to chase.
          </p>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            You re-explain who you are to every tool, the output stays generic, and the decisions that actually
            matter get made on gut and a half-read newsletter. CTRL fixes both ends: it knows you, and it does the
            chasing.
          </p>
        </div>
      </Section>

      {/* PILLARS */}
      <Section className="py-8">
        <h2 className="text-center text-3xl font-bold tracking-tight">What you get</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {PILLARS.map((p) => (
            <div key={p.title} className="rounded-2xl border border-border bg-card/60 p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <p.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* AGENT-NATIVE spotlight */}
      <Section className="py-16">
        <div className="overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-b from-accent/[0.07] to-transparent p-8 text-center sm:p-12">
          <Plug className="mx-auto h-7 w-7 text-accent" />
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">Your agents, on your live mind.</h2>
          <p className="mx-auto mt-3 max-w-xl text-balance text-muted-foreground">
            Pasted context is dead context. CTRL exposes your Memory Web to your own AI agents as a read-only MCP
            server - they read your current context on every call, never a stale snapshot.
          </p>
          <Button variant="secondary" className="mt-6" onClick={() => navigate('/agents')}>
            See the agent-native side <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </Section>

      {/* CLOSING CTA */}
      <Section className="py-16 text-center">
        <GitFork className="mx-auto h-7 w-7 rotate-90 text-accent" />
        <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">Decide with the full picture.</h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">Build your double in two minutes. The call stays yours - now with the evidence laid bare.</p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" className="h-12 px-7 text-base" onClick={() => navigate('/auth')}>
            Start free <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
          <Button size="lg" variant="ghost" className="h-12 px-7 text-base" onClick={() => navigate('/pricing')}>
            See pricing
          </Button>
        </div>
        <p className="mt-12 text-xs text-muted-foreground/60">
          CTRL by Mindmaker &middot; <a href="/agents" className="underline hover:text-foreground">/agents</a> &middot;{' '}
          <a href="/try" className="underline hover:text-foreground">/try</a>
        </p>
      </Section>
    </div>
  );
}
