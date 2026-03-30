import { bootstrapPage } from "../app.js";
import { logAbuseEvent } from "../audit.js";
import { getCurrentProfile, loginWithCodename } from "../auth.js";
import { showToast } from "../ui.js";

function adminModeIsActive() {
  return new URLSearchParams(window.location.search).get("mode") === "admin";
}

function applyLoginMode(adminMode) {
  const title = document.querySelector("[data-login-title]");
  const copy = document.querySelector("[data-login-copy]");
  const help = document.querySelector("[data-login-help]");
  const banner = document.querySelector("[data-admin-login-banner]");

  if (!adminMode) {
    banner?.classList.add("hidden");
    if (title) {
      title.textContent = "One login for students and leaders.";
    }
    if (copy) {
      copy.textContent = "Use your codename and password to continue.";
    }
    if (help) {
      help.textContent = "Enter your codename and password.";
    }
    return;
  }

  banner?.classList.remove("hidden");
  if (title) {
    title.textContent = "Admin login mode is open.";
  }
  if (copy) {
    copy.textContent = "Use the admin codename and password.";
  }
  if (help) {
    help.textContent = "Enter the admin codename and password.";
  }
}

async function init() {
  await bootstrapPage({ activeNav: "login" });
  let currentAdminMode = adminModeIsActive();
  applyLoginMode(currentAdminMode);

  window.addEventListener("leaderrate-admin-mode", () => {
    currentAdminMode = true;
    applyLoginMode(currentAdminMode);
  });

  document.querySelector("[data-exit-admin-mode]")?.addEventListener("click", () => {
    currentAdminMode = false;
    window.history.replaceState({}, "", "login.html");
    applyLoginMode(currentAdminMode);
  });

  const form = document.querySelector("[data-login-form]");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);

    try {
      await loginWithCodename({
        codename: formData.get("codename"),
        password: formData.get("password"),
        adminMode: currentAdminMode,
      });

      const profile = await getCurrentProfile();
      await logAbuseEvent("login_success", {
        mode: currentAdminMode ? "admin" : "shared",
      });

      showToast("Login successful.", "success");
      setTimeout(() => {
        window.location.href = profile.role === "leader"
          ? "leader-dashboard.html"
          : profile.role === "admin"
            ? "admin-dashboard.html"
            : "student-dashboard.html";
      }, 500);
    } catch (error) {
      await logAbuseEvent("login_failure", {
        mode: currentAdminMode ? "admin" : "shared",
        reason: error.message,
      });
      showToast(error.message, "error");
    }
  });
}

init();
