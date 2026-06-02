import { EDGE_PRO_UNIT_AMOUNT_CENTS } from "../../supabase/functions/_shared/edge-pricing";

/**
 * Client-side display values for Edge Pro pricing. Derived from the canonical
 * cents value in supabase/functions/_shared/edge-pricing.ts so the UI and the
 * Stripe checkout creator can never drift.
 */
export const EDGE_PRO_PRICE_USD = EDGE_PRO_UNIT_AMOUNT_CENTS / 100;
export const EDGE_PRO_PRICE_LABEL = `$${EDGE_PRO_PRICE_USD}/mo`;
export const EDGE_PRO_PRICE_LONG = `$${EDGE_PRO_PRICE_USD} / month`;
