// Single source of truth for Edge Pro pricing.
//
// Stripe wants cents, the UI wants dollars. This file is the canonical value
// for both. It is imported by:
//   - supabase/functions/create-edge-subscription/index.ts (server-side, Deno)
//   - src/constants/billing.ts                              (client-side, Vite)
//
// Plain TypeScript constants only - keep this file free of Deno or Node-only
// imports so both runtimes can read it.

export const EDGE_PRO_UNIT_AMOUNT_CENTS = 4900;
export const EDGE_PRO_CURRENCY = "usd" as const;
export const EDGE_PRO_INTERVAL = "month" as const;
