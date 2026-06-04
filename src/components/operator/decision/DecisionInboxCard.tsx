import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Eye, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDecisionInbox } from '@/hooks/useDecisionInbox';

/**
 * Brings the decision engine's after-the-fact magic onto the home dashboard.
 *
 * Most of the WATCH loop's value happens while the user is not looking: it
 * re-verifies the load-bearing claims behind past decisions and raises an alert
 * when the evidence shifts. This card surfaces that quietly:
 *  - an open alert ("an assumption just changed") gets a prominent amber prompt,
 *  - otherwise, monitored decisions get a single calm line so the user knows the
 *    watching is happening at all.
 * Renders nothing when there are no decisions, so it never clutters a fresh home.
 *
 * `alertsOnly` drops the quiet "monitored" line and shows only an open alert -
 * for tight, no-scroll homes (the Memory Web view) where the loud moment is the
 * only thing worth the vertical space.
 */
export function DecisionInboxCard({ alertsOnly = false }: { alertsOnly?: boolean }) {
  const navigate = useNavigate();
  const { cases, alerts, loading } = useDecisionInbox();

  if (loading) return null;

  // The loud case: an assumption behind a past decision has moved.
  if (alerts.length > 0) {
    const a = alerts[0];
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                <Bell className="h-4 w-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground text-pretty">{a.headline}</p>
                {a.detail && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 text-pretty">{a.detail}</p>}
                <Button size="sm" className="mt-2.5" onClick={() => navigate('/decision')}>
                  Review the decision
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
              {alerts.length > 1 && <span className="text-[11px] text-amber-400 font-medium shrink-0">+{alerts.length - 1} more</span>}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (alertsOnly) return null;

  // The quiet case: nothing has changed, but show that the watching is happening.
  const monitored = cases.filter((c) => c.stage === 'complete');
  if (monitored.length === 0) return null;

  const lastChecked = monitored
    .map((c) => c.last_verified_at)
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1);

  return (
    <motion.button
      type="button"
      onClick={() => navigate('/decision')}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full text-left"
    >
      <Card className="transition-colors hover:bg-foreground/5">
        <CardContent className="p-3.5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <Eye className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {monitored.length} {monitored.length === 1 ? 'decision' : 'decisions'} monitored
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {lastChecked
                  ? `Claims re-checked ${formatDistanceToNow(new Date(lastChecked), { addSuffix: true })}`
                  : 'CTRL re-checks the evidence behind your calls'}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </CardContent>
      </Card>
    </motion.button>
  );
}
