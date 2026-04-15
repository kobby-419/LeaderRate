import { getCurrentProfile, getCurrentSession, logout } from "./auth.js";
import { hasSupabaseConfig } from "./supabase-client.js";
import {
  closeMobileMenu,
  renderAppName,
  renderConfigBanner,
  renderFooterYear,
  setupMobileMenu,
  setupTheme,
  showToast,
} from "./ui.js";

const PROFILE_CACHE_KEY = "leaderrate-profile-cache";

export async function bootstrapPage({ activeNav, requiredRole = null } = {}) {
  renderConfigBanner();
  setupTheme();
  const cachedProfile = readCachedProfile();

  if (cachedProfile) {
    renderShell(cachedProfile, activeNav);
  }

  if (!hasSupabaseConfig) {
    renderShell(cachedProfile, activeNav);
    return null;
  }

  try {
    const session = await getCurrentSession();
    const profile = session?.user ? await getCurrentProfile() : null;
    cacheProfile(profile);
    renderShell(profile, activeNav);

    if (requiredRole && profile?.role !== requiredRole) {
      window.location.href = profile ? getDashboardRoute(profile.role) : "login.html";
      return null;
    }

    return profile;
  } catch (error) {
    cacheProfile(null);
    renderShell(null, activeNav);
    showToast(error.message, "error");
    return null;
  }
}

function readCachedProfile() {
  try {
    return JSON.parse(sessionStorage.getItem(PROFILE_CACHE_KEY) || "null");
  } catch {
    return null;
  }
}

function cacheProfile(profile) {
  if (!profile) {
    sessionStorage.removeItem(PROFILE_CACHE_KEY);
    return;
  }

  sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
}

function renderShell(profile, activeNav) {
  /*
   * The shell work is grouped here so every page gets the same order of
   * operations: build nav, build auth controls, build footer, then attach the
   * shared interactions those elements depend on.
   */
  renderBrandLink(profile);
  renderNavigation(profile, activeNav);
  renderAuthSlot(profile);
  renderFooter(profile, activeNav);
  renderAppName();
  renderFooterYear();
  setupSecretAdminEntry();
  setupMobileMenu();
}

function renderBrandLink(profile) {
  const brandLink = document.querySelector(".site-header .brand");
  if (!brandLink) {
    return;
  }

  brandLink.setAttribute("href", profile ? getDashboardRoute(profile.role) : "index.html");
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
  const navActions = document.querySelector(".nav-actions");
  const existingDock = document.querySelector("[data-mobile-auth-dock]");
  existingDock?.remove();
  document.body.classList.remove("has-mobile-auth-dock");

  if (!slot) {
    return;
  }

  navActions?.classList.remove("has-profile-auth");
  slot.classList.remove("guest-auth-slot", "profile-auth-slot");

  if (!profile) {
    slot.classList.add("guest-auth-slot");
    slot.innerHTML = `
      <div class="desktop-auth-links">
        <a class="btn btn-secondary" href="login.html">Login</a>
        <a class="btn btn-primary" href="register.html">Register</a>
      </div>
    `;
    renderMobileAuthDock();
    return;
  }

  slot.classList.add("profile-auth-slot");
  navActions?.classList.add("has-profile-auth");
  slot.innerHTML = `
    <div class="account-menu-shell">
      <button
        class="account-menu-toggle"
        type="button"
        data-account-toggle
        aria-expanded="false"
        aria-label="Open account menu for ${profile.codename}"
        title="${profile.codename}"
      >
        <span class="account-toggle-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <path d="M12 12.75a4.25 4.25 0 1 0-4.25-4.25A4.25 4.25 0 0 0 12 12.75Zm0-6.5a2.25 2.25 0 1 1-2.25 2.25A2.25 2.25 0 0 1 12 6.25Zm0 7.75c-4.42 0-8 2.32-8 5.18a1 1 0 0 0 2 0c0-1.49 2.56-3.18 6-3.18s6 1.69 6 3.18a1 1 0 0 0 2 0c0-2.86-3.58-5.18-8-5.18Z"></path>
          </svg>
        </span>
        <span class="account-toggle-label">${profile.codename}</span>
        <span class="account-menu-caret" aria-hidden="true">v</span>
      </button>
      <div class="account-menu hidden" data-account-menu>
        <div class="account-menu-header">
          <strong>${profile.codename}</strong>
          <small>${profile.role === "admin" ? "private workspace" : "anonymous account"}</small>
        </div>
        <a class="account-menu-link" href="settings.html">Settings</a>
        ${profile.role === "admin" ? '<a class="account-menu-link" href="moderation.html">Review queue</a>' : ""}
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
    if (nextExpanded) {
      closeMobileMenu();
    }
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
      cacheProfile(null);
      showToast("You have been logged out.", "success");
      window.location.href = "index.html";
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

function renderMobileAuthDock() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  if (currentPage === "login.html" || currentPage === "register.html") {
    return;
  }

  const dock = document.createElement("div");
  dock.className = "mobile-auth-dock";
  dock.setAttribute("data-mobile-auth-dock", "");
  dock.innerHTML = `
    <a class="mobile-auth-link mobile-auth-link-secondary ${currentPage === "login.html" ? "is-active" : ""}" href="login.html">Login</a>
    <a class="mobile-auth-link mobile-auth-link-primary ${currentPage === "register.html" ? "is-active" : ""}" href="register.html">Register</a>
  `;
  document.body.appendChild(dock);
  document.body.classList.add("has-mobile-auth-dock");
}

function getDashboardRoute(role) {
  if (role === "admin") {
    return "admin-dashboard.html";
  }

  return "dashboard.html";
}

function getPrimaryNavItems(profile, activeKey) {
  if (!profile) {
    return [
      { key: "home", href: "index.html", label: "Home", active: activeKey === "home" },
      { key: "leaders", href: "leaders.html", label: "Browse Leaders", active: activeKey === "leaders" },
      { key: "leaderboard", href: "leaderboard.html", label: "Leaderboard", active: activeKey === "leaderboard" },
      { key: "feedback", href: "feedback.html", label: "Feedback", active: activeKey === "feedback" },
      { key: "updates", href: "updates.html", label: "Updates", active: activeKey === "updates" },
      { key: "about", href: "about.html", label: "About", active: activeKey === "about" },
    ];
  }

  const items = [
    {
      key: "dashboard",
      href: getDashboardRoute(profile.role),
      label: "Dashboard",
      active: activeKey === "home" || activeKey === "dashboard" || activeKey === `${profile.role}-dashboard`,
    },
  ];

  if (profile.role === "admin") {
    items.push({
      key: "moderation",
      href: "moderation.html",
      label: "Review Queue",
      active: activeKey === "moderation",
    });
  }

  items.push(
    { key: "leaders", href: "leaders.html", label: "Browse Leaders", active: activeKey === "leaders" },
    { key: "leaderboard", href: "leaderboard.html", label: "Leaderboard", active: activeKey === "leaderboard" },
    { key: "feedback", href: "feedback.html", label: "Feedback", active: activeKey === "feedback" },
    { key: "updates", href: "updates.html", label: "Updates", active: activeKey === "updates" },
    { key: "about", href: "about.html", label: "About", active: activeKey === "about" },
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

  const note = footer.dataset.footerNote || "Anonymous voices, visible feedback, and office updates for FOSCO.";
  const items = getPrimaryNavItems(profile, activeKey);
  const shell = footer.querySelector(".footer-shell, .footer-content") || footer.appendChild(document.createElement("div"));
  shell.className = "container footer-shell";
  shell.innerHTML = `
    <div class="footer-brand-group">
      <div class="footer-logo"><span data-app-name>LeaderRate</span></div>
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
