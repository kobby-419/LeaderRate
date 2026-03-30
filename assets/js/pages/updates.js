import { bootstrapPage } from "../app.js";
import { getPublicProjects } from "../data.js";
import { escapeHtml, formatDate, renderStackState, showToast } from "../ui.js";

async function init() {
  await bootstrapPage({ activeNav: "updates" });
  renderStackState("[data-updates-list]", "Loading public office updates...");

  try {
    const projects = await getPublicProjects();
    const container = document.querySelector("[data-updates-list]");

    container.innerHTML = projects.length
      ? projects.map((project) => `
          <article class="card project-card">
            <div class="item-meta">
              <span class="pill">${escapeHtml(project.leaders.office_title)}</span>
              <span class="badge ${project.status === "completed" ? "success" : project.status === "ongoing" ? "warning" : ""}">${escapeHtml(project.status)}</span>
              <span>${formatDate(project.created_at)}</span>
            </div>
            <h3>${escapeHtml(project.title)}</h3>
            <p>${escapeHtml(project.description)}</p>
          </article>
        `).join("")
      : `<div class="empty-state panel">No leader updates are published yet.</div>`;
  } catch (error) {
    renderStackState("[data-updates-list]", "Updates could not be loaded right now.");
    showToast(error.message, "error");
  }
}

init();
