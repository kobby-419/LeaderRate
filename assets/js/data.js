import { requireSupabaseClient } from "./supabase-client.js";

/*
 * This file groups database reads and writes so the page scripts stay readable.
 * The functions here are intentionally direct and explicit for beginner-friendly tracing.
 */

export async function getLandingStats() {
  const supabase = requireSupabaseClient();
  const [leadersResult, feedbackResult, projectsResult] = await Promise.all([
    supabase.from("leaders").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("feedback").select("id,rating", { count: "exact" }).eq("moderation_status", "approved"),
    supabase.from("projects").select("id", { count: "exact", head: true }),
  ]);

  if (leadersResult.error) throw leadersResult.error;
  if (feedbackResult.error) throw feedbackResult.error;
  if (projectsResult.error) throw projectsResult.error;

  const ratings = feedbackResult.data || [];
  const averageRating = ratings.length
    ? (ratings.reduce((sum, item) => sum + Number(item.rating || 0), 0) / ratings.length).toFixed(1)
    : "0.0";

  return {
    leaders: leadersResult.count || 0,
    approvedFeedback: feedbackResult.count || 0,
    projects: projectsResult.count || 0,
    averageRating,
  };
}

/*
 * Leader cards and profile pages can show either live approved feedback stats
 * or seeded demo stats from the original directory. This helper keeps that
 * decision in one place so the page scripts stay simple.
 */
function buildLeaderMetrics(leader, approvedFeedback = []) {
  const liveReviewCount = approvedFeedback.length;
  const liveAverage = liveReviewCount
    ? approvedFeedback.reduce((sum, item) => sum + Number(item.rating || 0), 0) / liveReviewCount
    : null;
  const fallbackAverage = Number(leader.demo_rating || 0);
  const fallbackCount = Number(leader.demo_review_count || 0);
  const usesLiveFeedback = liveReviewCount > 0;
  const hasFallbackSnapshot = !usesLiveFeedback && fallbackCount > 0 && fallbackAverage > 0;
  const averageRating = usesLiveFeedback ? liveAverage : fallbackAverage;
  const reviewCount = usesLiveFeedback ? liveReviewCount : fallbackCount;

  return {
    average_rating: Number.isFinite(averageRating) ? averageRating.toFixed(1) : "0.0",
    approved_feedback_count: reviewCount,
    rating_basis: usesLiveFeedback ? "approved" : hasFallbackSnapshot ? "demo" : "none",
    performance_score: Number(leader.demo_performance || 0),
  };
}

export async function getPublicLeaders() {
  const supabase = requireSupabaseClient();
  let leadersResult = await supabase
    .from("leaders")
    .select(
      "id, office_title, office_slug, display_name, department_slug, department_label, office_summary, office_focus, demo_rating, demo_review_count, demo_performance, is_active"
    )
    .eq("is_active", true)
    .order("office_order", { ascending: true });

  /*
   * Some local Supabase projects may still be on an older schema. In that case
   * we fall back to the smaller column set instead of breaking the whole page.
   */
  if (leadersResult.error && /column/i.test(leadersResult.error.message || "")) {
    leadersResult = await supabase
      .from("leaders")
      .select("id, office_title, office_slug, office_summary, office_focus, is_active")
      .eq("is_active", true)
      .order("office_order", { ascending: true });
  }

  if (leadersResult.error) throw leadersResult.error;

  const ratingData = await supabase
    .from("feedback")
    .select("leader_id, rating")
    .eq("moderation_status", "approved");

  if (ratingData.error) throw ratingData.error;

  return (leadersResult.data || []).map((leader) => {
    const matches = (ratingData.data || []).filter((item) => item.leader_id === leader.id);

    return {
      ...leader,
      ...buildLeaderMetrics(leader, matches),
    };
  });
}

export async function getLeaderProfile(leaderId) {
  const supabase = requireSupabaseClient();
  const [leaderResult, feedbackResult, responseResult, projectResult, votesResult] = await Promise.all([
    supabase.from("leaders").select("*").eq("id", leaderId).single(),
    supabase
      .from("feedback")
      .select("*")
      .eq("leader_id", leaderId)
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false }),
    supabase.from("leader_responses").select("*").eq("leader_id", leaderId),
    supabase.from("projects").select("*").eq("leader_id", leaderId).order("created_at", { ascending: false }),
    supabase.from("feedback_votes").select("feedback_id"),
  ]);

  if (leaderResult.error) throw leaderResult.error;
  if (feedbackResult.error) throw feedbackResult.error;
  if (responseResult.error) throw responseResult.error;
  if (projectResult.error) throw projectResult.error;
  if (votesResult.error) throw votesResult.error;

  const responsesByFeedbackId = new Map((responseResult.data || []).map((item) => [item.feedback_id, item]));
  const votesByFeedbackId = new Map();
  for (const vote of votesResult.data || []) {
    votesByFeedbackId.set(vote.feedback_id, (votesByFeedbackId.get(vote.feedback_id) || 0) + 1);
  }

  return {
    leader: {
      ...leaderResult.data,
      ...buildLeaderMetrics(leaderResult.data, feedbackResult.data || []),
    },
    feedback: (feedbackResult.data || []).map((item) => ({
      ...item,
      response: responsesByFeedbackId.get(item.id) || null,
      upvotes: votesByFeedbackId.get(item.id) || 0,
    })),
    projects: projectResult.data || [],
  };
}

export async function submitFeedback(payload, profile) {
  const supabase = requireSupabaseClient();
  const insertPayload = {
    institution_slug: profile.institution_slug,
    leader_id: payload.leader_id,
    student_profile_id: profile.id,
    student_codename_snapshot: profile.codename,
    category: payload.category,
    rating: payload.rating,
    message: payload.message.trim(),
    moderation_status: "pending",
    fingerprint_hash: payload.fingerprint_hash,
  };

  const { data, error } = await supabase.from("feedback").insert(insertPayload).select().single();
  if (error) throw error;
  return data;
}

export async function getPublicProjects() {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*, leaders(office_title)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPublicFeedbackFeed() {
  const supabase = requireSupabaseClient();
  const [feedbackResult, responsesResult, votesResult] = await Promise.all([
    supabase
      .from("feedback")
      .select("*, leaders(office_title)")
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false }),
    supabase.from("leader_responses").select("*"),
    supabase.from("feedback_votes").select("feedback_id"),
  ]);

  if (feedbackResult.error) throw feedbackResult.error;
  if (responsesResult.error) throw responsesResult.error;
  if (votesResult.error) throw votesResult.error;

  const responsesByFeedbackId = new Map((responsesResult.data || []).map((item) => [item.feedback_id, item]));
  const votesByFeedbackId = new Map();

  for (const vote of votesResult.data || []) {
    votesByFeedbackId.set(vote.feedback_id, (votesByFeedbackId.get(vote.feedback_id) || 0) + 1);
  }

  return (feedbackResult.data || []).map((item) => ({
    ...item,
    response: responsesByFeedbackId.get(item.id) || null,
    upvotes: votesByFeedbackId.get(item.id) || 0,
  }));
}

export async function getLeaderboardData() {
  const leaders = await getPublicLeaders();

  return leaders
    .map((leader) => ({
      ...leader,
      performance_score: Math.round(Number(leader.average_rating || 0) * 20),
    }))
    .sort((a, b) => {
      const ratingDiff = Number(b.average_rating || 0) - Number(a.average_rating || 0);
      if (ratingDiff !== 0) {
        return ratingDiff;
      }

      return Number(b.approved_feedback_count || 0) - Number(a.approved_feedback_count || 0);
    });
}

export async function getStudentDashboard(profile) {
  const supabase = requireSupabaseClient();
  const [feedbackResult, projectsResult] = await Promise.all([
    supabase.from("feedback").select("*").eq("student_profile_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("projects").select("*, leaders(office_title)").order("created_at", { ascending: false }).limit(5),
  ]);

  if (feedbackResult.error) throw feedbackResult.error;
  if (projectsResult.error) throw projectsResult.error;

  return {
    myFeedback: feedbackResult.data || [],
    recentProjects: projectsResult.data || [],
  };
}

export async function getLeaderDashboard(profile) {
  const supabase = requireSupabaseClient();
  const { data: account, error: accountError } = await supabase
    .from("leader_accounts")
    .select("leader_id, leaders(*)")
    .eq("profile_id", profile.id)
    .single();

  if (accountError) throw accountError;

  const [feedbackResult, responsesResult, projectsResult] = await Promise.all([
    supabase.from("feedback").select("*").eq("leader_id", account.leader_id).order("created_at", { ascending: false }),
    supabase.from("leader_responses").select("*").eq("leader_id", account.leader_id),
    supabase.from("projects").select("*").eq("leader_id", account.leader_id).order("created_at", { ascending: false }),
  ]);

  if (feedbackResult.error) throw feedbackResult.error;
  if (responsesResult.error) throw responsesResult.error;
  if (projectsResult.error) throw projectsResult.error;

  return {
    leaderAccount: account,
    feedback: feedbackResult.data || [],
    responses: responsesResult.data || [],
    projects: projectsResult.data || [],
  };
}

export async function saveLeaderResponse(payload) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("leader_responses")
    .upsert(payload, { onConflict: "feedback_id" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function saveProject(payload, projectId = null) {
  const supabase = requireSupabaseClient();
  const query = projectId
    ? supabase.from("projects").update(payload).eq("id", projectId)
    : supabase.from("projects").insert(payload);

  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function getAdminOverview() {
  const supabase = requireSupabaseClient();
  const [profilesResult, feedbackResult, leadersResult, logsResult] = await Promise.all([
    supabase.from("profiles").select("id, role"),
    supabase.from("feedback").select("*"),
    supabase.from("leaders").select("*").order("office_order", { ascending: true }),
    supabase.from("abuse_logs").select("*").order("created_at", { ascending: false }).limit(12),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (feedbackResult.error) throw feedbackResult.error;
  if (leadersResult.error) throw leadersResult.error;
  if (logsResult.error) throw logsResult.error;

  return {
    profiles: profilesResult.data || [],
    feedback: feedbackResult.data || [],
    leaders: leadersResult.data || [],
    logs: logsResult.data || [],
  };
}

export async function getPendingFeedback() {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("feedback")
    .select("*, leaders(office_title)")
    .eq("moderation_status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function moderateFeedback(feedbackId, payload) {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase
    .from("feedback")
    .update(payload)
    .eq("id", feedbackId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function supportFeedback(feedbackId, profileId) {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.from("feedback_votes").insert({
    feedback_id: feedbackId,
    profile_id: profileId,
  });

  if (error) throw error;
}

export async function reportFeedback(feedbackId, profileId, reason) {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.from("feedback_reports").upsert({
    feedback_id: feedbackId,
    profile_id: profileId,
    reason,
  }, { onConflict: "feedback_id,profile_id" });

  if (error) throw error;
}
