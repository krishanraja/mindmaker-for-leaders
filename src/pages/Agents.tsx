import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, Lock, RefreshCw } from 'lucide-react';
import { HeroBackdrop } from '@/components/public/HeroBackdrop';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { AGENTS } from '@/components/public/publicCopy';

const MCP_URL = 'https://bkyuxvschuwngtcdhsyg.supabase.co/functions/v1/mcp-context';

// The four read-only tools the CTRL MCP server exposes, in the order an agent
// would reach for them: who you are, what today looks like, what you have
// built, and one of those things in full.
const TOOLS = [
  { name: 'get_leader_context', body: AGENTS.t1 },
  { name: 'get_todays_briefing', body: AGENTS.t2 },
  { name: 'list_skills', body: AGENTS.t3 },
  { name: 'get_skill', body: AGENTS.t4 },
];

const GUARANTEES = [
  { icon: Lock, t: 'Read-only', d: 'Agents can read. They can never write or change anything.' },
  { icon: RefreshCw, t: 'Always live', d: 'Ranked and fresh on every call, never a snapshot.' },
  { icon: Clock, t: 'Revocable', d: 'Kill any key instantly from Settings.' },
];

export default function AgentsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />

      <section className="relative overflow-hidden px-5 py-14 text-center sm:px-8 sm:py-[70px]">
        <HeroBackdrop weight="quiet" />
        <div className="relative z-10 mx-auto w-full max-w-3xl">
          <span className="inline-block rounded-full border border-accent/25 bg-accent/[0.06] px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-accent">
            {AGENTS.eyebrow}
          </span>
          <h1 className="mx-auto mt-5 max-w-[18ch] text-balance text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[44px]">
            {AGENTS.h1}
          </h1>
          <p className="mx-auto mt-4 max-w-[58ch] text-balance text-[15px] leading-[1.55] text-muted-foreground sm:text-[16.5px]">
            {AGENTS.sub}
          </p>
        </div>
      </section>

      <section className="border-t border-border px-5 py-12 sm:px-8 sm:py-[74px]">
        <div className="mx-auto w-full max-w-3xl text-center">
          <h2 className="mx-auto max-w-[28ch] text-balance text-[23px] font-extrabold leading-[1.14] tracking-[-0.025em] sm:text-[33px]">
            {AGENTS.probH}
          </h2>
          <p className="mx-auto mt-4 max-w-[58ch] text-[14.5px] leading-[1.62] text-muted-foreground sm:text-base">
            {AGENTS.probBody}
          </p>

          <div className="mx-auto mt-7 grid max-w-[620px] gap-3 sm:grid-cols-2">
            {TOOLS.map((t) => (
              <div key={t.name} className="rounded-2xl border border-border bg-card p-4 text-left">
                <code className="font-mono text-[12.5px] text-accent">{t.name}</code>
                <p className="mt-1.5 text-[13px] leading-[1.5] text-muted-foreground">{t.body}</p>
              </div>
            ))}
          </div>

          <pre className="mx-auto mt-6 max-w-[560px] overflow-x-auto rounded-2xl border border-border bg-popover p-4 text-left font-mono text-[12px] leading-[1.65] text-muted-foreground">
            <code>{`{
  "mcpServers": {
    "ctrl": {
      "url": "${MCP_URL}",
      "headers": { "Authorization": "Bearer ctrl_mcp_••••" }
    }
  }
}`}</code>
          </pre>

          <p className="mx-auto mt-4 max-w-[560px] text-left text-[12.5px] leading-relaxed text-muted-foreground/80">
            Mint a read-only key in Settings, add the server above to any MCP client, and your agent pulls your current
            context on every call.
          </p>

          <div className="mx-auto mt-6 grid max-w-[620px] gap-3 sm:grid-cols-3">
            {GUARANTEES.map((g) => (
              <div key={g.t} className="rounded-2xl border border-border bg-card/60 p-4 text-left">
                <g.icon className="h-4 w-4 text-accent" />
                <p className="mt-2 text-[13px] font-semibold text-foreground">{g.t}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{g.d}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/upgrade')}
            className="mt-8 inline-flex items-center gap-1.5 rounded-xl bg-accent px-6 py-3 text-[15px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
          >
            {AGENTS.cta} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
