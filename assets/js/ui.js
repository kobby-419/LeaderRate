import { appConfig, hasSupabaseConfig } from "./supabase-client.js";

const toastStack = ensureToastStack();

function ensureToastStack() {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }

  return stack;
}

export function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastStack.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

export function formatDate(value) {
  if (!value) {
    return "Unknown date";
  }

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatRelativeDate(value) {
  if (!value) {
    return "just now";
  }

  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  for (const [name, size] of units) {
    const amount = Math.floor(seconds / size);
    if (amount >= 1) {
      return `${amount} ${name}${amount > 1 ? "s" : ""} ago`;
    }
  }

  return "just now";
}

export function ratingStars(rating) {
  const safeRating = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return "\u2605".repeat(safeRating) + "\u2606".repeat(5 - safeRating);
}

export function setActiveNav(activeKey) {
  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.classList.toggle("active", link.dataset.nav === activeKey);
  });
}

export function setupTheme() {
  const themeToggle = document.querySelector("[data-theme-toggle]");
  const savedTheme = localStorage.getItem("leaderrate-theme") || "light";
  applyTheme(savedTheme);

  if (themeToggle && themeToggle.dataset.themeBound !== "true") {
    themeToggle.dataset.themeBound = "true";
    themeToggle.addEventListener("click", () => {
      const nextTheme = document.body.classList.contains("theme-dark") ? "light" : "dark";
      applyTheme(nextTheme);
    });
  }
}

function themeToggleIcon(theme) {
  if (theme === "dark") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="4.2"></circle>
        <path d="M12 2.75v2.1M12 19.15v2.1M21.25 12h-2.1M4.85 12H2.75M18.55 5.45l-1.48 1.48M6.93 17.07l-1.48 1.48M18.55 18.55l-1.48-1.48M6.93 6.93L5.45 5.45"></path>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M19.4 14.78A8.75 8.75 0 0 1 9.22 4.6a.7.7 0 0 0-.95-.8 9.75 9.75 0 1 0 11.93 11.93.7.7 0 0 0-.8-.95Z"></path>
    </svg>
  `;
}

function applyTheme(theme) {
  document.body.classList.toggle("theme-dark", theme === "dark");
  localStorage.setItem("leaderrate-theme", theme);
  const themeToggle = document.querySelector("[data-theme-toggle]");
  if (themeToggle) {
    const nextMode = theme === "dark" ? "light" : "dark";
    themeToggle.innerHTML = themeToggleIcon(theme);
    themeToggle.setAttribute("aria-label", `Switch to ${nextMode} mode`);
    themeToggle.setAttribute("title", `Switch to ${nextMode} mode`);
  }
}

function closeAccountMenus() {
  document.querySelectorAll("[data-account-toggle]").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
  document.querySelectorAll("[data-account-menu]").forEach((menuNode) => {
    menuNode.classList.add("hidden");
  });
}

export function closeMobileMenu() {
  const toggle = document.querySelector("[data-mobile-toggle]");
  const nav = document.querySelector("[data-nav-links]");
  const backdrop = document.querySelector("[data-mobile-nav-backdrop]");

  if (!toggle || !nav || !backdrop) {
    return;
  }

  nav.classList.remove("mobile-open");
  backdrop.classList.remove("mobile-open");
  document.body.classList.remove("mobile-menu-open");
  toggle.setAttribute("aria-expanded", "false");
}

export function setupMobileMenu() {
  const toggle = document.querySelector("[data-mobile-toggle]");
  const nav = document.querySelector("[data-nav-links]");
  if (!toggle || !nav) {
    return;
  }

  let backdrop = document.querySelector("[data-mobile-nav-backdrop]");
  if (!backdrop) {
    backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "mobile-nav-backdrop";
    backdrop.setAttribute("data-mobile-nav-backdrop", "");
    backdrop.setAttribute("aria-label", "Close navigation menu");
    document.body.appendChild(backdrop);
  }

  const closeMenu = () => {
    closeMobileMenu();
  };

  const openMenu = () => {
    closeAccountMenus();
    nav.classList.add("mobile-open");
    backdrop.classList.add("mobile-open");
    document.body.classList.add("mobile-menu-open");
    toggle.setAttribute("aria-expanded", "true");
  };

  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-haspopup", "true");

  if (toggle.dataset.mobileMenuBound !== "true") {
    toggle.dataset.mobileMenuBound = "true";
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (nav.classList.contains("mobile-open")) {
        closeMenu();
        return;
      }

      openMenu();
    });
  }

  if (backdrop.dataset.mobileMenuBound !== "true") {
    backdrop.dataset.mobileMenuBound = "true";
    backdrop.addEventListener("click", closeMenu);
  }

  if (nav.dataset.mobileMenuBound !== "true") {
    nav.dataset.mobileMenuBound = "true";
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        closeMenu();
      }
    });
  }

  if (document.body.dataset.mobileMenuCloseBound !== "true") {
    document.body.dataset.mobileMenuCloseBound = "true";

    document.addEventListener("click", (event) => {
      if (!document.body.classList.contains("mobile-menu-open")) {
        return;
      }

      const target = event.target;
      if (target instanceof Element && (nav.contains(target) || toggle.contains(target))) {
        return;
      }

      closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 920) {
        closeMenu();
      }
    });
  }
}

export function renderFooterYear() {
  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
}

export function renderConfigBanner() {
  const slot = document.querySelector("[data-config-banner]");
  if (!slot || hasSupabaseConfig) {
    return;
  }

  slot.innerHTML = `
    <div class="app-banner">
      Supabase is not configured yet. Update <code>assets/js/config.js</code> with your project URL and anon key to activate the demo.
    </div>
  `;
}

export function renderAppName() {
  document.querySelectorAll("[data-app-name]").forEach((node) => {
    node.textContent = appConfig.appName || "LeaderRate";
  });
}

/*
 * These helpers give every page the same loading, empty, and error treatment.
 * Instead of each page inventing a different placeholder shape, they all render
 * one simple card or table row that matches the shared design system.
 */
export function renderStackState(target, message, className = "empty-state panel") {
  const node = typeof target === "string" ? document.querySelector(target) : target;
  if (!node) {
    return;
  }

  node.innerHTML = `<div class="${className}">${escapeHtml(message)}</div>`;
}

export function renderTableState(target, colspan, message) {
  const node = typeof target === "string" ? document.querySelector(target) : target;
  if (!node) {
    return;
  }

  node.innerHTML = `<tr><td class="table-state" colspan="${colspan}">${escapeHtml(message)}</td></tr>`;
}

