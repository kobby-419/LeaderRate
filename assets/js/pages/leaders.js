import { bootstrapPage } from "../app.js";
import { getPublicLeaders } from "../data.js";
import { escapeHtml, ratingStars, renderStackState, showToast } from "../ui.js";

let leaders = [];

function getLeaderCategory(leader) {
  return leader.department_label || leader.department_slug || "Office";
}

function renderCategoryOptions(list) {
  const select = document.querySelector("[data-leader-category]");
  if (!select) return;

  const categories = [...new Set(list.map((leader) => getLeaderCategory(leader)).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));

  select.innerHTML = `
    <option value="">All categories</option>
    ${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}
  `;
}

function render(list) {
  const container = document.querySelector("[data-leaders-list]");
  if (!container) return;

  if (!list.length) {
    container.innerHTML = `<div class="empty-state panel">No offices matched your search or filter.</div>`;
    return;
  }

  container.innerHTML = list.map((leader) => `
    <article class="card leader-card">
      <div class="leader-card-top">
        <span class="pill">${escapeHtml(getLeaderCategory(leader))}</span>
        <span class="leader-review-count">${leader.approved_feedback_count} reviews</span>
      </div>
      <div class="leader-card-body">
        <h3>${escapeHtml(leader.display_name || leader.office_title)}</h3>
        ${leader.display_name ? `<p class="leader-role-title">${escapeHtml(leader.office_title)}</p>` : ""}
        <p class="leader-summary">${escapeHtml(leader.office_summary)}</p>
      </div>
      <div class="leader-rating-panel">
        <span class="leader-rating-badge">${leader.rating_basis === "none" ? "No rating" : `${leader.average_rating}/5`}</span>
        <span class="stars">${leader.rating_basis === "none" ? "" : ratingStars(leader.average_rating)}</span>
        <span class="leader-rating-note">${
          leader.rating_basis === "approved"
            ? "Public rating"
            : leader.rating_basis === "demo"
              ? "Directory rating snapshot"
              : "No ratings yet"
        }</span>
      </div>
      <div class="leader-focus-block">
        <span class="leader-focus-label">Focus</span>
        <p class="leader-focus">${escapeHtml(leader.office_focus)}</p>
      </div>
      <footer class="button-row">
        <a class="btn btn-primary" href="leader.html?id=${leader.id}">View office profile</a>
      </footer>
    </article>
  `).join("");
}

function filterLeaders() {
  const term = String(document.querySelector("[data-leader-search]")?.value || "").toLowerCase().trim();
  const category = String(document.querySelector("[data-leader-category]")?.value || "").trim();
  const filtered = leaders.filter((leader) => {
    const matchesCategory = !category || getLeaderCategory(leader) === category;
    const searchText = [
      leader.display_name,
      leader.office_title,
      getLeaderCategory(leader),
      leader.office_summary,
      leader.office_focus,
    ].filter(Boolean).join(" ").toLowerCase();
    return matchesCategory && searchText.includes(term);
  });
  render(filtered);
}

async function init() {
  await bootstrapPage({ activeNav: "leaders" });
  renderStackState("[data-leaders-list]", "Loading offices...");

  try {
    leaders = await getPublicLeaders();
    renderCategoryOptions(leaders);
    render(leaders);
  } catch (error) {
    renderStackState("[data-leaders-list]", "Offices could not be loaded right now.");
    showToast(error.message, "error");
  }

  document.querySelector("[data-leader-search]")?.addEventListener("input", filterLeaders);
  document.querySelector("[data-leader-category]")?.addEventListener("change", filterLeaders);
}

init();
