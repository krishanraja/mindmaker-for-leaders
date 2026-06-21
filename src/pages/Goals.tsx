import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Plus, Check, Pause, Play, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DesktopShell } from '@/components/layout/DesktopShell';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { useDevice } from '@/hooks/useDevice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useGoals } from '@/hooks/useGoals';
import {
  HORIZON_ORDER,
  HORIZON_LABELS,
  SOURCE_LABELS,
  type Goal,
  type GoalHorizon,
} from '@/types/goals';

const GOALS_SUBTITLE =
  'What you are working toward. One source of truth the rest of CTRL reads from.';

/**
 * Goals: the single source of truth for what the operator is working toward.
 * Reads/writes the unified goals table via useGoals. Active goals are grouped
 * by horizon; achieved and paused goals sit quietly below.
 *
 * Desktop renders inside the unified DesktopShell (rail + top bar) so it stays
 * cohesive with Home/Edge/Memory/Briefing; mobile keeps the AppHeader +
 * BottomNav full-screen layout.
 */
export default function GoalsPage() {
  const { isMobile } = useDevice();
  const { goals, loading, createGoal, setStatus, deleteGoal } = useGoals();
  const [title, setTitle] = useState('');
  const [horizon, setHorizon] = useState<GoalHorizon>('quarter');
  const [saving, setSaving] = useState(false);

  const active = useMemo(() => goals.filter((g) => g.status === 'active'), [goals]);
  const resting = useMemo(
    () => goals.filter((g) => g.status === 'paused' || g.status === 'achieved'),
    [goals],
  );

  const byHorizon = useMemo(() => {
    const map = new Map<GoalHorizon, Goal[]>();
    for (const h of HORIZON_ORDER) map.set(h, []);
    for (const g of active) map.get(g.horizon)?.push(g);
    return map;
  }, [active]);

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await createGoal({ title: trimmed, horizon });
      setTitle('');
    } catch {
      toast.error('Could not save that goal. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const body = (
    <div className="space-y-6">
      {/* Add a goal */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="Name a goal you are working toward"
            aria-label="New goal"
            className="flex-1"
          />
          <Button onClick={submit} disabled={!title.trim() || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="ml-1.5 hidden sm:inline">Add</span>
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {HORIZON_ORDER.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHorizon(h)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                horizon === h
                  ? 'bg-accent/10 text-accent ring-1 ring-accent/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
              )}
            >
              {HORIZON_LABELS[h]}
            </button>
          ))}
        </div>
      </div>

      {/* Active goals, grouped by horizon */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : active.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No active goals yet. Add the first one above.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {HORIZON_ORDER.map((h) => {
            const items = byHorizon.get(h) ?? [];
            if (items.length === 0) return null;
            return (
              <section key={h} className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {HORIZON_LABELS[h]}
                </h2>
                <div className="space-y-2">
                  {items.map((g) => (
                    <GoalRow
                      key={g.id}
                      goal={g}
                      onAchieve={() => setStatus(g.id, 'achieved')}
                      onPause={() => setStatus(g.id, 'paused')}
                      onDelete={() => deleteGoal(g.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Achieved / paused, quiet */}
      {resting.length > 0 && (
        <section className="space-y-2 pt-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Achieved and paused
          </h2>
          <div className="space-y-2">
            {resting.map((g) => (
              <GoalRow
                key={g.id}
                goal={g}
                resting
                onResume={() => setStatus(g.id, 'active')}
                onDelete={() => deleteGoal(g.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );

  // Desktop: unified shell (rail + top bar), cohesive with the rest of CTRL.
  if (!isMobile) {
    return (
      <DesktopShell eyebrow="Workspace" title="What you're aiming for">
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
          <div className="mx-auto w-full max-w-3xl">
            <p className="text-sm text-muted-foreground mb-6">{GOALS_SUBTITLE}</p>
            {body}
          </div>
        </div>
      </DesktopShell>
    );
  }

  // Mobile: the shared MobileFrame (persistent header + nav, content cross-fade).
  return (
    <MobileFrame scroll hideScrollbar maxWidth="max-w-3xl" padding="px-4 pb-24">
      <div className="py-4 space-y-6">
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">What you're aiming for</h1>
          </div>
          <p className="text-sm text-muted-foreground">{GOALS_SUBTITLE}</p>
        </header>
        {body}
      </div>
    </MobileFrame>
  );
}

interface GoalRowProps {
  goal: Goal;
  resting?: boolean;
  onAchieve?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onDelete?: () => void;
}

function GoalRow({ goal, resting, onAchieve, onPause, onResume, onDelete }: GoalRowProps) {
  const sourceHint = goal.source_ref ? SOURCE_LABELS[goal.source] : undefined;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'group flex items-start gap-3 rounded-xl border border-border bg-card p-3.5',
        resting && 'opacity-70',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'text-sm font-medium text-foreground',
              goal.status === 'achieved' && 'line-through text-muted-foreground',
            )}
          >
            {goal.title}
          </span>
          {goal.status === 'achieved' && (
            <Badge variant="secondary" className="text-[10px]">
              Achieved
            </Badge>
          )}
          {goal.status === 'paused' && (
            <Badge variant="outline" className="text-[10px]">
              Paused
            </Badge>
          )}
          {sourceHint && (
            <span className="text-[10px] text-muted-foreground">{sourceHint}</span>
          )}
        </div>
        {goal.detail && (
          <p className="mt-1 text-xs text-muted-foreground">{goal.detail}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {!resting && onAchieve && (
          <IconAction label="Mark achieved" onClick={onAchieve}>
            <Check className="h-4 w-4" />
          </IconAction>
        )}
        {!resting && onPause && (
          <IconAction label="Pause goal" onClick={onPause}>
            <Pause className="h-4 w-4" />
          </IconAction>
        )}
        {resting && onResume && (
          <IconAction label="Resume goal" onClick={onResume}>
            <Play className="h-4 w-4" />
          </IconAction>
        )}
        {onDelete && (
          <IconAction label="Delete goal" onClick={onDelete} destructive>
            <Trash2 className="h-4 w-4" />
          </IconAction>
        )}
      </div>
    </motion.div>
  );
}

function IconAction({
  label,
  onClick,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'rounded-md p-1.5 text-muted-foreground transition-colors',
        destructive ? 'hover:text-destructive hover:bg-destructive/10' : 'hover:text-foreground hover:bg-secondary/60',
      )}
    >
      {children}
    </button>
  );
}
