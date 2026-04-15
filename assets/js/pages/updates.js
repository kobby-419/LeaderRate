import { bootstrapPage } from "../app.js";
import { getPublicProjects } from "../data.js";
import { escapeHtml, formatDate, renderStackState, showToast } from "../ui.js";

const PROJECT_SUPPORTS_STORAGE_KEY = "leaderrate-project-supports";

function readProjectSupports() {
  try {
    return JSON.parse(localStorage.getItem(PROJECT_SUPPORTS_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeProjectSupports(store) {
  localStorage.setItem(PROJECT_SUPPORTS_STORAGE_KEY, JSON.stringify(store));
}

function getProjectSupportSnapshot(projectId, actorId) {
  const store = readProjectSupports();
  const supporters = Array.isArray(store[projectId]) ? store[projectId] : [];
  return {
    count: supporters.length,
    supported: Boolean(actorId) && supporters.includes(actorId),
  };
}

function toggleProjectSupport(projectId, actorId) {
  const store = readProjectSupports();
  const supporters = new Set(Array.isArray(store[projectId]) ? store[projectId] : []);

  if (supporters.has(actorId)) {
    supporters.delete(actorId);
  } else {
    supporters.add(actorId);
  }

  store[projectId] = [...supporters];
  writeProjectSupports(store);
  return {
    count: supporters.size,
    supported: supporters.has(actorId),
  };
}

async function init() {
  const profile = await bootstrapPage({ activeNav: "updates" });
  renderStackState("[data-updates-list]", "Loading public office updates...");

  try {
    const projects = await getPublicProjects();
    const container = document.querySelector("[data-updates-list]");

    container.innerHTML = projects.length
      ? projects.map((project) => `
          <article class="card project-card project-shell-card">
            <header class="project-shell-head">
              <div class="project-shell-title">
                <div class="project-shell-kicker">
                  <span class="pill">${escapeHtml(project.leaders.office_title)}</span>
                  <span class="badge ${project.status === "completed" ? "success" : project.status === "ongoing" ? "warning" : ""}">${escapeHtml(project.status)}</span>
                </div>
                <h3>${escapeHtml(project.title)}</h3>
                <div class="project-shell-meta">
                  <span>${formatDate(project.created_at)}</span>
                </div>
              </div>
              <div class="project-shell-support" data-project-support-count="${project.id}">
                <strong>${getProjectSupportSnapshot(project.id, profile?.id || "").count}</strong>
                <span>supports</span>
              </div>
            </header>
            <p class="project-shell-copy">${escapeHtml(project.description)}</p>
            <footer class="button-row project-shell-actions">
              <a class="btn btn-outline btn-small" href="leader.html?id=${project.leader_id}">Open office</a>
              <a class="btn btn-ghost btn-small" href="leader.html?id=${project.leader_id}#office-feedback">Discuss</a>
              <button class="btn btn-primary btn-small" type="button" data-support-project="${project.id}">
                ${getProjectSupportSnapshot(project.id, profile?.id || "").supported ? "Supported" : "Support"}
              </button>
            </footer>
          </article>
        `).join("")
      : `<div class="empty-state panel">No office updates are published yet.</div>`;

    container.querySelectorAll("[data-support-project]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!profile?.id) {
          showToast("Log in to support updates.", "error");
          return;
        }

        const support = toggleProjectSupport(button.dataset.supportProject, profile.id);
        button.textContent = support.supported ? "Supported" : "Support";
        const countNode = container.querySelector(`[data-project-support-count="${button.dataset.supportProject}"]`);
        if (countNode) {
          countNode.innerHTML = `<strong>${support.count}</strong><span>supports</span>`;
        }
        showToast(support.supported ? "Update supported." : "Support removed.", "success");
      });
    });
  } catch (error) {
    renderStackState("[data-updates-list]", "Updates could not be loaded right now.");
    showToast(error.message, "error");
  }
}

init();
