import { accountKindLabel, bootstrapPage } from "../app.js";
import { logout, validatePassword } from "../auth.js";
import {
  getAdminOverview,
  getLeaderContext,
  getSrcWorkspace,
  getStudentDashboard,
} from "../data.js";
import { formatDate, renderStackState, showToast } from "../ui.js";
import { requireSupabaseClient } from "../supabase-client.js";

const SETTINGS_STORAGE_KEY = "leaderrate-settings";

function dashboardRoute(role) {
  if (role === "admin") {
    return "admin-dashboard.html";
  }

  if (role === "leader") {
    return "src-dashboard.html";
  }

  return "dashboard.html";
}

function loadSettingsPreferences() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveSettingsPreferences(preferences) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(preferences));
}

function renderStats(profile, stats) {
  const slot = document.querySelector("[data-settings-stats]");
  if (!slot) {
    return;
  }

  if (profile.role === "student") {
    slot.innerHTML = `
      <article class="settings-stat">
        <strong>${stats.myFeedback.length}</strong>
        <span>Feedback submitted</span>
      </article>
      <article class="settings-stat">
        <strong>${stats.myFeedback.filter((item) => item.moderation_status !== "rejected").length}</strong>
        <span>Visible items</span>
      </article>
      <article class="settings-stat">
        <strong>${stats.recentProjects.length}</strong>
        <span>Recent updates loaded</span>
      </article>
    `;
    return;
  }

  if (profile.role === "leader") {
    slot.innerHTML = `
      <article class="settings-stat">
        <strong>${stats.officeFeedback.length}</strong>
        <span>Office feedback</span>
      </article>
      <article class="settings-stat">
        <strong>${stats.pendingCount}</strong>
        <span>Awaiting a reply</span>
      </article>
      <article class="settings-stat">
        <strong>${stats.projects.length}</strong>
        <span>Updates posted</span>
      </article>
      <article class="settings-stat">
        <strong>${stats.myResponses.length}</strong>
        <span>Responses posted</span>
      </article>
    `;
    return;
  }

  slot.innerHTML = `
    <article class="settings-stat">
      <strong>${stats.profiles.length}</strong>
      <span>User profiles</span>
    </article>
    <article class="settings-stat">
      <strong>${stats.feedback.filter((item) => item.moderation_status === "rejected").length}</strong>
      <span>Censored feedback</span>
    </article>
    <article class="settings-stat">
      <strong>${stats.leaders.length}</strong>
      <span>Office records</span>
    </article>
    <article class="settings-stat">
      <strong>${stats.logs.length}</strong>
      <span>Recent safety logs</span>
    </article>
  `;
}

async function loadContributionStats(profile) {
  const slot = document.querySelector("[data-settings-stats]");
  renderStackState(slot, "Loading your dashboard snapshot...");

  if (profile.role === "student") {
    renderStats(profile, await getStudentDashboard(profile));
    return;
  }

  if (profile.role === "leader") {
    const context = await getLeaderContext(profile);
    if (!context) {
      renderStackState(slot, "This leader account is not linked to an office yet.");
      return;
    }

    renderStats(profile, await getSrcWorkspace(context));
    return;
  }

  renderStats(profile, await getAdminOverview());
}

function wirePreferenceToggles() {
  const preferences = {
    emailNotifications: false,
    pushNotifications: false,
    anonymousFeedback: true,
    securityAwareness: true,
    ...loadSettingsPreferences(),
  };

  document.querySelectorAll("[data-setting-toggle]").forEach((input) => {
    const key = input.dataset.settingToggle;
    input.checked = Boolean(preferences[key]);

    input.addEventListener("change", () => {
      preferences[key] = input.checked;
      saveSettingsPreferences(preferences);
      showToast("Preference saved.", "success");
    });
  });
}

/*
 * Changes the password of whichever account is signed in right now. A leader
 * holds two accounts, so this deliberately says which one is about to change:
 * running it from the office account and expecting the anonymous one to change
 * would be an easy and silent mistake.
 */
async function changePassword(profile) {
  const newPassword = window.prompt(
    `Enter a new password for ${profile.codename} (${accountKindLabel(profile.role)}).`
  );
  if (!newPassword) {
    return false;
  }

  const errors = validatePassword(newPassword);
  if (errors.length) {
    throw new Error(errors[0]);
  }

  /*
   * Typos are unrecoverable here: there is no email on these accounts, so a
   * mistyped password can only be undone by an admin re-running the seed.
   */
  const confirmation = window.prompt("Type the new password once more to confirm.");
  if (confirmation === null) {
    return false;
  }

  if (confirmation !== newPassword) {
    throw new Error("Those passwords do not match. Nothing was changed.");
  }

  const supabase = requireSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    throw error;
  }

  return true;
}

async function deleteAccountDemo() {
  const confirmed = window.confirm("This demo will sign you out and clear local preferences. Continue?");
  if (!confirmed) {
    return;
  }

  localStorage.removeItem(SETTINGS_STORAGE_KEY);
  localStorage.removeItem("leaderrate-theme");
  await logout();
  window.location.href = "index.html";
}

async function init() {
  const profile = await bootstrapPage({ activeNav: "settings" });
  if (!profile) {
    window.location.href = "login.html";
    return;
  }

  try {
    document.querySelector("[data-settings-codename]").textContent = profile.codename;
    const accountKind = accountKindLabel(profile.role);
    document.querySelector("[data-settings-role]").textContent =
      accountKind.charAt(0).toUpperCase() + accountKind.slice(1);
    document.querySelector("[data-settings-institution]").textContent = "Foso College of Education";
    document.querySelector("[data-settings-created]").textContent = profile.created_at ? formatDate(profile.created_at) : "Recently created";

    document.querySelector("[data-settings-actions]").innerHTML = `
      <a class="btn btn-primary" href="${dashboardRoute(profile.role)}">Go to dashboard</a>
      <a class="btn btn-secondary" href="leaders.html">Browse leaders</a>
    `;

    wirePreferenceToggles();
    await loadContributionStats(profile);

    document.querySelector("[data-change-password]")?.addEventListener("click", async () => {
      try {
        if (await changePassword(profile)) {
          showToast(`Password updated for ${profile.codename}.`, "success");
        }
      } catch (error) {
        showToast(error.message, "error");
      }
    });

    document.querySelector("[data-delete-account]")?.addEventListener("click", async () => {
      try {
        await deleteAccountDemo();
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  } catch (error) {
    showToast(error.message, "error");
  }
}

init();
