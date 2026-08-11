// The Free vs Edge Pro capability matrix. Single source of truth so the Settings
// tab (EdgeProTab) and the /pricing page can never drift. Copy stays in lockstep
// with docs/PRICING.md. Edge Pro is the decision tier: the daily briefing, the
// Blind Spot, Memory and Voice are free; Pro deepens the decision engine and makes
// context portable into any agent.

export interface MatrixRow {
  label: string;
  free: string | true | false;
  pro: string | true | false;
}

export const PLAN_MATRIX: MatrixRow[] = [
  { label: 'Memory Web (read-write)', free: true, pro: true },
  { label: 'Voice profile', free: true, pro: true },
  { label: 'Blind Spot reflections', free: true, pro: true },
  { label: 'Daily personalised briefing', free: true, pro: true },
  { label: 'Decision engine (weigh + verify)', free: '3 / month', pro: 'Unlimited' },
  { label: 'Multi-model cross-examination of every decision', free: false, pro: true },
  { label: 'Decision watch (alerts when the ground shifts)', free: false, pro: true },
  { label: 'Edge artifacts (memos, docs, emails, agendas)', free: false, pro: true },
  { label: 'Live MCP pull of your skills into any AI', free: false, pro: true },
  { label: 'Email delivery of artifacts', free: false, pro: true },
];
