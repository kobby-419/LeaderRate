import { bootstrapPage } from "../app.js";
import { logAbuseEvent } from "../audit.js";
import { getAdminOverview } from "../data.js";
import { requireSupabaseClient } from "../supabase-client.js";
import { escapeHtml, formatDate, renderStackState, showToast } from "../ui.js";

async function init() {
  const profile = await bootstrapPage({ activeNav: "admin-dashboard", requiredRole: "admin" });
  if (!profile) return;
  renderStackState("[data-admin-leaders]", "Loading leader office records...");
  renderStackState("[data-admin-logs]", "Loading abuse logs...");

  try {
    const overview = await getAdminOverview();
    document.querySelector("[data-admin-user-count]").textContent = String(overview.profiles.length);
    document.querySelector("[data-admin-feedback-count]").textContent = String(overview.feedback.length);
    document.querySelector("[data-admin-pending-count]").textContent = String(overview.feedback.filter((item) => item.moderation_status === "pending").length);
    document.querySelector("[data-admin-approved-count]").textContent = String(overview.feedback.filter((item) => item.moderation_status === "approved").length);
    document.querySelector("[data-admin-rejected-count]").textContent = String(overview.feedback.filter((item) => item.moderation_status === "rejected").length);

    document.querySelector("[data-admin-leaders]").innerHTML = overview.leaders.length
      ? overview.leaders.map((leader) => `
          <article class="card">
            <div class="item-meta">
              <span class="pill">${escapeHtml(leader.office_title)}</span>
              <span>${escapeHtml(leader.office_slug)}</span>
            </div>
            <p>${escapeHtml(leader.office_summary)}</p>
          </article>
        `).join("")
      : `<div class="empty-state panel">No leader offices are available yet.</div>`;

    document.querySelector("[data-admin-logs]").innerHTML = overview.logs.length
      ? overview.logs.map((log) => `
          <article class="card">
            <div class="item-meta">
              <span class="badge ${log.severity === "high" ? "danger" : log.severity === "warning" ? "warning" : ""}">${escapeHtml(log.severity)}</span>
              <span>${escapeHtml(log.event_type)}</span>
              <span>${formatDate(log.created_at)}</span>
            </div>
            <p>${escapeHtml(JSON.stringify(log.metadata || {}))}</p>
          </article>
      `).join("")
      : `<div class="empty-state panel">No abuse log records are available yet.</div>`;
  } catch (error) {
    renderStackState("[data-admin-leaders]", "The admin overview could not be loaded right now.");
    renderStackState("[data-admin-logs]", "The admin overview could not be loaded right now.");
    showToast(error.message, "error");
  }

  const leaderForm = document.querySelector("[data-create-leader-form]");
  leaderForm.onsubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(leaderForm);

    try {
      const supabase = requireSupabaseClient();
      const { error } = await supabase.functions.invoke("create-leader-account", {
        body: {
          officeTitle: formData.get("officeTitle"),
          officeSlug: formData.get("officeSlug"),
          officeSummary: formData.get("officeSummary"),
          officeFocus: formData.get("officeFocus"),
          loginCodename: formData.get("loginCodename"),
          password: formData.get("password"),
        },
      });

      if (error) throw error;

      await logAbuseEvent("leader_account_created", {
        officeTitle: formData.get("officeTitle"),
      });

      leaderForm.reset();
      showToast("Leader office and login account created.", "success");
      init();
    } catch (error) {
      showToast(error.message, "error");
    }
  };
}

init();
