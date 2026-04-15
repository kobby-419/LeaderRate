import { bootstrapPage } from "../app.js";
import { createFingerprintHash, logAbuseEvent } from "../audit.js";
import { FEEDBACK_CATEGORIES } from "../constants.js";
import { getLeaderProfile, reportFeedback, submitFeedback, supportFeedback } from "../data.js";
import { escapeHtml, formatDate, ratingStars, renderStackState, showToast } from "../ui.js";

function leaderIdFromUrl() {
  return new URLSearchParams(window.location.search).get("id");
}

function updateSeoForOffice(leader) {
  const officeTitle = leader.display_name || leader.office_title || "Office Profile";
  const officeType = leader.display_name ? leader.office_title : leader.department_label || "FOSCO office";
  const summary = leader.office_summary || "View public feedback, office ratings, and visible updates on LeaderRate.";
  const description = `${officeTitle} on LeaderRate. ${summary}`.trim();

  document.title = `${officeTitle} | LeaderRate`;

  const descriptionTag = document.querySelector('meta[name="description"]');
  if (descriptionTag) {
    descriptionTag.setAttribute("content", description);
  }

  const ogTitleTag = document.querySelector('[data-dynamic-meta="og-title"]');
  if (ogTitleTag) {
    ogTitleTag.setAttribute("content", `${officeTitle} | LeaderRate`);
  }

  const ogDescriptionTag = document.querySelector('[data-dynamic-meta="og-description"]');
  if (ogDescriptionTag) {
    ogDescriptionTag.setAttribute("content", `${officeType}. ${summary}`.trim());
  }

  const twitterTitleTag = document.querySelector('[data-dynamic-meta="twitter-title"]');
  if (twitterTitleTag) {
    twitterTitleTag.setAttribute("content", `${officeTitle} | LeaderRate`);
  }

  const twitterDescriptionTag = document.querySelector('[data-dynamic-meta="twitter-description"]');
  if (twitterDescriptionTag) {
    twitterDescriptionTag.setAttribute("content", `${officeType}. ${summary}`.trim());
  }
}

function renderCategoryOptions() {
  const select = document.querySelector("[data-feedback-category]");
  if (!select) return;
  select.innerHTML = FEEDBACK_CATEGORIES.map((category) => `<option value="${category}">${category}</option>`).join("");
}

function setupRatingPicker() {
  const ratingInput = document.querySelector("[data-rating-input]");
  const ratingLabel = document.querySelector("[data-rating-label]");
  const buttons = Array.from(document.querySelectorAll("[data-rating-choice]"));
  if (!ratingInput || !buttons.length) return;

  const syncState = (value) => {
    const ratingValue = Number(value || 0);
    ratingInput.value = String(ratingValue);
    buttons.forEach((button) => {
      button.classList.toggle("active", Number(button.dataset.ratingChoice) === ratingValue);
    });

    if (ratingLabel) {
      ratingLabel.textContent = ratingValue
        ? `${ratingValue}/5 selected`
        : "Select a rating for this office.";
    }
  };

  buttons.forEach((button) => {
    if (button.dataset.ratingBound === "true") return;
    button.dataset.ratingBound = "true";
    button.addEventListener("click", () => {
      syncState(button.dataset.ratingChoice);
    });
  });

  syncState(ratingInput.value);
}

function setupMessageCounter() {
  const messageField = document.querySelector("[data-feedback-message]");
  const counter = document.querySelector("[data-feedback-counter]");
  if (!messageField || !counter) return;

  const syncCounter = () => {
    counter.textContent = `${messageField.value.length} / 500`;
  };

  if (messageField.dataset.counterBound !== "true") {
    messageField.dataset.counterBound = "true";
    messageField.addEventListener("input", syncCounter);
  }

  syncCounter();
}

function renderFeedbackAccess(profile) {
  const codenameBadge = document.querySelector("[data-feedback-codename]");
  const guestNote = document.querySelector("[data-feedback-guest-note]");
  const roleNote = document.querySelector("[data-feedback-role-note]");
  const form = document.querySelector("[data-feedback-form]");

  if (codenameBadge) {
    codenameBadge.classList.toggle("hidden", !profile || profile.role !== "student");
    codenameBadge.textContent = profile?.role === "student" ? `Posting as ${profile.codename}` : "";
  }

  guestNote?.classList.toggle("hidden", Boolean(profile));
  roleNote?.classList.toggle("hidden", !profile || profile.role === "student");
  form?.classList.toggle("hidden", profile?.role !== "student");
}

function setupFeedbackModal() {
  const modal = document.querySelector("[data-feedback-modal]");
  if (!modal) return;

  const openModal = () => {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    window.location.hash = "office-feedback";
  };

  const closeModal = () => {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    const currentUrl = new URL(window.location.href);
    if (currentUrl.hash === "#office-feedback") {
      currentUrl.hash = "";
      window.history.replaceState({}, "", currentUrl.toString());
    }
  };

  document.querySelectorAll("[data-open-feedback]").forEach((button) => {
    if (button.dataset.feedbackModalBound === "true") return;
    button.dataset.feedbackModalBound = "true";
    button.addEventListener("click", openModal);
  });

  modal.querySelectorAll("[data-close-feedback]").forEach((button) => {
    if (button.dataset.feedbackModalBound === "true") return;
    button.dataset.feedbackModalBound = "true";
    button.addEventListener("click", closeModal);
  });

  if (document.body.dataset.feedbackModalKeyBound !== "true") {
    document.body.dataset.feedbackModalKeyBound = "true";
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.classList.contains("hidden")) {
        closeModal();
      }
    });
  }

  if (window.location.hash === "#office-feedback") {
    openModal();
  }
}

function renderProjects(projects) {
  const container = document.querySelector("[data-projects-list]");
  container.innerHTML = projects.length
    ? projects.map((project) => `
        <article class="card project-card project-shell-card">
          <header class="project-shell-head">
            <div class="project-shell-title">
              <div class="project-shell-kicker">
                <span class="pill">Visible office work</span>
                <span class="badge ${project.status === "completed" ? "success" : project.status === "ongoing" ? "warning" : ""}">${escapeHtml(project.status)}</span>
              </div>
              <h3>${escapeHtml(project.title)}</h3>
              <div class="project-shell-meta">
                <span>${formatDate(project.created_at)}</span>
              </div>
            </div>
          </header>
          <p class="project-shell-copy">${escapeHtml(project.description)}</p>
        </article>
      `).join("")
    : `<div class="empty-state panel">No public office updates yet.</div>`;
}

function renderFeedback(feedback, profile) {
  const container = document.querySelector("[data-feedback-list]");
  container.innerHTML = feedback.length
    ? feedback.map((item) => `
        <article class="card feedback-card feedback-shell-card">
          <header class="feedback-shell-head">
            <div class="feedback-shell-title">
              <div class="feedback-shell-kicker">
                <span class="pill">${escapeHtml(item.category)}</span>
                <span class="feedback-shell-context">Office feedback</span>
              </div>
              <div class="feedback-shell-meta">
                <span>${escapeHtml(item.student_codename_snapshot || "anonymous_student")}</span>
                <span>${formatDate(item.created_at)}</span>
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
          <div class="feedback-shell-support" data-support-count="${item.id}">
            <strong>${item.upvotes}</strong>
            <span>supports</span>
          </div>
          ${profile?.role === "student" ? `
            <footer class="button-row feedback-shell-actions">
              <button class="btn btn-ghost" type="button" data-support="${item.id}" ${item.has_supported ? "disabled" : ""}>
                ${item.has_supported ? "Supported" : "Support issue"}
              </button>
              <button class="btn btn-ghost" type="button" data-report="${item.id}">Report abuse</button>
            </footer>
          ` : ""}
        </article>
      `).join("")
    : `<div class="empty-state panel">There is no public feedback for this office yet.</div>`;

  if (profile?.role === "student") {
    container.querySelectorAll("[data-support]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await supportFeedback(button.dataset.support, profile.id);
          await logAbuseEvent("feedback_supported", { feedbackId: button.dataset.support });
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
          await logAbuseEvent("feedback_reported", { feedbackId: button.dataset.report });
          showToast("Report sent for review.", "success");
        } catch (error) {
          showToast(error.message, "error");
        }
      });
    });
  }
}

function applyLeaderData(data, profile) {
  updateSeoForOffice(data.leader);
  document.querySelector("[data-office-title]").textContent = data.leader.display_name || data.leader.office_title;
  const modalOfficeTitle = document.querySelector("[data-feedback-office-title]");
  if (modalOfficeTitle) {
    modalOfficeTitle.textContent = data.leader.display_name || data.leader.office_title;
  }
  const officeRole = document.querySelector("[data-office-role]");
  if (officeRole) {
    const roleText = data.leader.display_name ? data.leader.office_title : data.leader.department_label || "";
    officeRole.textContent = roleText;
    officeRole.classList.toggle("hidden", !roleText);
  }
  document.querySelector("[data-office-summary]").textContent = data.leader.office_summary;
  document.querySelector("[data-office-focus]").textContent = data.leader.office_focus;
  document.querySelector("[data-approved-count]").textContent = String(data.leader.approved_feedback_count || 0);
  document.querySelector("[data-average-rating]").textContent = `${data.leader.average_rating}/5`;

  renderProjects(data.projects);
  renderFeedback(data.feedback, profile);
}

async function init() {
  const profile = await bootstrapPage({ activeNav: "leaders" });
  const leaderId = leaderIdFromUrl();
  renderCategoryOptions();
  renderStackState("[data-feedback-list]", "Loading public feedback for this office...");
  renderStackState("[data-projects-list]", "Loading office updates...");

  if (!leaderId) {
    renderStackState("[data-feedback-list]", "This office link is incomplete.");
    renderStackState("[data-projects-list]", "This office link is incomplete.");
    showToast("Office profile is missing from the URL.", "error");
    return;
  }

  try {
    const data = await getLeaderProfile(leaderId, profile?.id || null);
    applyLeaderData(data, profile);

    renderFeedbackAccess(profile);
    setupFeedbackModal();
    setupRatingPicker();
    setupMessageCounter();

    const form = document.querySelector("[data-feedback-form]");
    const submitButton = document.querySelector("[data-feedback-submit]");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!profile || profile.role !== "student") return;

      const formData = new FormData(form);
      const selectedRating = Number(formData.get("rating"));
      const message = String(formData.get("message") || "").trim();

      if (!selectedRating) {
        showToast("Select a rating before submitting.", "error");
        return;
      }

      if (message.length < 12) {
        showToast("Write a little more detail before submitting.", "error");
        return;
      }

      try {
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = "Submitting...";
        }

        const fingerprintHash = await createFingerprintHash();
        await submitFeedback({
          leader_id: leaderId,
          category: formData.get("category"),
          rating: selectedRating,
          message,
          fingerprint_hash: fingerprintHash,
        }, profile);

        await logAbuseEvent("feedback_submitted", {
          leaderId,
          category: formData.get("category"),
        });

        showToast("Feedback posted.", "success");
        form.reset();
        setupRatingPicker();
        setupMessageCounter();
        const refreshedData = await getLeaderProfile(leaderId, profile.id);
        applyLeaderData(refreshedData, profile);
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Post feedback";
        }
      }
    });
  } catch (error) {
    renderStackState("[data-feedback-list]", "This office could not be loaded right now.");
    renderStackState("[data-projects-list]", "This office could not be loaded right now.");
    showToast(error.message, "error");
  }
}

init();
