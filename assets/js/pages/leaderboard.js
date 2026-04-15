import { bootstrapPage } from "../app.js";
import { getLeaderboardData } from "../data.js";
import { escapeHtml, ratingStars, renderStackState, renderTableState, showToast } from "../ui.js";

let currentSort = "rating";
let leaderboardEntries = [];

function renderStats(leaders) {
  const totalReviews = leaders.reduce((sum, leader) => sum + Number(leader.approved_feedback_count || 0), 0);
  const averageRating = leaders.length
    ? (leaders.reduce((sum, leader) => sum + Number(leader.average_rating || 0), 0) / leaders.length).toFixed(1)
    : "0.0";

  document.querySelector("[data-total-leaders]").textContent = String(leaders.length);
  document.querySelector("[data-total-reviews]").textContent = String(totalReviews);
  document.querySelector("[data-average-rating]").textContent = `${averageRating}/5`;
}

function sortLeaders(list) {
  return [...list].sort((left, right) => {
    if (currentSort === "reviews") {
      return Number(right.approved_feedback_count || 0) - Number(left.approved_feedback_count || 0)
        || Number(right.average_rating || 0) - Number(left.average_rating || 0);
    }

    if (currentSort === "performance") {
      return Number(right.performance_score || 0) - Number(left.performance_score || 0)
        || Number(right.average_rating || 0) - Number(left.average_rating || 0);
    }

    return Number(right.average_rating || 0) - Number(left.average_rating || 0)
      || Number(right.approved_feedback_count || 0) - Number(left.approved_feedback_count || 0);
  });
}

function rankLabel(index) {
  if (index === 0) return "\uD83E\uDD47 Rank 1";
  if (index === 1) return "\uD83E\uDD48 Rank 2";
  if (index === 2) return "\uD83E\uDD49 Rank 3";
  return `Rank ${index + 1}`;
}

function renderTopPerformers(leaders) {
  const container = document.querySelector("[data-top-performers]");
  const topThree = leaders
    .filter((leader) => Number(leader.approved_feedback_count || 0) > 0 || leader.rating_basis === "demo")
    .slice(0, 3);

  if (!topThree.length) {
    renderStackState(container, "No public reviews are available yet.");
    return;
  }

  container.innerHTML = topThree.map((leader, index) => `
    <article class="card performer-card">
      <header class="performer-head">
        <div class="performer-heading">
          <div class="item-meta">
            <span class="pill">${rankLabel(index)}</span>
            <span class="performer-department">${escapeHtml(leader.department_label || "Office")}</span>
          </div>
          <div class="leader-name">
            <h3>${escapeHtml(leader.display_name || leader.office_title)}</h3>
            <div class="performer-role">${escapeHtml(leader.office_title)}</div>
          </div>
        </div>
        <div class="performer-rating">
          <strong>${escapeHtml(leader.average_rating)}</strong>
          <span>/5</span>
          <div class="stars">${ratingStars(leader.average_rating)}</div>
        </div>
      </header>
      <p class="performer-summary">${escapeHtml(leader.office_summary)}</p>
      <div class="performer-stats">
        <span>${leader.approved_feedback_count} reviews</span>
        <span>${leader.performance_score}% score</span>
        <span>${leader.rating_basis === "demo" ? "Snapshot rating" : "Live public rating"}</span>
      </div>
      <div class="button-row">
        <a class="btn btn-outline" href="leader.html?id=${leader.id}">View office</a>
      </div>
    </article>
  `).join("");
}

function renderTable(leaders) {
  const tbody = document.querySelector("[data-leaderboard-body]");
  if (!leaders.length) {
    renderTableState(tbody, 7, "No public reviews are available yet.");
    return;
  }

  tbody.innerHTML = leaders.map((leader, index) => `
    <tr>
      <td data-label="Rank"><span class="leaderboard-rank">${index < 3 ? "\uD83C\uDFC6" : ""} ${index + 1}</span></td>
      <td data-label="Office">
        <div class="leader-name">
          <strong>${escapeHtml(leader.display_name || leader.office_title)}</strong>
          <div class="leader-role">${escapeHtml(leader.office_title)}</div>
          <div class="muted">${escapeHtml(leader.office_focus)}</div>
        </div>
      </td>
      <td data-label="Department">${escapeHtml(leader.department_label || "Office")}</td>
      <td class="leader-rating-cell" data-label="Rating">
        <div class="rating-bar"><div class="rating-fill" style="width:${leader.rating_basis === "none" ? 0 : Math.max(0, Math.min(100, (Number(leader.average_rating) / 5) * 100))}%"></div></div>
        <div class="rating-row">
          <span>${leader.rating_basis === "none" ? "No rating" : `${escapeHtml(leader.average_rating)}/5`}</span>
          <span class="stars">${leader.rating_basis === "none" ? "" : ratingStars(leader.average_rating)}</span>
        </div>
      </td>
      <td data-label="Reviews">${leader.approved_feedback_count}</td>
      <td data-label="Score">${leader.performance_score}%</td>
      <td data-label="Profile"><a class="btn btn-outline btn-small" href="leader.html?id=${leader.id}">Open</a></td>
    </tr>
  `).join("");
}

function renderLeaderboard() {
  const sorted = sortLeaders(leaderboardEntries);
  renderStats(sorted);
  renderTopPerformers(sorted);
  renderTable(sorted);
}

function setupSortControls() {
  document.querySelectorAll("[data-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      currentSort = button.dataset.sort || "rating";
      document.querySelectorAll("[data-sort]").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      renderLeaderboard();
    });
  });
}

async function init() {
  await bootstrapPage({ activeNav: "leaderboard" });
  renderStackState("[data-top-performers]", "Loading office rankings...");
  renderTableState("[data-leaderboard-body]", 7, "Loading office rankings...");
  setupSortControls();

  try {
    leaderboardEntries = await getLeaderboardData();
    renderLeaderboard();
  } catch (error) {
    renderStackState("[data-top-performers]", "The leaderboard could not be loaded right now.");
    renderTableState("[data-leaderboard-body]", 7, "The leaderboard could not be loaded right now.");
    showToast(error.message, "error");
  }
}

init();
