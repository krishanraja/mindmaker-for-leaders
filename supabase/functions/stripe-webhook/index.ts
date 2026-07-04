/**
 * Stripe Webhook Handler
 * Processes Stripe payment events automatically instead of polling
 * 
 * Webhook events handled:
 * - checkout.session.completed: Unlock diagnostic or Edge Pro subscription
 * - payment_intent.succeeded: Alternative payment confirmation
 * - payment_intent.payment_failed: Handle failed payments
 * - customer.subscription.updated: Handle subscription changes
 * - customer.subscription.deleted: Handle subscription cancellation
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { forwardToWarehouse, attrFromStripeMetadata } from "../_shared/attribution-emit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const EXPECTED_PROJECT_ID = 'bkyuxvschuwngtcdhsyg';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    // Hard requirement: webhook signature verification is mandatory. Without
    // the secret, an attacker who knows the function URL can POST forged
    // checkout.session.completed payloads and grant themselves subscriptions.
    // Refuse to process - fail loud rather than silently accepting forgery.
    if (!webhookSecret) {
      console.error("❌ STRIPE_WEBHOOK_SECRET not configured - refusing to process webhook.");
      return new Response(
        JSON.stringify({ error: "webhook_not_configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error("❌ Missing stripe-signature header - refusing to process.");
      return new Response(
        JSON.stringify({ error: "missing_signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let event: Stripe.Event;
    try {
      // MUST be the async variant: Supabase's Deno runtime exposes Web Crypto as
      // async-only, so the synchronous constructEvent throws "SubtleCryptoProvider
      // cannot be used in a synchronous context" and every webhook silently fails
      // (which is why no subscription ever activated before this fix). See
      // https://github.com/stripe/stripe-node#webhook-signing (Deno note).
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err);
      return new Response(
        JSON.stringify({ error: "Webhook signature verification failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📥 Processing Stripe webhook: ${event.type} (id: ${event.id})`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseUrl.includes(EXPECTED_PROJECT_ID)) {
      throw new Error(`Database validation failed: SUPABASE_URL does not match expected project ID (${EXPECTED_PROJECT_ID})`);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Idempotency: Stripe retries webhooks for up to 3 days on transient
    // failures. Without this guard, a successful subscription would be
    // re-processed on every retry - granting duplicate access, polluting
    // the audit trail, and potentially racing the DB. Insert-on-conflict
    // is atomic; if 0 rows return, this event was already handled.
    const { data: insertedEvent, error: idempotencyError } = await supabase
      .from("stripe_events_processed")
      .insert({ event_id: event.id, event_type: event.type })
      .select("event_id")
      .maybeSingle();

    if (idempotencyError && idempotencyError.code !== "23505") {
      // Non-conflict error: log but don't block processing - failing closed
      // here would mean Stripe retries indefinitely on a transient DB blip.
      console.warn(`⚠️ Idempotency log insert failed (non-conflict): ${idempotencyError.message}`);
    } else if (!insertedEvent) {
      // Conflict (duplicate event.id): already processed.
      console.log(`↩️ Stripe event ${event.id} already processed; returning 200 no-op.`);
      return new Response(
        JSON.stringify({ received: true, already_processed: true, event_id: event.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // Route to appropriate handler based on mode
        if (session.mode === 'subscription' && session.metadata?.product === 'edge_pro') {
          await handleEdgeSubscriptionCreated(supabase, session);
        } else {
          await handleCheckoutCompleted(supabase, session);
        }
        // Emit a purchased event to the attribution warehouse (dormant until wired).
        await forwardToWarehouse({
          app: "ctrl",
          event: "purchased",
          user_id: session.metadata?.user_id,
          stripe_account: "mindmaker_llc",
          stripe_customer_id: (session.customer as string) || undefined,
          stripe_subscription_id: (session.subscription as string) || undefined,
          amount_cents: session.amount_total ?? undefined,
          currency: session.currency ?? undefined,
          metadata: { product: session.metadata?.product, upgrade_type: session.metadata?.upgrade_type },
          dedupe_key: `purchased:${event.id}`,
          ...attrFromStripeMetadata((session.metadata ?? {}) as Record<string, string>),
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription.metadata?.product === 'edge_pro') {
          await handleEdgeSubscriptionUpdated(supabase, subscription);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription.metadata?.product === 'edge_pro') {
          await handleEdgeSubscriptionDeleted(supabase, subscription);
        }
        await forwardToWarehouse({
          app: "ctrl",
          event: "churned",
          user_id: subscription.metadata?.user_id,
          stripe_account: "mindmaker_llc",
          stripe_subscription_id: subscription.id,
          dedupe_key: `churned:${event.id}`,
          ...attrFromStripeMetadata((subscription.metadata ?? {}) as Record<string, string>),
        });
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(supabase, paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(supabase, paymentIntent);
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Handle checkout.session.completed event
 * Unlocks diagnostic when payment is successful
 */
async function handleCheckoutCompleted(supabase: SupabaseClient, session: Stripe.Checkout.Session) {
  const assessmentId = session.metadata?.assessment_id;
  const userId = session.metadata?.user_id;

  if (!assessmentId) {
    console.warn('⚠️ Checkout session missing assessment_id in metadata');
    return;
  }

  if (session.payment_status !== 'paid') {
    console.log(`ℹ️ Checkout session not paid (status: ${session.payment_status})`);
    return;
  }

  console.log(`💰 Unlocking diagnostic for assessment: ${assessmentId}`);

  const { error } = await supabase
    .from('leader_assessments')
    .update({
      has_full_diagnostic: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assessmentId);

  if (error) {
    console.error('❌ Error unlocking assessment:', error);
    throw error;
  }

  console.log('✅ Diagnostic unlocked successfully via webhook');
}

/**
 * Handle payment_intent.succeeded event
 * Alternative payment confirmation method
 */
async function handlePaymentSucceeded(supabase: SupabaseClient, paymentIntent: Stripe.PaymentIntent) {
  const assessmentId = paymentIntent.metadata?.assessment_id;

  if (!assessmentId) {
    console.warn('⚠️ Payment intent missing assessment_id in metadata');
    return;
  }

  console.log(`💰 Payment succeeded for assessment: ${assessmentId}`);

  const { error } = await supabase
    .from('leader_assessments')
    .update({
      has_full_diagnostic: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assessmentId);

  if (error) {
    console.error('❌ Error unlocking assessment:', error);
    throw error;
  }

  console.log('✅ Diagnostic unlocked successfully via payment intent webhook');
}

/**
 * Handle payment_intent.payment_failed event
 * Log failed payments for analytics
 */
async function handlePaymentFailed(supabase: SupabaseClient, paymentIntent: Stripe.PaymentIntent) {
  const assessmentId = paymentIntent.metadata?.assessment_id;

  console.log(`❌ Payment failed for assessment: ${assessmentId || 'unknown'}`);

  // Could log to a payments_log table or send notification
  // For now, just log
}

// ============================================================
// Edge Pro Subscription Handlers
// ============================================================

/**
 * Handle Edge Pro subscription creation via checkout
 */
async function handleEdgeSubscriptionCreated(supabase: SupabaseClient, session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  if (!userId) {
    console.warn('⚠️ Edge subscription checkout missing user_id');
    return;
  }

  const subscriptionId = session.subscription as string;
  console.log(`🔓 Activating Edge Pro for user: ${userId}, subscription: ${subscriptionId}`);

  const { error } = await supabase
    .from('edge_subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscriptionId,
      status: 'active',
      current_period_start: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    console.error('❌ Error activating Edge subscription:', error);
    throw error;
  }

  console.log('✅ Edge Pro activated via webhook');
}

/**
 * Handle Edge Pro subscription updates (renewals, payment issues)
 */
async function handleEdgeSubscriptionUpdated(supabase: SupabaseClient, subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;
  if (!userId) {
    console.warn('⚠️ Edge subscription update missing user_id');
    return;
  }

  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'past_due',
    incomplete: 'inactive',
    incomplete_expired: 'inactive',
    trialing: 'active',
    paused: 'inactive',
  };

  const mappedStatus = statusMap[subscription.status] || 'inactive';

  const { error } = await supabase
    .from('edge_subscriptions')
    .update({
      status: mappedStatus,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('❌ Error updating Edge subscription:', error);
    throw error;
  }

  console.log(`✅ Edge subscription updated: ${mappedStatus}`);
}

/**
 * Handle Edge Pro subscription deletion
 */
async function handleEdgeSubscriptionDeleted(supabase: SupabaseClient, subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;
  if (!userId) {
    console.warn('⚠️ Edge subscription deletion missing user_id');
    return;
  }

  const { error } = await supabase
    .from('edge_subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('❌ Error canceling Edge subscription:', error);
    throw error;
  }

  console.log(`✅ Edge subscription canceled for user: ${userId}`);
}







