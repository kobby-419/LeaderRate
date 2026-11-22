import { getAlternateAccount, switchToAccount } from "../account-switch.js";
import { getSevenCoreUpdates, getSrcWorkspace } from "../data.js";
import { bootstrapSrcPage } from "../src-shell.js";
import { escapeHtml, formatRelativeDate, showToast } from "../ui.js";

const RECENT_LIMIT = 4;

function renderMiniEmpty(target, icon, message) {
  const node = document.querySelector(target);
  if (!node) {
    return;
  }

  node.innerHTML = `
    <div class="empty-state-mini">
      <div class="empty-icon">${icon}</div>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function renderCompactFeedback(target, items, { showOffice = false, emptyIcon, emptyMessage }) {
  const node = document.querySelector(target);
  if (!node) {
    return;
  }

  if (!items.length) {
    renderMiniEmpty(target, emptyIcon, emptyMessage);
    return;
  }

  node.innerHTML = items.slice(0, RECENT_LIMIT).map((item) => `
    <article class="feedback-item-compact">
      <div class="feedback-meta">
        <span class="feedback-author">${escapeHtml(item.student_codename_snapshot || "anonymous_user")}</span>
        <span class="feedback-rating">${item.rating}/5</span>
      </div>
      <p class="feedback-message">${escapeHtml(item.message)}</p>
      <div class="feedback-office">
        ${showOffice ? `${escapeHtml(item.leaders?.office_title || "Whole SRC")} &middot; ` : ""}
        <span class="feedback-date">${escapeHtml(formatRelativeDate(item.created_at))}</span>
        <span class="status-pill-mini ${item.response ? "responded" : "pending"}">
          ${item.response ? "responded" : "pending"}
        </span>
      </div>
    </article>
  `).join("");
}

function renderCompactUpdates(target, updates) {
  const node = document.querySelector(target);
  if (!node) {
    return;
  }

  if (!updates.length) {
    renderMiniEmpty(target, "\u{1F4E2}", "No Core Seven updates have been posted yet.");
    return;
  }

  node.innerHTML = updates.slice(0, RECENT_LIMIT).map((update) => `
    <article class="update-item-compact">
      <div class="update-header">
        <span class="update-title">${escapeHtml(update.title)}</span>
        <span class="status-pill-mini ${update.status === "completed" ? "responded" : "pending"}">
          ${escapeHtml(update.status)}
        </span>
      </div>
      <p class="update-content">${escapeHtml(update.description)}</p>
      <div class="update-meta">
        <span>${escapeHtml(update.leaders?.office_title || update.office_title_snapshot || "Office")}</span>
        <span>${escapeHtml(formatRelativeDate(update.created_at))}</span>
        ${update.is_official ? `<span class="status-pill-mini responded">official</span>` : ""}
      </div>
    </article>
  `).join("");
}

function renderStats(workspace) {
  const stats = {
    "[data-stats-office-feedback]": workspace.officeFeedback.length,
    "[data-stats-general-feedback]": workspace.generalFeedback.length,
    "[data-stats-pending]": workspace.pendingCount,
    "[data-stats-updates]": workspace.projects.length,
    "[data-stats-responses]": workspace.myResponses.length,
  };

  Object.entries(stats).forEach(([selector, value]) => {
    const node = document.querySelector(selector);
    if (node) {
      node.textContent = String(value);
    }
  });
}

/*
 * The two accounts are deliberately unlinked in the database, so this panel can
 * only report what this browser has seen. Once both have been signed into, the
 * switch is one click; before that, it points at the sign-in that establishes
 * the pair.
 */
function renderAccountPanel(profile, context) {
  const nameNode = document.querySelector("[data-office-account-name]");
  const officeNode = document.querySelector("[data-office-account-office]");
  const anonName = document.querySelector("[data-anon-account-name]");
  const anonDetail = document.querySelector("[data-anon-account-detail]");
  const anonAction = document.querySelector("[data-anon-action]");

  if (nameNode) nameNode.textContent = profile.codename;
  if (officeNode) officeNode.textContent = context.leader.office_title;

  const alternate = getAlternateAccount(profile);

  if (!anonAction) {
    return;
  }

  if (!alternate) {
    if (anonName) anonName.textContent = "Not signed in on this device";
    if (anonDetail) {
      anonDetail.textContent =
        "Sign in once with your anonymous codename and password. After that it becomes a one-click switch from here.";
    }
    anonAction.innerHTML =
      `<a class="btn btn-primary btn-small" href="login.html?switch=1">Sign in to your anonymous account</a>`;
    return;
  }

  if (anonName) anonName.textContent = alternate.codename;
  if (anonDetail) {
    anonDetail.textContent = "Switch across to rate and comment on other offices.";
  }
  anonAction.innerHTML =
    `<button class="btn btn-primary btn-small" type="button" data-switch-anon>Switch to anonymous account</button>`;

  anonAction.querySelector("[data-switch-anon]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "Switching...";

    try {
      const result = await switchToAccount(alternate.role);
      if (!result.ok) {
        showToast("That session has expired. Please sign in again.", "error");
        window.location.href = "login.html?switch=1";
        return;
      }

      window.location.href = result.route;
    } catch (error) {
      button.disabled = false;
      button.textContent = "Switch to anonymous account";
      showToast(error.message, "error");
    }
  });
}

async function init() {
  const session = await bootstrapSrcPage({ activeNav: "src-dashboard" });
  if (!session) {
    return;
  }

  const { profile, context } = session;
  renderAccountPanel(profile, context);

  renderMiniEmpty("[data-recent-office-feedback]", "\u{23F3}", "Loading office feedback...");
  renderMiniEmpty("[data-recent-general-feedback]", "\u{23F3}", "Loading general feedback...");
  renderMiniEmpty("[data-recent-updates]", "\u{23F3}", "Loading updates...");

  try {
    const [workspace, updates] = await Promise.all([
      getSrcWorkspace(context),
      getSevenCoreUpdates(RECENT_LIMIT),
    ]);

    renderStats(workspace);

    renderCompactFeedback("[data-recent-office-feedback]", workspace.officeFeedback, {
      emptyIcon: "\u{1F4ED}",
      emptyMessage: "No feedback for your office yet.",
    });

    if (context.isSevenCore) {
      renderCompactFeedback("[data-recent-general-feedback]", workspace.generalFeedback, {
        showOffice: true,
        emptyIcon: "\u{1F4E2}",
        emptyMessage: "No general feedback for the SRC yet.",
      });
    } else {
      /*
       * General feedback is addressed to the Seven Core, so everyone else sees
       * why the panel is empty rather than an unexplained blank column.
       */
      renderMiniEmpty(
        "[data-recent-general-feedback]",
        "\u{1F512}",
        "General SRC feedback is handled by the Seven Core."
      );
    }

    renderCompactUpdates("[data-recent-updates]", updates);
  } catch (error) {
    renderMiniEmpty("[data-recent-office-feedback]", "\u{26A0}", "Could not load office feedback.");
    renderMiniEmpty("[data-recent-general-feedback]", "\u{26A0}", "Could not load general feedback.");
    renderMiniEmpty("[data-recent-updates]", "\u{26A0}", "Could not load updates.");
    showToast(error.message, "error");
  }
}

init();
