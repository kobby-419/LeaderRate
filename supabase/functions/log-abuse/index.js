import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/*
 * This function records server-seen request context such as forwarded IP and
 * user-agent. That makes abuse logging more honest than storing only what the
 * browser tells us directly.
 */

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables.");
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    let profile = null;

    if (token) {
      const callerAuth = await adminClient.auth.getUser(token);
      if (callerAuth.data.user) {
        const profileResult = await adminClient
          .from("profiles")
          .select("id, institution_slug")
          .eq("id", callerAuth.data.user.id)
          .single();

        if (!profileResult.error) {
          profile = profileResult.data;
        }
      }
    }

    const body = await request.json();
    const eventType = String(body.eventType || "").trim();
    const fingerprintHash = String(body.fingerprintHash || "").trim();
    const metadata = body.metadata || {};

    if (!eventType) {
      return jsonResponse({ error: "eventType is required." }, 400);
    }

    await adminClient.from("abuse_logs").insert({
      profile_id: profile?.id || null,
      institution_slug: profile?.institution_slug || null,
      event_type: eventType,
      severity: metadata.severity || "info",
      ip_address: request.headers.get("x-forwarded-for"),
      user_agent: request.headers.get("user-agent"),
      fingerprint_hash: fingerprintHash || null,
      metadata,
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ error: error.message || "Unexpected server error." }, 500);
  }
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
