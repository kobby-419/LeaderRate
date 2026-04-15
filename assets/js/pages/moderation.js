import { bootstrapPage } from "../app.js";
import { logAbuseEvent } from "../audit.js";
import { deleteProject, getAdminContentOverview, moderateFeedback } from "../data.js";
import { escapeHtml, formatDate, renderStackState, showToast } from "../ui.js";

async function init() {
  const profile = await bootstrapPage({ activeNav: "moderation", requiredRole: "admin" });
  if (!profile) return;
  renderStackState("[data-moderation-list]", "Loading feedback control...");
  renderStackState("[data-project-control-list]", "Loading update control...");

  try {
    const items = await getAdminContentOverview();
    const feedbackContainer = document.querySelector("[data-moderation-list]");
    const projectsContainer = document.querySelector("[data-project-control-list]");

    feedbackContainer.innerHTML = items.feedback.length
      ? items.feedback.map((item) => `
          <article class="card" data-feedback-id="${item.id}">
            <div class="item-meta">
              <span class="pill">${escapeHtml(item.leaders.office_title)}</span>
              <span>${escapeHtml(item.category)}</span>
              <span>${item.rating}/5</span>
              <span>${escapeHtml(item.student_codename_snapshot || "anonymous_student")}</span>
              <span class="badge ${item.moderation_status === "rejected" ? "danger" : "success"}">${item.moderation_status === "rejected" ? "censored" : "visible"}</span>
              <span>${formatDate(item.created_at)}</span>
            </div>
            <p>${escapeHtml(item.message)}</p>
            <footer class="button-row">
              <button class="btn ${item.moderation_status === "rejected" ? "btn-secondary" : "btn-danger"}" type="button" data-toggle-censor="${item.id}" data-next-state="${item.moderation_status === "rejected" ? "approved" : "rejected"}">
                ${item.moderation_status === "rejected" ? "Restore" : "Censor"}
              </button>
            </footer>
          </article>
        `).join("")
      : `<div class="empty-state panel">No feedback items are available right now.</div>`;

    projectsContainer.innerHTML = items.projects.length
      ? items.projects.map((project) => `
          <article class="card">
            <div class="item-meta">
              <span class="pill">${escapeHtml(project.leaders.office_title)}</span>
              <span class="badge ${project.status === "completed" ? "success" : project.status === "ongoing" ? "warning" : ""}">${escapeHtml(project.status)}</span>
              <span>${formatDate(project.created_at)}</span>
            </div>
            <h3>${escapeHtml(project.title)}</h3>
            <p>${escapeHtml(project.description)}</p>
            <footer class="button-row">
              <button class="btn btn-danger" type="button" data-delete-project="${project.id}">Delete update</button>
            </footer>
          </article>
        `).join("")
      : `<div class="empty-state panel">No updates are available right now.</div>`;

    feedbackContainer.querySelectorAll("[data-toggle-censor]").forEach((button) => {
      button.addEventListener("click", async () => {
        const feedbackId = button.dataset.toggleCensor;
        const nextState = button.dataset.nextState;
        const note = window.prompt("Optional note for internal records:") || "";

        try {
          await moderateFeedback(feedbackId, {
            moderation_status: nextState,
            moderation_note: note,
            moderated_by_profile_id: profile.id,
            moderated_at: new Date().toISOString(),
          });

          await logAbuseEvent("feedback_censorship_changed", {
            feedbackId,
            result: nextState === "rejected" ? "censored" : "restored",
          });

          showToast(nextState === "rejected" ? "Feedback censored." : "Feedback restored.", "success");
          init();
        } catch (error) {
          showToast(error.message, "error");
        }
      });
    });

    projectsContainer.querySelectorAll("[data-delete-project]").forEach((button) => {
      button.addEventListener("click", async () => {
        const confirmed = window.confirm("Delete this update from the platform?");
        if (!confirmed) {
          return;
        }

        try {
          await deleteProject(button.dataset.deleteProject);
          await logAbuseEvent("admin_project_deleted", { projectId: button.dataset.deleteProject });
          showToast("Update deleted.", "success");
          init();
        } catch (error) {
          showToast(error.message, "error");
        }
      });
    });
  } catch (error) {
    renderStackState("[data-moderation-list]", "The review queue could not be loaded right now.");
    renderStackState("[data-project-control-list]", "The review queue could not be loaded right now.");
    showToast(error.message, "error");
  }
}

init();
