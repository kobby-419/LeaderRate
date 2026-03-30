import { bootstrapPage } from "../app.js";
import { logAbuseEvent } from "../audit.js";
import { getPendingFeedback, moderateFeedback } from "../data.js";
import { escapeHtml, formatDate, renderStackState, showToast } from "../ui.js";

async function init() {
  const profile = await bootstrapPage({ activeNav: "moderation", requiredRole: "admin" });
  if (!profile) return;
  renderStackState("[data-moderation-list]", "Loading the moderation queue...");

  try {
    const items = await getPendingFeedback();
    const container = document.querySelector("[data-moderation-list]");
    container.innerHTML = items.length
      ? items.map((item) => `
          <article class="card" data-feedback-id="${item.id}">
            <div class="item-meta">
              <span class="pill">${escapeHtml(item.leaders.office_title)}</span>
              <span>${escapeHtml(item.category)}</span>
              <span>${item.rating}/5</span>
              <span>${escapeHtml(item.student_codename_snapshot || "anonymous_student")}</span>
              <span>${formatDate(item.created_at)}</span>
            </div>
            <p>${escapeHtml(item.message)}</p>
            <footer class="button-row">
              <button class="btn btn-primary" type="button" data-approve="${item.id}">Approve</button>
              <button class="btn btn-danger" type="button" data-reject="${item.id}">Reject</button>
            </footer>
          </article>
        `).join("")
      : `<div class="empty-state panel">There are no pending items right now.</div>`;

    container.querySelectorAll("[data-approve], [data-reject]").forEach((button) => {
      button.addEventListener("click", async () => {
        const isApprove = Boolean(button.dataset.approve);
        const feedbackId = button.dataset.approve || button.dataset.reject;
        const note = window.prompt("Optional moderation note for internal records:") || "";

        try {
          await moderateFeedback(feedbackId, {
            moderation_status: isApprove ? "approved" : "rejected",
            moderation_note: note,
            moderated_by_profile_id: profile.id,
            moderated_at: new Date().toISOString(),
          });

          await logAbuseEvent("feedback_moderated", {
            feedbackId,
            result: isApprove ? "approved" : "rejected",
          });

          showToast(`Feedback ${isApprove ? "approved" : "rejected"}.`, "success");
          init();
        } catch (error) {
          showToast(error.message, "error");
        }
      });
    });
  } catch (error) {
    renderStackState("[data-moderation-list]", "The moderation queue could not be loaded right now.");
    showToast(error.message, "error");
  }
}

init();
