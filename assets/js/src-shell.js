/*
 * Shared entry point for the three SRC pages.
 *
 * Each one needs the same four things before it can render: the standard page
 * shell, a signed-in leader, the office that leader runs, and the header lines
 * naming both. Doing that in one place keeps the pages themselves about their
 * own content, and means a leader who is not linked to an office gets the same
 * clear explanation everywhere instead of a raw database error.
 */

import { bootstrapPage } from "./app.js";
import { getLeaderContext } from "./data.js";
import { escapeHtml, showToast } from "./ui.js";

function renderAccessNotice(message, actionHref, actionLabel) {
  const host = document.querySelector(".shell-main .container");
  if (!host) {
    return;
  }

  host.innerHTML = `
    <section class="section">
      <div class="card empty-state panel">
        <h2>Leader workspace unavailable</h2>
        <p>${escapeHtml(message)}</p>
        <div class="button-row">
          <a class="btn btn-primary" href="${actionHref}">${escapeHtml(actionLabel)}</a>
        </div>
      </div>
    </section>
  `;
}

export async function bootstrapSrcPage({ activeNav }) {
  const profile = await bootstrapPage({ activeNav });

  if (!profile) {
    window.location.href = "login.html";
    return null;
  }

  if (profile.role === "admin") {
    window.location.href = "admin-dashboard.html";
    return null;
  }

  if (profile.role !== "leader") {
    window.location.href = "dashboard.html";
    return null;
  }

  let context = null;
  try {
    context = await getLeaderContext(profile);
  } catch (error) {
    showToast(error.message, "error");
    renderAccessNotice(
      "Your office details could not be loaded right now. Try again in a moment.",
      "index.html",
      "Back to home"
    );
    return null;
  }

  if (!context) {
    /*
     * The account is a leader but no office is linked to it yet. That is an
     * admin task, so point at a person rather than leaving a dead page.
     */
    renderAccessNotice(
      "This leader account is not linked to an office yet. Ask a campus admin to connect your codename to your office, then sign in again.",
      "index.html",
      "Back to home"
    );
    return null;
  }

  renderLeaderHeader(profile, context);
  return { profile, context };
}

function renderLeaderHeader(profile, context) {
  const office = context.leader;

  document.querySelectorAll("[data-src-name]").forEach((node) => {
    node.textContent = office.display_name || profile.codename;
  });

  document.querySelectorAll("[data-src-position]").forEach((node) => {
    node.textContent = office.office_title;
  });

  document.querySelectorAll("[data-assigned-office]").forEach((node) => {
    node.textContent = office.office_title;
  });

  /*
   * The Core Seven badge is baked into the page markup, so hide it for the
   * coordinators, hall executives, and other executives who share these pages.
   */
  if (!context.isSevenCore) {
    document.querySelectorAll(".src-badge").forEach((node) => {
      node.textContent = office.department_label || "Office";
    });
  }
}
