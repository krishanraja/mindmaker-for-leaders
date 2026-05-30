import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, RATE_LIMITS } from '../_shared/rate-limit.ts';
import { checkRateLimit as checkBurstLimit } from "../_shared/rateLimit.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const InputSchema = z.object({
  assessment_id: z.string().min(1, "assessment_id is required"),
  upgrade_type: z.enum(["full_diagnostic", "deep_context", "bundle"]).default("full_diagnostic"),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Clamp attribution to Stripe metadata limits (<=50 keys, <=500 chars/value).
function sanitizeAttr(obj: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  let n = 0;
  for (const [k, v] of Object.entries(obj || {})) {
    if (n >= 40) break;
    if (v == null) continue;
    out[String(k).slice(0, 40)] = String(v).slice(0, 480);
    n++;
  }
  return out;
}

const DIAGNOSTIC_PRICE_ID = "price_1TctCeHGqJqsGEJL1gQZsmQ9"; // $49 Full Diagnostic (provisioned 2026-05-30; replaces stale $15 price_1THBLw)
const DEEP_CONTEXT_PRICE_ID = "price_1SojAqHGqJqsGEJLDEd6BqMG"; // $29 Deep Context (verified live in Stripe)
const BUNDLE_PRICE_ID = "price_1SojArHGqJqsGEJLtmmGW7p3"; // $69 Bundle (verified live in Stripe)

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    
    // Validate we're using the correct database (Mindmaker AI, ID: bkyuxvschuwngtcdhsyg)
    const EXPECTED_PROJECT_ID = 'bkyuxvschuwngtcdhsyg';
    if (!supabaseUrl || !supabaseUrl.includes(EXPECTED_PROJECT_ID)) {
      const error = `Database validation failed: SUPABASE_URL does not match expected project ID (${EXPECTED_PROJECT_ID}). Current: ${supabaseUrl}`;
      console.error('❌', error);
      return new Response(
        JSON.stringify({ error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`✅ Database validated: Using Mindmaker AI (${EXPECTED_PROJECT_ID})`);
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    // Authenticate user first to get actual user ID for rate limiting
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await supabaseClient.auth.getUser(token);
    const user = authData.user;
    
    if (!user?.id) {
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Burst rate limiting: 5 requests per minute (payment endpoints)
    const burstLimitResult = checkBurstLimit(user.id, { maxRequests: 5, windowMs: 60_000 });
    if (!burstLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((burstLimitResult.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    // Rate limiting: 10 payment sessions per hour per user (using actual user ID)
    const requestBody = await req.json();
    const attribution = sanitizeAttr((requestBody && requestBody.attribution) || {});
    const parsed = InputSchema.safeParse(requestBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = user.id; // Use actual user ID from authentication
    
    // Initialize Supabase client with service role for rate limiting
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseForRateLimit = createClient(supabaseUrl, supabaseServiceKey);
    
    // Database-backed rate limiting
    const rateLimitResult = await checkRateLimit(
      RATE_LIMITS.PAYMENT_CREATE,
      userId,
      supabaseForRateLimit
    );
    
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: rateLimitResult.error || `Rate limit exceeded. Maximum ${RATE_LIMITS.PAYMENT_CREATE.maxRequests} payment sessions per hour. Please try again later.`
        }),
        { 
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000))
          } 
        }
      );
    }

    console.log('💳 Creating payment session');

    const { assessment_id, upgrade_type } = parsed.data;
    
    // Determine price ID based on upgrade type
    let priceId: string;
    let upgradeDescription: string;
    
    if (upgrade_type === 'deep_context') {
      priceId = DEEP_CONTEXT_PRICE_ID;
      upgradeDescription = 'Deep Context';
    } else if (upgrade_type === 'bundle') {
      priceId = BUNDLE_PRICE_ID;
      upgradeDescription = 'Full Diagnostic + Deep Context';
    } else {
      priceId = DIAGNOSTIC_PRICE_ID;
      upgradeDescription = 'Full Diagnostic';
    }
    
    console.log(`💳 Creating ${upgradeDescription} payment session`);
    
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }

    console.log('✅ User authenticated:', user.email);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log('✅ Found existing customer:', customerId);
    } else {
      console.log('➕ Creating new customer');
    }

    // Create one-time payment session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/?payment=success&assessment_id=${assessment_id}`,
      cancel_url: `${req.headers.get("origin")}/?payment=canceled`,
      metadata: {
        assessment_id,
        user_id: user.id,
        upgrade_type: upgrade_type,
        ...attribution,
      },
      payment_intent_data: {
        metadata: {
          assessment_id,
          user_id: user.id,
          upgrade_type: upgrade_type,
          ...attribution,
        },
      },
    });

    console.log('✅ Payment session created:', session.id);

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('❌ Payment session error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
