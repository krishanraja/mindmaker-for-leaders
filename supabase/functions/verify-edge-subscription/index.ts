import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";

// Webhook-independent activation fallback for Edge Pro.
//
// The frontend redirects to /dashboard?view=edge&subscription=success&session_id=...
// after a successful checkout. The webhook is the primary activation path, but a
// missed/delayed webhook would leave a paying leader unentitled. This function lets
// the client confirm the session directly (like verify-diagnostic-payment does for
// the one-time diagnostic) and activate the entitlement idempotently. It is safe to
// call repeatedly and is a strict subset of what the webhook does: it only ever
// activates a subscription the caller actually owns and paid for.

const InputSchema = z.object({
  session_id: z.string().min(1, "session_id is required"),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { session_id } = parsed.data;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await supabase.auth.getUser(token);
    const user = authData.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rl = checkRateLimit(user.id, { maxRequests: 10, windowMs: 60_000 });
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      });
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: "Stripe is not configured on the server" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["subscription"],
    });

    // Ownership: the session must belong to this user and be an Edge Pro subscription.
    if (session.metadata?.user_id !== user.id || session.metadata?.product !== "edge_pro") {
      return new Response(
        JSON.stringify({ active: false, reason: "session_not_owned_or_not_edge_pro" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const subscription = session.subscription as Stripe.Subscription | null;
    const subActive = !!subscription && ["active", "trialing", "past_due"].includes(subscription.status);
    const paid = session.status === "complete" && (session.payment_status === "paid" || subActive);

    if (!paid) {
      // Not yet paid/active. Client should keep polling briefly.
      return new Response(
        JSON.stringify({ active: false, reason: "not_paid_yet", payment_status: session.payment_status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Idempotent activation (same write the webhook performs).
    const { error } = await supabase
      .from("edge_subscriptions")
      .upsert(
        {
          user_id: user.id,
          stripe_customer_id: (session.customer as string) ?? null,
          stripe_subscription_id:
            (typeof session.subscription === "string"
              ? session.subscription
              : subscription?.id) ?? null,
          status: "active",
          current_period_start: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (error) {
      console.error("verify-edge-subscription upsert error:", error);
      throw error;
    }

    return new Response(JSON.stringify({ active: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("verify-edge-subscription error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
