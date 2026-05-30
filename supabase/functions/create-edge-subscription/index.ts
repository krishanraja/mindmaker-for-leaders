import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EDGE_PRO_PRICE_ID_ENV = Deno.env.get("STRIPE_EDGE_PRO_PRICE_ID");
const EDGE_PRO_PRODUCT_NAME = "Edge Pro";
const EDGE_PRO_UNIT_AMOUNT = 2900; // $29.00/month in cents (set 2026-05-30; STRIPE_EDGE_PRO_PRICE_ID secret points to the canonical $29 price). Existing $9 subscribers are grandfathered; only new checkouts use $29.
const EDGE_PRO_INTERVAL = "month" as const;

// Self-healing price lookup: if STRIPE_EDGE_PRO_PRICE_ID is not set, look up
// (or create) the "Edge Pro" product and its recurring monthly price.
async function resolveEdgeProPriceId(stripe: Stripe): Promise<string> {
  if (EDGE_PRO_PRICE_ID_ENV && EDGE_PRO_PRICE_ID_ENV.startsWith("price_")) {
    return EDGE_PRO_PRICE_ID_ENV;
  }

  // Find or create product
  const products = await stripe.products.list({ limit: 100, active: true });
  let product = products.data.find((p) => p.name === EDGE_PRO_PRODUCT_NAME);
  if (!product) {
    product = await stripe.products.create({
      name: EDGE_PRO_PRODUCT_NAME,
      description: "Full access to Edge capabilities including Custom via Voice",
    });
  }

  // Find or create recurring monthly price
  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 100,
  });
  const existing = prices.data.find(
    (p) =>
      p.recurring?.interval === EDGE_PRO_INTERVAL &&
      p.unit_amount === EDGE_PRO_UNIT_AMOUNT &&
      p.currency === "usd",
  );
  if (existing) return existing.id;

  const created = await stripe.prices.create({
    product: product.id,
    unit_amount: EDGE_PRO_UNIT_AMOUNT,
    currency: "usd",
    recurring: { interval: EDGE_PRO_INTERVAL },
    metadata: { product: "edge_pro" },
  });
  return created.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: "Stripe is not configured on the server" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    const edgeProPriceId = await resolveEdgeProPriceId(stripe);

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    // Check for existing active subscription
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: existing } = await serviceClient
      .from("edge_subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .single();

    if (existing?.status === "active") {
      return new Response(
        JSON.stringify({ error: "You already have an active Edge Pro subscription" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create Stripe Checkout session for subscription
    const origin = req.headers.get("origin") || "https://mindmaker.app";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: edgeProPriceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/dashboard?view=edge&subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard?view=edge&subscription=canceled`,
      metadata: {
        user_id: user.id,
        product: "edge_pro",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          product: "edge_pro",
        },
      },
    });

    // Upsert subscription record with stripe customer ID
    await serviceClient
      .from("edge_subscriptions")
      .upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        status: "inactive",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("create-edge-subscription error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
