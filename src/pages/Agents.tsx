import { useNavigate } from 'react-router-dom';
import { Plug, ArrowRight, Lock, Clock, RefreshCw, GitFork } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MCP_URL = 'https://bkyuxvschuwngtcdhsyg.supabase.co/functions/v1/mcp-context';

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-sm font-semibold text-accent">{n}</span>
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:py-24">
        {/* Hero */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
            <Plug className="h-3.5 w-3.5" /> Agent-native
          </span>
          <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Your agents, on your live mind.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-lg leading-relaxed text-muted-foreground">
            CTRL exposes your Memory Web to your own AI agents as a read-only MCP server. They pull your current
            context on every call - no pasting, never stale.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={() => navigate('/upgrade')}>
              Get Edge Pro <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button variant="secondary" onClick={() => navigate('/auth')}>Start free</Button>
          </div>
        </div>

        {/* The problem */}
        <div className="mt-16 rounded-2xl border border-border bg-card/60 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">The problem</p>
          <p className="mt-2 text-xl font-medium leading-snug text-foreground">
            Pasted context is dead context.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            You paste a snapshot of who you are into ChatGPT or Claude, and it&rsquo;s stale the second you close the
            tab. Your agents act on yesterday&rsquo;s you. CTRL fixes that at the source: a live feed of your
            brain-ranked context, so every agent acts on who you are <em>right now</em>.
          </p>
        </div>

        {/* How it works */}
        <div className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
          <div className="mt-6 space-y-6">
            <Step n={1} title="Mint a key" body="In Settings → Edge Pro, generate a read-only key. It&rsquo;s scoped to you, revocable anytime, and shown once." />
            <Step n={2} title="Add the MCP server to your agent" body="Point any MCP client (Claude, Cursor, your own agent) at the CTRL endpoint with your key as a bearer token." />
            <Step n={3} title="Your agent pulls your live context" body="On every call, your agent reads your current objectives, blockers, patterns, and decisions - ranked by importance, contradictions resolved, stale facts aged out." />
          </div>
        </div>

        {/* Connect snippet */}
        <div className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight">Connect</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-[#0c0f13]">
            <div className="border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">MCP server</div>
            <pre className="overflow-x-auto px-4 py-3 text-xs leading-relaxed text-foreground/90"><code>{`{
  "mcpServers": {
    "ctrl": {
      "url": "${MCP_URL}",
      "headers": { "Authorization": "Bearer ctrl_mcp_••••" }
    }
  }
}`}</code></pre>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-sm font-medium text-foreground">get_leader_context</p>
              <p className="text-xs text-muted-foreground">Your live operating context.</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-sm font-medium text-foreground">get_todays_briefing</p>
              <p className="text-xs text-muted-foreground">Today&rsquo;s priorities as a feed (opt-in).</p>
            </div>
          </div>
        </div>

        {/* Guarantees */}
        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Lock, t: 'Read-only', d: 'Agents can read; they can never write or change anything.' },
            { icon: RefreshCw, t: 'Always live', d: 'Brain-ranked and fresh on every call, not a snapshot.' },
            { icon: Clock, t: 'Revocable', d: 'Kill any key instantly from Settings.' },
          ].map((g) => (
            <div key={g.t} className="rounded-xl border border-border bg-card/60 p-4">
              <g.icon className="h-5 w-5 text-accent" />
              <p className="mt-2 text-sm font-semibold text-foreground">{g.t}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{g.d}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl border border-accent/20 bg-gradient-to-b from-accent/[0.07] to-transparent p-8 text-center">
          <GitFork className="mx-auto h-6 w-6 rotate-90 text-accent" />
          <h2 className="mt-3 text-2xl font-bold tracking-tight">Give your fleet your mind.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Available on Edge Pro. Mint a key, connect your agents, and stop re-explaining yourself.
          </p>
          <Button className="mt-5" onClick={() => navigate('/upgrade')}>
            See pricing <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground/70">
          CTRL by Mindmaker &middot; <a href="/llms.txt" className="underline hover:text-foreground">llms.txt</a> &middot;{' '}
          <a href="/.well-known/product.json" className="underline hover:text-foreground">product.json</a>
        </p>
      </div>
    </div>
  );
}
