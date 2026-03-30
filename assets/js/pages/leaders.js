import { bootstrapPage } from "../app.js";
import { getPublicLeaders } from "../data.js";
import { escapeHtml, ratingStars, renderStackState, showToast } from "../ui.js";

let leaders = [];

function render(list) {
  const container = document.querySelector("[data-leaders-list]");
  if (!container) return;

  if (!list.length) {
    container.innerHTML = `<div class="empty-state panel">No offices matched your search.</div>`;
    return;
  }

  container.innerHTML = list.map((leader) => `
    <article class="card leader-card">
      <div class="leader-card-top">
        <span class="pill">${escapeHtml(leader.department_label || "Office")}</span>
        <span class="leader-review-count">${leader.approved_feedback_count} reviews</span>
      </div>
      <div class="leader-card-body">
        <h3>${escapeHtml(leader.display_name || leader.office_title)}</h3>
        ${leader.display_name ? `<p class="leader-role-title">${escapeHtml(leader.office_title)}</p>` : ""}
        <p class="leader-summary">${escapeHtml(leader.office_summary)}</p>
      </div>
      <div class="leader-rating-panel">
        <span class="leader-rating-badge">${leader.average_rating}/5</span>
        <span class="stars">${ratingStars(leader.average_rating)}</span>
        <span class="leader-rating-note">${
          leader.rating_basis === "approved"
            ? "Approved public rating"
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
  const filtered = leaders.filter((leader) => {
    const searchText = [
      leader.display_name,
      leader.office_title,
      leader.department_label,
      leader.office_summary,
      leader.office_focus,
    ].filter(Boolean).join(" ").toLowerCase();
    return searchText.includes(term);
  });
  render(filtered);
}

async function init() {
  await bootstrapPage({ activeNav: "leaders" });
  renderStackState("[data-leaders-list]", "Loading leader offices...");

  try {
    leaders = await getPublicLeaders();
    render(leaders);
  } catch (error) {
    renderStackState("[data-leaders-list]", "Leader offices could not be loaded right now.");
    showToast(error.message, "error");
  }

  document.querySelector("[data-leader-search]")?.addEventListener("input", filterLeaders);
}

init();
