import { bootstrapPage } from "../app.js";
import { generateCodenameSuggestions, logout } from "../auth.js";
import {
  getAdminOverview,
  getLeaderDashboard,
  getStudentDashboard,
} from "../data.js";
import { formatDate, renderStackState, showToast } from "../ui.js";
import { requireSupabaseClient } from "../supabase-client.js";

const SETTINGS_STORAGE_KEY = "leaderrate-settings";

function dashboardRoute(role) {
  if (role === "leader") {
    return "leader-dashboard.html";
  }

  if (role === "admin") {
    return "admin-dashboard.html";
  }

  return "student-dashboard.html";
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

function applyThemeChoice(theme) {
  document.body.classList.toggle("theme-dark", theme === "dark");
  localStorage.setItem("leaderrate-theme", theme);
  const themeToggle = document.querySelector("[data-theme-toggle]");
  if (themeToggle) {
    themeToggle.textContent = theme === "dark" ? "Light mode" : "Dark mode";
  }

  document.querySelectorAll("[data-theme-choice]").forEach((button) => {
    button.classList.toggle("active", button.dataset.themeChoice === theme);
  });
}

function renderCodenamePreview(slot) {
  if (!slot) {
    return;
  }

  const suggestions = generateCodenameSuggestions({ count: 3 });
  slot.innerHTML = suggestions.map((codename) => `
    <span class="codename-preview-pill">${codename}</span>
  `).join("");
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
        <strong>${stats.myFeedback.filter((item) => item.moderation_status === "approved").length}</strong>
        <span>Approved items</span>
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
        <strong>${stats.feedback.length}</strong>
        <span>Feedback items</span>
      </article>
      <article class="settings-stat">
        <strong>${stats.feedback.filter((item) => item.moderation_status === "approved").length}</strong>
        <span>Approved feedback</span>
      </article>
      <article class="settings-stat">
        <strong>${stats.projects.length}</strong>
        <span>Projects posted</span>
      </article>
      <article class="settings-stat">
        <strong>${stats.responses.length}</strong>
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
      <strong>${stats.feedback.filter((item) => item.moderation_status === "pending").length}</strong>
      <span>Pending moderation</span>
    </article>
    <article class="settings-stat">
      <strong>${stats.leaders.length}</strong>
      <span>Leader offices</span>
    </article>
    <article class="settings-stat">
      <strong>${stats.logs.length}</strong>
      <span>Recent abuse logs</span>
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
    renderStats(profile, await getLeaderDashboard(profile));
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

function wireThemeChoices() {
  const savedTheme = localStorage.getItem("leaderrate-theme") || "light";
  applyThemeChoice(savedTheme);

  document.querySelectorAll("[data-theme-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      applyThemeChoice(button.dataset.themeChoice);
      showToast("Theme updated.", "success");
    });
  });
}

async function changePassword() {
  const newPassword = window.prompt("Enter a new password.");
  if (!newPassword) {
    return;
  }

  const supabase = requireSupabaseClient();
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw error;
  }
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
    document.querySelector("[data-settings-role]").textContent = profile.role;
    document.querySelector("[data-settings-institution]").textContent = "Foso College of Education";
    document.querySelector("[data-settings-created]").textContent = profile.created_at ? formatDate(profile.created_at) : "Recently created";

    document.querySelector("[data-settings-actions]").innerHTML = `
      <a class="btn btn-primary" href="${dashboardRoute(profile.role)}">Go to dashboard</a>
      <a class="btn btn-secondary" href="leaders.html">Browse leaders</a>
    `;

    renderCodenamePreview(document.querySelector("[data-codename-preview]"));
    document.querySelector("[data-preview-codenames]")?.addEventListener("click", () => {
      renderCodenamePreview(document.querySelector("[data-codename-preview]"));
    });

    wirePreferenceToggles();
    wireThemeChoices();
    await loadContributionStats(profile);

    document.querySelector("[data-change-password]")?.addEventListener("click", async () => {
      try {
        await changePassword();
        showToast("Password updated.", "success");
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
