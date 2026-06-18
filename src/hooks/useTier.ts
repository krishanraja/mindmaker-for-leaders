import { useEdgeSubscription } from "./useEdgeSubscription";

/**
 * useTier
 *
 * Single tier resolver for the whole app. Composes useEdgeSubscription so
 * everywhere reads the same definition:
 *
 *   - 'edge_pro' when the user has an active or past_due Edge subscription
 *   - 'free'    otherwise (signed-in OR anonymous Kit session both qualify)
 *
 * Free is the unauthed-but-has-state default. Anonymous Kit students count as
 * free - their voice profile, memory web and one monthly Automator skill all
 * work without billing. Edge Pro is the only paid SKU; pricing matrix lives in
 * docs/PRICING.md.
 */

export type Tier = "free" | "edge_pro";

export interface UseTierResult {
  tier: Tier;
  isEdgePro: boolean;
  loading: boolean;
}

export function useTier(): UseTierResult {
  const subscription = useEdgeSubscription();
  const isEdgePro = subscription.hasAccess;
  return {
    tier: isEdgePro ? "edge_pro" : "free",
    isEdgePro,
    loading: subscription.isLoading,
  };
}
