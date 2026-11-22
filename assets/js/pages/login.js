import { bootstrapPage } from "../app.js";
import { logAbuseEvent } from "../audit.js";
import { getCurrentProfile, loginWithCodename } from "../auth.js";
import { initPasswordVisibilityToggles } from "../password-toggle.js";
import { showToast } from "../ui.js";

function adminModeIsActive() {
    return new URLSearchParams(window.location.search).get("mode") === "admin";
}

/*
 * Reached from the account menu when someone wants to sign in to their second
 * account. Signing in replaces the current session but leaves its stored slot
 * behind, which is what makes the one-click switch available afterwards.
 */
function switchModeIsActive() {
    return new URLSearchParams(window.location.search).get("switch") === "1";
}

function applySwitchMode() {
    if (!switchModeIsActive()) {
        return;
    }

    const title = document.querySelector("[data-login-title]");
    const copy = document.querySelector("[data-login-copy]");

    if (title) title.textContent = "Your other account";
    if (copy) {
        copy.textContent =
            "Sign in with your other codename. The account you are already using stays available, and you can switch between them from the account menu.";
    }
}

function applyLoginMode(adminMode) {
    const title = document.querySelector("[data-login-title]");
    const copy = document.querySelector("[data-login-copy]");
    const help = document.querySelector("[data-login-help]");
    const banner = document.querySelector("[data-admin-login-banner]");

    if (!adminMode) {
        banner?.classList.add("hidden");
        if (title) title.textContent = "Login";
        if (copy) copy.textContent = "Use your codename and password to continue.";
        if (help) help.textContent = "Enter your codename and password.";
        return;
    }

    banner?.classList.remove("hidden");
    if (title) title.textContent = "Private access";
    if (copy) copy.textContent = "Use the private access codename and password.";
    if (help) help.textContent = "Enter the private access codename and password.";
}

async function init() {
    await bootstrapPage({ activeNav: "login" });
    initPasswordVisibilityToggles();
    let currentAdminMode = adminModeIsActive();
    applyLoginMode(currentAdminMode);
    applySwitchMode();

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
        const submitButton = form.querySelector('button[type="submit"]');

        try {
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "Logging in...";
            }

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

            /*
             * Leaders get the SRC workspace, admins the private workspace, and
             * everyone else the student dashboard. Membership of the Seven Core
             * is decided inside that workspace from the office record, not here.
             */
            setTimeout(() => {
                if (profile.role === "admin") {
                    window.location.href = "admin-dashboard.html";
                    return;
                }

                if (profile.role === "leader") {
                    window.location.href = "src-dashboard.html";
                    return;
                }

                window.location.href = "dashboard.html";
            }, 500);

        } catch (error) {
            await logAbuseEvent("login_failure", {
                mode: currentAdminMode ? "admin" : "shared",
                reason: error.message,
            });
            showToast(error.message, "error");
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Login";
            }
        }
    });
}

init();