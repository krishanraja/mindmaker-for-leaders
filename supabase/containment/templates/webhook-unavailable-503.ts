const corsHeaders = Object.freeze({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-signature, svix-timestamp",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
});

const jsonHeaders = Object.freeze({
  ...corsHeaders,
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Retry-After": "3600",
  "X-Content-Type-Options": "nosniff",
});

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      ok: false,
      error: "Webhook processing is temporarily unavailable.",
      code: "containment_active",
      retryable: true,
    }),
    { status: 503, headers: jsonHeaders },
  );
});
