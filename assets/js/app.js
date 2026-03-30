import { getCurrentProfile, getCurrentSession, logout } from "./auth.js";
import { hasSupabaseConfig } from "./supabase-client.js";
import {
  renderAppName,
  renderConfigBanner,
  renderFooterYear,
  setupMobileMenu,
  setupTheme,
  showToast,
} from "./ui.js";

export async function bootstrapPage({ activeNav, requiredRole = null } = {}) {
  renderConfigBanner();
  setupTheme();

  if (!hasSupabaseConfig) {
    renderShell(null, activeNav);
    return null;
  }

  try {
    const session = await getCurrentSession();
    const profile = session?.user ? await getCurrentProfile() : null;
    renderShell(profile, activeNav);

    if (requiredRole && profile?.role !== requiredRole) {
      window.location.href = profile ? getDashboardRoute(profile.role) : "login.html";
      return null;
    }

    return profile;
  } catch (error) {
    renderShell(null, activeNav);
    showToast(error.message, "error");
    return null;
  }
}

function renderShell(profile, activeNav) {
  /*
   * The shell work is grouped here so every page gets the same order of
   * operations: build nav, build auth controls, build footer, then attach the
   * shared interactions those elements depend on.
   */
  renderNavigation(profile, activeNav);
  renderAuthSlot(profile);
  renderFooter(profile, activeNav);
  renderAppName();
  renderFooterYear();
  setupSecretAdminEntry();
  setupMobileMenu();
}

function setupSecretAdminEntry() {
  /*
   * Admin login is intentionally hidden from the main navigation. The trigger
   * lives on the footer brand so the header logo can stay a plain home link.
   */
  const footerTriggers = document.querySelectorAll(".footer-logo, .site-footer [data-app-name], footer [data-app-name]");
  footerTriggers.forEach((trigger) => {
    if (trigger.dataset.adminTriggerBound === "true") {
      return;
    }

    trigger.dataset.adminTriggerBound = "true";
    trigger.addEventListener("dblclick", () => {
      const currentPage = window.location.pathname.split("/").pop();

      if (currentPage === "login.html") {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set("mode", "admin");
        window.history.replaceState({}, "", `${currentUrl.pathname}${currentUrl.search}`);
        window.dispatchEvent(new CustomEvent("leaderrate-admin-mode"));
        return;
      }

      const loginUrl = new URL("login.html", window.location.href);
      loginUrl.searchParams.set("mode", "admin");
      window.location.href = `${loginUrl.pathname}${loginUrl.search}`;
    });
  });
}

function renderAuthSlot(profile) {
  const slot = document.querySelector("[data-auth-slot]");
  if (!slot) {
    return;
  }

  if (!profile) {
    slot.innerHTML = `
      <a class="btn btn-secondary" href="login.html">Login</a>
      <a class="btn btn-primary" href="register.html">Register</a>
    `;
    return;
  }

  slot.innerHTML = `
    <div class="account-menu-shell">
      <button class="account-menu-toggle" type="button" data-account-toggle aria-expanded="false">
        <span>${profile.codename}</span>
        <span class="account-menu-caret">v</span>
      </button>
      <div class="account-menu hidden" data-account-menu>
        <div class="account-menu-header">
          <strong>${profile.codename}</strong>
          <small>${profile.role} account</small>
        </div>
        <a class="account-menu-link" href="settings.html">Settings</a>
        ${profile.role === "admin" ? '<a class="account-menu-link" href="moderation.html">Moderation queue</a>' : ""}
        <button class="account-menu-link account-menu-button" type="button" data-logout-button>Logout</button>
      </div>
    </div>
  `;

  const menuShell = slot.querySelector(".account-menu-shell");
  const toggle = slot.querySelector("[data-account-toggle]");
  const menu = slot.querySelector("[data-account-menu]");

  toggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    const nextExpanded = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", nextExpanded ? "true" : "false");
    menu?.classList.toggle("hidden", !nextExpanded);
  });

  menuShell?.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  /*
   * Several pages refresh their own contents by calling init() again after a
   * save action. This guard prevents us from registering the same global close
   * handler over and over on each refresh.
   */
  if (document.body.dataset.accountMenuCloseBound !== "true") {
    document.body.dataset.accountMenuCloseBound = "true";
    document.addEventListener("click", () => {
      document.querySelectorAll("[data-account-toggle]").forEach((button) => {
        button.setAttribute("aria-expanded", "false");
      });
      document.querySelectorAll("[data-account-menu]").forEach((menuNode) => {
        menuNode.classList.add("hidden");
      });
    });
  }

  slot.querySelector("[data-logout-button]")?.addEventListener("click", async () => {
    try {
      await logout();
      showToast("You have been logged out.", "success");
      window.location.href = "index.html";
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

function getDashboardRoute(role) {
  if (role === "leader") {
    return "leader-dashboard.html";
  }

  if (role === "admin") {
    return "admin-dashboard.html";
  }

  return "student-dashboard.html";
}

function getPrimaryNavItems(profile, activeKey) {
  if (!profile) {
    return [
      { key: "home", href: "index.html", label: "Home", active: activeKey === "home" },
      { key: "leaders", href: "leaders.html", label: "Browse Leaders", active: activeKey === "leaders" },
      { key: "leaderboard", href: "leaderboard.html", label: "Leaderboard", active: activeKey === "leaderboard" },
      { key: "feedback", href: "feedback.html", label: "Feedback", active: activeKey === "feedback" },
      { key: "updates", href: "updates.html", label: "Updates", active: activeKey === "updates" },
    ];
  }

  const items = [
    {
      key: "dashboard",
      href: getDashboardRoute(profile.role),
      label: "Dashboard",
      active: activeKey === "home" || activeKey === `${profile.role}-dashboard`,
    },
  ];

  if (profile.role === "admin") {
    items.push({
      key: "moderation",
      href: "moderation.html",
      label: "Moderation",
      active: activeKey === "moderation",
    });
  }

  items.push(
    { key: "leaders", href: "leaders.html", label: "Browse Leaders", active: activeKey === "leaders" },
    { key: "leaderboard", href: "leaderboard.html", label: "Leaderboard", active: activeKey === "leaderboard" },
    { key: "feedback", href: "feedback.html", label: "Feedback", active: activeKey === "feedback" },
    { key: "updates", href: "updates.html", label: "Updates", active: activeKey === "updates" },
  );

  return items;
}

function renderNavigation(profile, activeKey) {
  /*
   * The top navigation is rebuilt from the auth state so logged-in users do not
   * keep seeing guest-only links such as Home, Login, or Register.
   */
  const nav = document.querySelector("[data-nav-links]");
  if (!nav) {
    return;
  }

  const items = getPrimaryNavItems(profile, activeKey);
  nav.innerHTML = items.map((item) => `
    <a href="${item.href}" data-nav="${item.key}" class="${item.active ? "active" : ""}">${item.label}</a>
  `).join("");
}

function renderFooter(profile, activeKey) {
  /*
   * Every page should end with the same footer structure so the hidden admin
   * trigger, page links, and institution branding stay predictable. We keep
   * any page-specific note by reading it once from the original markup.
   */
  const footer = document.querySelector(".site-footer, footer");
  if (!footer) {
    return;
  }

  if (!footer.dataset.footerNote) {
    const existingNote = footer.querySelector(".footer-shell .muted, .footer-content .muted, .muted")?.textContent?.trim();
    const looksLikeCopyright = existingNote?.includes(String.fromCharCode(169)) || /all rights reserved/i.test(existingNote || "");
    if (existingNote && !looksLikeCopyright) {
      footer.dataset.footerNote = existingNote;
    }
  }

  const note = footer.dataset.footerNote || "Anonymous voices, moderated feedback, and visible office updates for FOSCO.";
  const items = getPrimaryNavItems(profile, activeKey);
  const shell = footer.querySelector(".footer-shell, .footer-content") || footer.appendChild(document.createElement("div"));
  shell.className = "container footer-shell";
  shell.innerHTML = `
    <div class="footer-brand-group">
      <div class="footer-logo"><span data-app-name>LeaderRate v1.0</span></div>
      <p class="footer-note">${note}</p>
    </div>
    <div class="footer-side">
      <div class="footer-links">
        ${items.map((item) => `<a href="${item.href}">${item.label}</a>`).join("")}
        ${!profile ? '<a href="login.html">Login</a><a href="register.html">Register</a>' : ""}
      </div>
      <div class="footer-legal">&copy; <span data-year></span> LeaderRate. All rights reserved.</div>
    </div>
  `;
}
