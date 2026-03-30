import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/*
 * This function exists because creating Auth users requires the service role.
 * The browser should never hold that key, so admin account creation happens
 * here and only after the caller is confirmed to be an admin profile.
 */

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Missing Supabase environment variables.");
    }

    if (!token) {
      return jsonResponse({ error: "Missing authorization token." }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const callerAuth = await adminClient.auth.getUser(token);
    if (callerAuth.error || !callerAuth.data.user) {
      return jsonResponse({ error: "Unable to verify the calling user." }, 401);
    }

    const callerProfileResult = await adminClient
      .from("profiles")
      .select("id, role, institution_slug")
      .eq("id", callerAuth.data.user.id)
      .single();

    if (callerProfileResult.error || callerProfileResult.data.role !== "admin") {
      return jsonResponse({ error: "Only admin users can create leader accounts." }, 403);
    }

    const body = await request.json();
    const officeTitle = String(body.officeTitle || "").trim();
    const officeSlug = String(body.officeSlug || "").trim().toLowerCase();
    const officeSummary = String(body.officeSummary || "").trim();
    const officeFocus = String(body.officeFocus || "").trim();
    const loginCodename = String(body.loginCodename || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!officeTitle || !officeSlug || !officeSummary || !officeFocus || !loginCodename || !password) {
      return jsonResponse({ error: "All leader account fields are required." }, 400);
    }

    if (!/^[a-z0-9_]+$/.test(loginCodename)) {
      return jsonResponse({ error: "Leader login codename can only contain letters, numbers, and underscores." }, 400);
    }

    const email = `${loginCodename}@leader.${callerProfileResult.data.institution_slug}.leaderrate.local`;

    const leaderInsert = await adminClient
      .from("leaders")
      .insert({
        institution_slug: callerProfileResult.data.institution_slug,
        office_title: officeTitle,
        office_slug: officeSlug,
        office_summary: officeSummary,
        office_focus: officeFocus,
      })
      .select()
      .single();

    if (leaderInsert.error) {
      return jsonResponse({ error: leaderInsert.error.message }, 400);
    }

    const authCreate = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        codename: loginCodename,
        role: "leader",
        institution_slug: callerProfileResult.data.institution_slug,
      },
    });

    if (authCreate.error || !authCreate.data.user) {
      await adminClient.from("leaders").delete().eq("id", leaderInsert.data.id);
      return jsonResponse({ error: authCreate.error?.message || "Failed to create leader auth user." }, 400);
    }

    const accountInsert = await adminClient.from("leader_accounts").insert({
      leader_id: leaderInsert.data.id,
      profile_id: authCreate.data.user.id,
      login_codename: loginCodename,
    });

    if (accountInsert.error) {
      await adminClient.auth.admin.deleteUser(authCreate.data.user.id);
      await adminClient.from("leaders").delete().eq("id", leaderInsert.data.id);
      return jsonResponse({ error: accountInsert.error.message }, 400);
    }

    await adminClient.from("abuse_logs").insert({
      profile_id: callerProfileResult.data.id,
      institution_slug: callerProfileResult.data.institution_slug,
      event_type: "leader_account_created",
      severity: "info",
      ip_address: request.headers.get("x-forwarded-for"),
      user_agent: request.headers.get("user-agent"),
      metadata: {
        officeTitle,
        officeSlug,
        loginCodename,
      },
    });

    return jsonResponse({
      message: "Leader office and login account created.",
      leaderId: leaderInsert.data.id,
      userId: authCreate.data.user.id,
    });
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
