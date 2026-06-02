/**
 * Sample artifacts shown as blurred previews in the EdgePaywall and the
 * cycling teaser on EdgeView. Kept in a standalone module (not exported
 * from EdgePaywall.tsx) so the paywall component file only exports
 * components - keeps the react-refresh fast-refresh boundary clean.
 */
export const SAMPLE_ARTIFACTS: Record<string, string> = {
  board_memo: `## Executive Summary\n\nOur product portfolio delivered **23% revenue growth** this quarter, exceeding the board-approved target by 4 points.\n\n### Key Decisions Required\n\n- Approve $2.4M expansion into enterprise segment\n- Ratify the revised go-to-market timeline for Q4\n- Review updated risk framework for international markets`,
  strategy_doc: `## Strategic Direction: Q4 2026\n\n### Market Position\n\nWe hold **second position** in the mid-market segment with 18% share. The gap to leader has narrowed from 12 to 7 points.\n\n### Priority Initiatives\n\n1. Accelerate enterprise pipeline with dedicated BDR team\n2. Launch self-serve tier to capture SMB demand\n3. Expand partner ecosystem from 12 to 25 integrations`,
  email: `**Subject: Alignment on Q4 Priorities**\n\nHi team,\n\nFollowing our strategy review, I want to share three priorities I'd like us to rally around for Q4.\n\n1. **Customer retention** - we need to move NRR from 108% to 115%\n2. **Pipeline velocity** - cut average deal cycle from 47 to 35 days\n3. **Team capacity** - backfill the two open roles by end of October`,
  meeting_agenda: `## Leadership Team Weekly - Oct 14\n\n### Pre-read\n- Q3 financial close summary (attached)\n- Customer churn analysis draft\n\n### Agenda (60 min)\n\n1. **[10 min]** Q3 close highlights - CFO\n2. **[15 min]** Churn deep-dive and action plan - VP CS\n3. **[15 min]** Q4 hiring plan approval - VP People\n4. **[10 min]** Enterprise deal review - CRO\n5. **[10 min]** Open items and next steps`,
  template: `## Weekly Update Template\n\n**Week of:** [date]\n\n### Wins\n- [highlight 1]\n- [highlight 2]\n\n### Blockers\n- [blocker and proposed resolution]\n\n### Key Metrics\n| Metric | Target | Actual | Status |\n|--------|--------|--------|--------|\n| Pipeline | $X | $Y | On track |`,
  systemize: `## Framework: High-Trust Team Building\n\n### The 4-Layer Model\n\nBased on your demonstrated pattern of building high-performing teams, here is your instinct codified:\n\n1. **Safety First** - establish psychological safety before pushing for performance\n2. **Clarity of Ownership** - every initiative has exactly one DRI\n3. **Rhythm over Rules** - weekly standups, monthly retros, quarterly planning`,
  teach: `## Teaching Doc: Strategic Thinking\n\n### How I Approach Big-Picture Decisions\n\nWhen I face a strategic decision, I follow a pattern that has served me well:\n\n1. **Frame the decision** - write down the actual question in one sentence\n2. **Map the stakeholders** - who is affected and what do they need?\n3. **Identify the reversibility** - is this a one-way or two-way door?`,
};
