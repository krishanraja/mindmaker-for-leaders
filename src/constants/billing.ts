/**
 * Single source of truth for user-facing Edge Pro pricing. The Stripe price ID
 * lives in the edge-subscription edge function; this constant must match the
 * configured price on Stripe. If the Stripe price changes, update this value
 * and re-deploy - do not edit copy in individual components.
 */
export const EDGE_PRO_PRICE_USD = 29;
export const EDGE_PRO_PRICE_LABEL = `$${EDGE_PRO_PRICE_USD}/mo`;
export const EDGE_PRO_PRICE_LONG = `$${EDGE_PRO_PRICE_USD} / month`;
