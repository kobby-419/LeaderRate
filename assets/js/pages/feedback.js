import { bootstrapPage } from "../app.js";
import { logAbuseEvent } from "../audit.js";
import { getPublicFeedbackFeed, reportFeedback, supportFeedback } from "../data.js";
import { escapeHtml, formatRelativeDate, ratingStars, renderStackState, showToast } from "../ui.js";

function renderFeedbackItems(items, profile) {
  const container = document.querySelector("[data-feedback-feed]");

  if (!items.length) {
    container.innerHTML = `<div class="card empty-state">No public feedback is available yet.</div>`;
    return;
  }

  container.innerHTML = items.map((item) => `
    <article class="card feedback-item-card feedback-shell-card">
      <header class="feedback-shell-head">
        <div class="feedback-shell-title">
          <div class="feedback-shell-kicker">
            <span class="pill">${escapeHtml(item.category)}</span>
            <span class="feedback-shell-context">Public post</span>
          </div>
          <h2 class="feedback-shell-office">${escapeHtml(item.leaders?.office_title || "Office")}</h2>
          <div class="feedback-shell-meta">
            <span>${escapeHtml(item.student_codename_snapshot)}</span>
            <span>${formatRelativeDate(item.created_at)}</span>
          </div>
        </div>
        <div class="feedback-shell-rating">
          <div class="feedback-shell-score">
            <strong>${item.rating}</strong>
            <span>/5</span>
          </div>
          <span class="stars">${ratingStars(item.rating)}</span>
        </div>
      </header>
      <p class="feedback-shell-message">${escapeHtml(item.message)}</p>
      ${item.response ? `
        <div class="response-box">
          <strong>Office response</strong>
          <p>${escapeHtml(item.response.response_message)}</p>
        </div>
      ` : ""}
      <footer class="feedback-item-footer feedback-shell-footer">
        <div class="feedback-shell-support" data-support-count="${item.id}">
          <strong>${item.upvotes}</strong>
          <span>supports</span>
        </div>
        <div class="button-row feedback-shell-actions">
          <a class="btn btn-outline btn-small" href="leader.html?id=${item.leader_id}">View office</a>
          <a class="btn btn-primary btn-small" href="leader.html?id=${item.leader_id}#office-feedback">Add your feedback</a>
          ${profile?.role === "student" ? `
            <button class="btn btn-outline btn-small" type="button" data-support="${item.id}" ${item.has_supported ? "disabled" : ""}>
              ${item.has_supported ? "Supported" : "Support"}
            </button>
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
          button.disabled = true;
          button.textContent = "Supported";
          const countNode = container.querySelector(`[data-support-count="${button.dataset.support}"]`);
          if (countNode) {
            const currentCount = Number.parseInt(countNode.textContent, 10) || 0;
            countNode.innerHTML = `<strong>${currentCount + 1}</strong><span>supports</span>`;
          }
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
          showToast("Report sent for review.", "success");
        } catch (error) {
          showToast(error.message, "error");
        }
      });
    });
  }
}

async function init() {
  const profile = await bootstrapPage({ activeNav: "feedback" });
  renderStackState("[data-feedback-feed]", "Loading public feedback...");

  try {
    const items = await getPublicFeedbackFeed(profile?.id || null);
    renderFeedbackItems(items, profile);
  } catch (error) {
    renderStackState("[data-feedback-feed]", "Public feedback could not be loaded right now.");
    showToast(error.message, "error");
  }
}

init();
