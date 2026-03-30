import { bootstrapPage } from "../app.js";
import { logAbuseEvent } from "../audit.js";
import { getPublicFeedbackFeed, reportFeedback, supportFeedback } from "../data.js";
import { escapeHtml, formatRelativeDate, ratingStars, renderStackState, showToast } from "../ui.js";

function renderFeedbackItems(items, profile) {
  const container = document.querySelector("[data-feedback-feed]");

  if (!items.length) {
    container.innerHTML = `<div class="card empty-state">No approved public feedback is available yet.</div>`;
    return;
  }

  container.innerHTML = items.map((item) => `
    <article class="card feedback-item-card">
      <div class="item-meta">
        <span class="pill">${escapeHtml(item.category)}</span>
        <span>${escapeHtml(item.leaders?.office_title || "Office")}</span>
        <span class="rating">${item.rating}/5</span>
        <span class="stars">${ratingStars(item.rating)}</span>
        <span>${escapeHtml(item.student_codename_snapshot)}</span>
        <span>${formatRelativeDate(item.created_at)}</span>
      </div>
      <p>${escapeHtml(item.message)}</p>
      ${item.response ? `
        <div class="response-box">
          <strong>Leader response</strong>
          <p>${escapeHtml(item.response.response_message)}</p>
        </div>
      ` : ""}
      <footer class="feedback-item-footer">
        <span class="muted">${item.upvotes} supports</span>
        <div class="button-row">
          <a class="btn btn-outline btn-small" href="leader.html?id=${item.leader_id}">View office</a>
          <a class="btn btn-primary btn-small" href="leader.html?id=${item.leader_id}#office-feedback">Add your feedback</a>
          ${profile?.role === "student" ? `
            <button class="btn btn-outline btn-small" type="button" data-support="${item.id}">Support</button>
            <button class="btn btn-outline btn-small" type="button" data-report="${item.id}">Report</button>
          ` : ""}
        </div>
      </footer>
    </article>
  `).join("");

  if (profile?.role === "student") {
    container.querySelectorAll("[data-support]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await supportFeedback(button.dataset.support, profile.id);
          await logAbuseEvent("feedback_supported", { feedbackId: button.dataset.support, source: "feedback_feed" });
          showToast("Support recorded.", "success");
        } catch (error) {
          showToast(error.message, "error");
        }
      });
    });

    container.querySelectorAll("[data-report]").forEach((button) => {
      button.addEventListener("click", async () => {
        const reason = window.prompt("Why should this feedback be reviewed?");
        if (!reason) return;

        try {
          await reportFeedback(button.dataset.report, profile.id, reason);
          await logAbuseEvent("feedback_reported", { feedbackId: button.dataset.report, source: "feedback_feed" });
          showToast("Report sent to moderation.", "success");
        } catch (error) {
          showToast(error.message, "error");
        }
      });
    });
  }
}

async function init() {
  const profile = await bootstrapPage({ activeNav: "feedback" });
  renderStackState("[data-feedback-feed]", "Loading approved public feedback...");

  try {
    const items = await getPublicFeedbackFeed();
    renderFeedbackItems(items, profile);
  } catch (error) {
    renderStackState("[data-feedback-feed]", "Public feedback could not be loaded right now.");
    showToast(error.message, "error");
  }
}

init();
