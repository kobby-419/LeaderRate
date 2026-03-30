import { bootstrapPage } from "../app.js";
import { logAbuseEvent } from "../audit.js";
import { PROJECT_STATUSES } from "../constants.js";
import { getLeaderDashboard, saveLeaderResponse, saveProject } from "../data.js";
import { escapeHtml, formatDate, renderStackState, showToast } from "../ui.js";

let leaderContext = null;
let editingProjectId = null;

function renderStatusOptions() {
  const select = document.querySelector("[data-project-status]");
  select.innerHTML = PROJECT_STATUSES.map((status) => `<option value="${status}">${status}</option>`).join("");
}

function renderProjects(projects) {
  const container = document.querySelector("[data-leader-projects]");
  container.innerHTML = projects.length
    ? projects.map((project) => `
        <article class="card">
          <div class="item-meta">
            <span class="badge ${project.status === "completed" ? "success" : project.status === "ongoing" ? "warning" : ""}">${escapeHtml(project.status)}</span>
            <span>${formatDate(project.created_at)}</span>
          </div>
          <h3>${escapeHtml(project.title)}</h3>
          <p>${escapeHtml(project.description)}</p>
          <footer class="button-row">
            <button class="btn btn-ghost" type="button" data-edit-project="${project.id}">Edit update</button>
          </footer>
        </article>
      `).join("")
    : `<div class="empty-state panel">No office updates have been posted yet.</div>`;

  container.querySelectorAll("[data-edit-project]").forEach((button) => {
    button.addEventListener("click", () => {
      const project = leaderContext.projects.find((item) => item.id === button.dataset.editProject);
      if (!project) return;
      editingProjectId = project.id;
      document.querySelector("[data-project-title]").value = project.title;
      document.querySelector("[data-project-description]").value = project.description;
      document.querySelector("[data-project-status]").value = project.status;
      document.querySelector("[data-project-submit]").textContent = "Save changes";
    });
  });
}

function renderFeedback(feedback, responses, leaderAccount, profile) {
  const responsesByFeedbackId = new Map(responses.map((response) => [response.feedback_id, response]));
  const container = document.querySelector("[data-leader-feedback]");

  container.innerHTML = feedback.length
    ? feedback.map((item) => `
        <article class="card">
          <div class="item-meta">
            <span class="pill">${escapeHtml(item.category)}</span>
            <span>${item.rating}/5</span>
            <span class="badge ${item.moderation_status === "approved" ? "success" : item.moderation_status === "rejected" ? "danger" : "warning"}">${escapeHtml(item.moderation_status)}</span>
            <span>${formatDate(item.created_at)}</span>
            <span>${escapeHtml(item.student_codename_snapshot || "anonymous_student")}</span>
          </div>
          <p>${escapeHtml(item.message)}</p>
          ${responsesByFeedbackId.get(item.id) ? `
            <div class="response-box">
              <strong>Your public response</strong>
              <p>${escapeHtml(responsesByFeedbackId.get(item.id).response_message)}</p>
            </div>
          ` : ""}
          ${item.moderation_status === "approved" ? `
            <footer class="button-row">
              <button class="btn btn-ghost" type="button" data-respond="${item.id}">Post response</button>
            </footer>
          ` : ""}
        </article>
      `).join("")
    : `<div class="empty-state panel">Your office has no feedback yet.</div>`;

  container.querySelectorAll("[data-respond]").forEach((button) => {
    button.addEventListener("click", async () => {
      const responseMessage = window.prompt("Write a calm public response for students.");
      if (!responseMessage) return;

      try {
        await saveLeaderResponse({
          feedback_id: button.dataset.respond,
          leader_id: leaderAccount.leader_id,
          leader_profile_id: profile.id,
          author_codename_snapshot: profile.codename,
          response_message: responseMessage,
        });

        await logAbuseEvent("leader_response_posted", {
          feedbackId: button.dataset.respond,
          leaderId: leaderAccount.leader_id,
        });

        showToast("Public response saved.", "success");
        init();
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
}

async function init() {
  const profile = await bootstrapPage({ activeNav: "leader-dashboard", requiredRole: "leader" });
  if (!profile) return;

  renderStatusOptions();
  renderStackState("[data-leader-projects]", "Loading your office updates...");
  renderStackState("[data-leader-feedback]", "Loading your office feedback...");

  try {
    leaderContext = await getLeaderDashboard(profile);
    document.querySelector("[data-leader-office]").textContent = leaderContext.leaderAccount.leaders.office_title;
    document.querySelector("[data-leader-feedback-count]").textContent = String(leaderContext.feedback.length);
    document.querySelector("[data-leader-approved-count]").textContent = String(leaderContext.feedback.filter((item) => item.moderation_status === "approved").length);
    const averageRating = leaderContext.feedback.filter((item) => item.moderation_status === "approved");
    document.querySelector("[data-leader-average-rating]").textContent = averageRating.length
      ? `${(averageRating.reduce((sum, item) => sum + Number(item.rating || 0), 0) / averageRating.length).toFixed(1)}/5`
      : "0.0/5";

    renderProjects(leaderContext.projects);
    renderFeedback(leaderContext.feedback, leaderContext.responses, leaderContext.leaderAccount, profile);
  } catch (error) {
    renderStackState("[data-leader-projects]", "Your leader dashboard could not be loaded right now.");
    renderStackState("[data-leader-feedback]", "Your leader dashboard could not be loaded right now.");
    showToast(error.message, "error");
  }

  const form = document.querySelector("[data-project-form]");
  form.onsubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(form);

    try {
      await saveProject({
        leader_id: leaderContext.leaderAccount.leader_id,
        leader_profile_id: profile.id,
        office_title_snapshot: leaderContext.leaderAccount.leaders.office_title,
        title: formData.get("title"),
        description: formData.get("description"),
        status: formData.get("status"),
      }, editingProjectId);

      await logAbuseEvent(editingProjectId ? "leader_project_updated" : "leader_project_created", {
        leaderId: leaderContext.leaderAccount.leader_id,
      });

      editingProjectId = null;
      form.reset();
      document.querySelector("[data-project-submit]").textContent = "Post update";
      showToast("Project update saved.", "success");
      init();
    } catch (error) {
      showToast(error.message, "error");
    }
  };
}

init();
