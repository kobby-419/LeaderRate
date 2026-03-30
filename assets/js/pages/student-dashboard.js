import { bootstrapPage } from "../app.js";
import { getStudentDashboard } from "../data.js";
import { escapeHtml, formatDate, renderStackState, showToast } from "../ui.js";

async function init() {
  const profile = await bootstrapPage({ activeNav: "student-dashboard", requiredRole: "student" });
  if (!profile) return;
  renderStackState("[data-my-feedback]", "Loading your submissions...");
  renderStackState("[data-student-updates]", "Loading recent office updates...");

  try {
    const data = await getStudentDashboard(profile);
    const approvedCount = data.myFeedback.filter((item) => item.moderation_status === "approved").length;
    const pendingCount = data.myFeedback.filter((item) => item.moderation_status === "pending").length;
    document.querySelector("[data-student-codename]").textContent = profile.codename;
    document.querySelector("[data-student-feedback-count]").textContent = String(data.myFeedback.length);
    document.querySelector("[data-student-approved-count]").textContent = String(approvedCount);
    document.querySelector("[data-student-pending-count]").textContent = String(pendingCount);

    document.querySelector("[data-my-feedback]").innerHTML = data.myFeedback.length
      ? data.myFeedback.map((item) => `
          <article class="card student-feedback-card">
            <div class="item-meta">
              <span class="pill">${escapeHtml(item.category)}</span>
              <span>${item.rating}/5</span>
              <span class="badge ${item.moderation_status === "approved" ? "success" : item.moderation_status === "rejected" ? "danger" : "warning"}">${escapeHtml(item.moderation_status)}</span>
              <span>${formatDate(item.created_at)}</span>
            </div>
            <p class="student-feedback-message">${escapeHtml(item.message)}</p>
            <div class="student-feedback-footer">
              <span class="muted">Submitted under your codename.</span>
              <a class="btn btn-outline btn-small" href="leader.html?id=${item.leader_id}">View office</a>
            </div>
          </article>
        `).join("")
      : `<div class="empty-state panel">You have not submitted any feedback yet.</div>`;

    document.querySelector("[data-student-updates]").innerHTML = data.recentProjects.length
      ? data.recentProjects.map((project) => `
          <article class="card student-update-card">
            <div class="item-meta">
              <span class="pill">${escapeHtml(project.leaders.office_title)}</span>
              <span class="badge ${project.status === "completed" ? "success" : project.status === "ongoing" ? "warning" : ""}">${escapeHtml(project.status)}</span>
              <span>${formatDate(project.created_at)}</span>
            </div>
            <h3>${escapeHtml(project.title)}</h3>
            <p>${escapeHtml(project.description)}</p>
            <div class="button-row">
              <a class="btn btn-outline btn-small" href="leader.html?id=${project.leader_id}">Open office</a>
            </div>
          </article>
        `).join("")
      : `<div class="empty-state panel">No leader updates are available yet.</div>`;
  } catch (error) {
    renderStackState("[data-my-feedback]", "Your dashboard could not be loaded right now.");
    renderStackState("[data-student-updates]", "Your dashboard could not be loaded right now.");
    showToast(error.message, "error");
  }
}

init();
