import { useState } from 'react';
import { Plug, Copy, Check, Trash2, KeyRound, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMcpTokens, MCP_ENDPOINT_URL, type MintedToken } from '@/hooks/useMcpTokens';
import { ShareWinButton } from '@/components/share/ShareWinButton';

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 shrink-0 px-2"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error('Could not copy');
        }
      }}
    >
      {done ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
      {label && <span className="ml-1.5 text-xs">{label}</span>}
    </Button>
  );
}

function relTime(iso: string | null): string {
  if (!iso) return 'never used';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'used today';
  if (days === 1) return 'used yesterday';
  return `used ${days}d ago`;
}

export function McpTokensPanel() {
  const { tokens, loading, mint, revoke } = useMcpTokens();
  const [label, setLabel] = useState('');
  const [includeBriefing, setIncludeBriefing] = useState(false);
  const [minting, setMinting] = useState(false);
  const [justMinted, setJustMinted] = useState<MintedToken | null>(null);

  const active = tokens.filter((t) => !t.revoked_at);

  async function handleMint() {
    setMinting(true);
    try {
      const m = await mint(label, includeBriefing);
      setJustMinted(m);
      setLabel('');
      setIncludeBriefing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not generate a key');
    } finally {
      setMinting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent" aria-hidden>
          <Plug className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Agent access (MCP)</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Connect your own AI agents to your live Memory Web. They pull your current context on every call - no pasting, never stale.
          </p>
        </div>
      </div>

      {/* Endpoint */}
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">MCP server URL</p>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/30 pl-3">
          <code className="min-w-0 flex-1 truncate py-2 text-xs text-foreground">{MCP_ENDPOINT_URL}</code>
          <CopyButton value={MCP_ENDPOINT_URL} />
        </div>
      </div>

      {/* Mint */}
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your keys</p>
        <div className="flex gap-2">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Name this key (e.g. My Claude agent)"
            className="h-9 text-sm"
          />
          <Button onClick={handleMint} disabled={minting} className="h-9 shrink-0">
            {minting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="mr-1 h-4 w-4" />}
            Generate
          </Button>
        </div>
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={includeBriefing}
            onChange={(e) => setIncludeBriefing(e.target.checked)}
            className="h-3.5 w-3.5 accent-accent"
          />
          Also expose today's Daily Briefing to this agent
        </label>
      </div>

      {/* Just-minted token, shown ONCE */}
      {justMinted && (
        <div className="rounded-xl border border-accent/30 bg-accent/[0.06] p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-accent">
            <AlertTriangle className="h-3.5 w-3.5" /> Copy this now - you won't see it again
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background pl-3">
            <code className="min-w-0 flex-1 truncate py-2 text-xs text-foreground">{justMinted.token}</code>
            <CopyButton value={justMinted.token} label="Copy" />
          </div>
          <button className="mt-2 text-[11px] text-muted-foreground hover:text-foreground" onClick={() => setJustMinted(null)}>
            Done
          </button>
        </div>
      )}

      {/* Active keys */}
      {loading ? (
        <div className="flex justify-center py-4 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>
      ) : active.length > 0 ? (
        <div className="space-y-2">
          {active.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-2.5">
              <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                  {t.label || 'Unnamed key'}
                  {t.scopes?.includes('briefing') && (
                    <span className="rounded border border-accent/30 bg-accent/10 px-1 py-0.5 text-[8.5px] font-semibold uppercase tracking-wider text-accent">+ briefing</span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  <code>{t.token_prefix}…</code> &middot; {relTime(t.last_used_at)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn('h-8 px-2 text-muted-foreground hover:text-destructive')}
                onClick={async () => {
                  try {
                    await revoke(t.id);
                    toast.success('Key revoked');
                  } catch {
                    toast.error('Could not revoke');
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No keys yet. Generate one and add it to your agent as a bearer token.</p>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground/80">
        In Claude, Cursor, or any MCP client, add an MCP server with the URL above and your key as the bearer token. Access is read-only and tied to your Edge Pro subscription.
      </p>

      {active.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/20 bg-accent/[0.05] p-3">
          <p className="text-xs text-muted-foreground">Your agents now read your live context. Worth a flex.</p>
          <ShareWinButton
            win={{
              title: 'My agents now read my live context',
              sub: 'live, brain-ranked - never a stale paste',
              text: 'My AI agents now pull my live context from CTRL on every call - no more pasting a snapshot that goes stale. Agent-native leadership.',
            }}
            label="Share"
          />
        </div>
      )}
    </div>
  );
}
