import { bootstrapPage } from "../app.js";
import { logAbuseEvent } from "../audit.js";
import { getDashboardData, getLandingStats, supportFeedback } from "../data.js";
import { escapeHtml, formatDate, ratingStars, renderStackState, showToast } from "../ui.js";

/*
 * This is the student dashboard. Leaders manage their office from the SRC
 * pages instead, so nothing office-related lives here.
 */

const PROJECT_SUPPORTS_STORAGE_KEY = "leaderrate-project-supports";

/*
 * Feedback with no office was addressed to the SRC as a whole, so there is no
 * office page to open from its card.
 */
function officeLabel(item) {
  return item.leader_id ? item.leaders?.office_title || "Office" : "Whole SRC";
}

function officeLink(item, label) {
  return item.leader_id
    ? `<a class="btn btn-outline btn-small" href="leader.html?id=${item.leader_id}">${label}</a>`
    : "";
}

function feedbackVisibilityLabel(status) {
  return status === "rejected" ? "censored" : "visible";
}

function feedbackVisibilityClass(status) {
  return status === "rejected" ? "danger" : "success";
}

function renderSliderState(target, message) {
  renderStackState(target, message, "empty-state panel");
}

function renderSlider(target, markup) {
  const node = typeof target === "string" ? document.querySelector(target) : target;
  if (!node) {
    return;
  }

  node.innerHTML = `<div class="dashboard-slider-track">${markup}</div>`;
}

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

function renderMyFeedback(items) {
  renderSlider(
    "[data-dashboard-my-feedback]",
    items.length
      ? items.map((item) => `
          <article class="card dashboard-slide-card dashboard-feedback-card">
            <header class="feedback-shell-head">
              <div class="feedback-shell-title">
                <div class="feedback-shell-kicker">
                  <span class="pill">${escapeHtml(item.category)}</span>
                  <span class="badge ${feedbackVisibilityClass(item.moderation_status)}">${feedbackVisibilityLabel(item.moderation_status)}</span>
                </div>
                <h3 class="feedback-shell-office">${escapeHtml(officeLabel(item))}</h3>
                <div class="feedback-shell-meta">
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
            <p class="dashboard-card-copy feedback-shell-message">${escapeHtml(item.message)}</p>
            <footer class="button-row feedback-shell-actions">
              ${officeLink(item, "Open office")}
            </footer>
          </article>
        `).join("")
      : `<div class="empty-state panel">You have not submitted any feedback yet.</div>`
  );
}

function renderCommunityFeedback(items, profile) {
  renderSlider(
    "[data-dashboard-community-feedback]",
    items.length
      ? items.map((item) => `
          <article class="card dashboard-slide-card dashboard-community-card dashboard-feedback-card">
            <header class="feedback-shell-head">
              <div class="feedback-shell-title">
                <div class="feedback-shell-kicker">
                  <span class="pill">${escapeHtml(officeLabel(item))}</span>
                  <span class="feedback-shell-context">${escapeHtml(item.student_codename_snapshot || "anonymous_user")}</span>
                </div>
                <div class="feedback-shell-meta">
                  <span data-feedback-support-count="${item.id}" class="feedback-shell-support">
                    <strong>${item.upvotes}</strong>
                    <span>supports</span>
                  </span>
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
            <p class="dashboard-card-copy feedback-shell-message">${escapeHtml(item.message)}</p>
            ${item.response ? `
              <div class="response-box">
                <strong>Office response</strong>
                <p>${escapeHtml(item.response.response_message)}</p>
              </div>
            ` : ""}
            <footer class="button-row feedback-shell-actions">
              ${officeLink(item, "Open office")}
              ${profile?.role === "student" ? `
                <button
                  class="btn btn-ghost btn-small"
                  type="button"
                  data-support-feedback="${item.id}"
                  ${item.has_supported ? "disabled" : ""}
                >
                  ${item.has_supported ? "Supported" : "Support"}
                </button>
              ` : ""}
            </footer>
          </article>
        `).join("")
      : `<div class="empty-state panel">Public feedback will show here when people start posting.</div>`
  );

  if (profile?.role !== "student") {
    return;
  }

  document.querySelectorAll("[data-support-feedback]").forEach((button) => {
    if (button.dataset.bound === "true") {
      return;
    }

    button.dataset.bound = "true";
    button.addEventListener("click", async () => {
      try {
        await supportFeedback(button.dataset.supportFeedback, profile.id);
        await logAbuseEvent("feedback_supported", { feedbackId: button.dataset.supportFeedback });
        button.disabled = true;
        button.textContent = "Supported";
        const countNode = document.querySelector(
          `[data-feedback-support-count="${button.dataset.supportFeedback}"]`
        );
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
}

function renderProjectCards(target, projects, profile) {
  renderSlider(
    target,
    projects.length
      ? projects.map((project) => {
          const support = getProjectSupportSnapshot(project.id, profile?.id || "");
          return `
            <article class="card dashboard-slide-card project-card project-shell-card">
              <header class="project-shell-head">
                <div class="project-shell-title">
                  <div class="project-shell-kicker">
                    <span class="pill">${escapeHtml(project.leaders?.office_title || project.office_title_snapshot || "Office")}</span>
                    <span class="badge ${project.status === "completed" ? "success" : project.status === "ongoing" ? "warning" : ""}">${escapeHtml(project.status)}</span>
                  </div>
                  <h3>${escapeHtml(project.title)}</h3>
                  <div class="project-shell-meta">
                    <span>${formatDate(project.created_at)}</span>
                  </div>
                </div>
                <div class="project-shell-support" data-project-support-count="${project.id}">
                  <strong>${support.count}</strong>
                  <span>supports</span>
                </div>
              </header>
              <p class="dashboard-card-copy project-shell-copy">${escapeHtml(project.description)}</p>
              <footer class="button-row project-shell-actions">
                <a class="btn btn-outline btn-small" href="leader.html?id=${project.leader_id}">Open office</a>
                <button class="btn btn-ghost btn-small" type="button" data-support-project="${project.id}">
                  ${support.supported ? "Supported" : "Support"}
                </button>
              </footer>
            </article>
          `;
        }).join("")
      : `<div class="empty-state panel">No updates are available right now.</div>`
  );

  document.querySelectorAll(`${target} [data-support-project]`).forEach((button) => {
    if (button.dataset.bound === "true") {
      return;
    }

    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      if (!profile?.id) {
        showToast("Log in to support updates.", "error");
        return;
      }

      const support = toggleProjectSupport(button.dataset.supportProject, profile.id);
      button.textContent = support.supported ? "Supported" : "Support";
      const countNode = button.closest(".dashboard-slide-card")?.querySelector(
        `[data-project-support-count="${button.dataset.supportProject}"]`
      );
      if (countNode) {
        countNode.innerHTML = `<strong>${support.count}</strong><span>supports</span>`;
      }
      showToast(support.supported ? "Update supported." : "Support removed.", "success");
    });
  });
}

async function init() {
  const profile = await bootstrapPage({ activeNav: "dashboard" });

  if (!profile) {
    window.location.href = "login.html";
    return;
  }

  if (profile.role === "admin") {
    window.location.href = "admin-dashboard.html";
    return;
  }

  if (profile.role === "leader") {
    window.location.href = "src-dashboard.html";
    return;
  }

  document.querySelector("[data-dashboard-codename]").textContent = profile.codename;
  renderSliderState("[data-dashboard-my-feedback]", "Loading your history...");
  renderSliderState("[data-dashboard-community-feedback]", "Loading community feedback...");
  renderSliderState("[data-dashboard-updates]", "Loading updates...");

  try {
    const [dashboardData, landingStats] = await Promise.all([
      getDashboardData(profile),
      getLandingStats(),
    ]);
    const visibleItems = dashboardData.myFeedback.filter((item) => item.moderation_status !== "rejected").length;
    const censoredItems = dashboardData.myFeedback.filter((item) => item.moderation_status === "rejected").length;

    document.querySelector("[data-dashboard-my-count]").textContent = String(dashboardData.myFeedback.length);
    document.querySelector("[data-dashboard-visible-count]").textContent = String(visibleItems);
    document.querySelector("[data-dashboard-censored-count]").textContent = String(censoredItems);
    document.querySelector("[data-dashboard-stat-leaders]").textContent = String(landingStats.leaders);
    document.querySelector("[data-dashboard-stat-feedback]").textContent = String(landingStats.approvedFeedback);
    document.querySelector("[data-dashboard-stat-projects]").textContent = String(landingStats.projects);
    document.querySelector("[data-dashboard-stat-rating]").textContent = `${landingStats.averageRating}/5`;

    renderMyFeedback(dashboardData.myFeedback);
    renderCommunityFeedback(dashboardData.communityFeedback, profile);
    renderProjectCards("[data-dashboard-updates]", dashboardData.recentProjects, profile);
  } catch (error) {
    renderSliderState("[data-dashboard-my-feedback]", "Your dashboard could not be loaded right now.");
    renderSliderState("[data-dashboard-community-feedback]", "Your dashboard could not be loaded right now.");
    renderSliderState("[data-dashboard-updates]", "Your dashboard could not be loaded right now.");
    showToast(error.message, "error");
  }
}

init();
