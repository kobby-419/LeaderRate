import { bootstrapPage } from "../app.js";
import { logAbuseEvent } from "../audit.js";
import { FEEDBACK_CATEGORIES } from "../constants.js";
import { getPublicFeedbackFeed, reportFeedback, submitFeedback, supportFeedback } from "../data.js";
import { escapeHtml, formatRelativeDate, ratingStars, renderStackState, showToast } from "../ui.js";

const MESSAGE_LIMIT = 1000;

/*
 * Feedback with no office is addressed to the SRC as a body, so it has no
 * office page to link back to and is labelled differently in the stream.
 */
function isGeneral(item) {
  return !item.leader_id;
}

function officeLabel(item) {
  return isGeneral(item) ? "Whole SRC" : item.leaders?.office_title || "Office";
}

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
            <span class="feedback-shell-context">${isGeneral(item) ? "To the whole SRC" : "Public post"}</span>
          </div>
          <h2 class="feedback-shell-office">${escapeHtml(officeLabel(item))}</h2>
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
          ${isGeneral(item) ? "" : `
            <a class="btn btn-outline btn-small" href="leader.html?id=${item.leader_id}">View office</a>
            <a class="btn btn-primary btn-small" href="leader.html?id=${item.leader_id}#office-feedback">Add your feedback</a>
          `}
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

/*
 * Only students can post. Leaders and admins read the same stream but answer
 * from their own workspaces, so the composer stays hidden for them.
 */
function setupGeneralFeedbackForm(profile, onPosted) {
  const panel = document.querySelector("[data-general-feedback-panel]");
  const form = document.querySelector("[data-general-feedback-form]");
  if (!panel || !form || profile?.role !== "student") {
    return;
  }

  panel.classList.remove("hidden");

  const categorySelect = form.querySelector("[data-general-category]");
  if (categorySelect) {
    categorySelect.innerHTML = FEEDBACK_CATEGORIES
      .map((category) => `<option value="${category}">${category}</option>`)
      .join("");
  }

  const messageNode = form.querySelector("[name='message']");
  const counter = form.querySelector("[data-general-counter]");
  messageNode?.addEventListener("input", () => {
    if (counter) {
      counter.textContent = `${messageNode.value.length} / ${MESSAGE_LIMIT}`;
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const submitButton = form.querySelector("[data-general-submit]");
    const message = String(formData.get("message") || "").trim();

    if (!message) {
      showToast("Write your feedback before sending.", "error");
      return;
    }

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sending...";
      }

      await submitFeedback({
        /* No office: this is addressed to the SRC as a whole. */
        leader_id: null,
        category: formData.get("category"),
        rating: Number(formData.get("rating")),
        message,
      }, profile);

      await logAbuseEvent("feedback_submitted", { general: true });
      showToast("Sent to the SRC.", "success");
      form.reset();
      if (counter) {
        counter.textContent = `0 / ${MESSAGE_LIMIT}`;
      }
      await onPosted();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Send to the SRC";
      }
    }
  });
}

async function init() {
  const profile = await bootstrapPage({ activeNav: "feedback" });
  renderStackState("[data-feedback-feed]", "Loading public feedback...");

  const loadFeed = async () => {
    const items = await getPublicFeedbackFeed(profile?.id || null);
    renderFeedbackItems(items, profile);
  };

  setupGeneralFeedbackForm(profile, loadFeed);

  try {
    await loadFeed();
  } catch (error) {
    renderStackState("[data-feedback-feed]", "Public feedback could not be loaded right now.");
    showToast(error.message, "error");
  }
}

init();
