import { logAbuseEvent } from "../audit.js";
import { getSrcWorkspace, saveLeaderResponse } from "../data.js";
import { authorLabel, setupIdentityToggle } from "../src-identity.js";
import { bootstrapSrcPage } from "../src-shell.js";
import { escapeHtml, formatRelativeDate, ratingStars, showToast } from "../ui.js";

const RESPONSE_LIMIT = 1000;

let session = null;
let identity = null;
let workspace = null;
let activeFeedback = null;

function findFeedback(feedbackId) {
  return [...(workspace?.officeFeedback || []), ...(workspace?.generalFeedback || [])]
    .find((item) => item.id === feedbackId) || null;
}

function renderEmpty(icon, heading, message) {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <h3>${escapeHtml(heading)}</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function feedbackCard(item, { showOffice }) {
  return `
    <article class="src-feedback-card ${item.response ? "is-answered" : "is-open"}">
      <header class="src-feedback-card-head">
        <div class="src-feedback-card-title">
          <div class="src-feedback-card-kicker">
            <span class="pill">${escapeHtml(item.category)}</span>
            ${showOffice ? `<span class="pill subtle">${escapeHtml(item.leaders?.office_title || "Whole SRC")}</span>` : ""}
            <span class="status-pill-mini ${item.response ? "responded" : "pending"}">
              ${item.response ? "responded" : "awaiting reply"}
            </span>
          </div>
          <div class="src-feedback-card-meta">
            <span>${escapeHtml(item.student_codename_snapshot || "anonymous_user")}</span>
            <span>${escapeHtml(formatRelativeDate(item.created_at))}</span>
          </div>
        </div>
        <div class="src-feedback-card-rating">
          <strong>${item.rating}</strong><span>/5</span>
          <span class="stars">${ratingStars(item.rating)}</span>
        </div>
      </header>

      <p class="src-feedback-card-message">${escapeHtml(item.message)}</p>

      ${item.response ? `
        <div class="response-box">
          <strong>Response from ${escapeHtml(authorLabel(item.response))}</strong>
          <p>${escapeHtml(item.response.response_message)}</p>
        </div>
      ` : ""}

      <footer class="src-feedback-card-actions">
        ${answeredByOther(item)
          ? `<span class="muted">Answered by ${escapeHtml(authorLabel(item.response))}</span>`
          : `<button class="btn btn-primary btn-small" type="button" data-open-response="${item.id}">
               ${item.response ? "Edit response" : "Respond"}
             </button>`}
      </footer>
    </article>
  `;
}

/*
 * Each feedback item holds one response. On general feedback any Core Seven
 * member can get there first, and the database will not let a second one
 * overwrite it, so say who replied rather than offering a button that fails.
 */
function answeredByOther(item) {
  return Boolean(item.response) && item.response.leader_id !== session.context.leaderId;
}

function renderList(target, countTarget, items, options) {
  const node = document.querySelector(target);
  const countNode = document.querySelector(countTarget);

  if (countNode) {
    countNode.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;
  }

  if (!node) {
    return;
  }

  node.innerHTML = items.length
    ? items.map((item) => feedbackCard(item, options)).join("")
    : renderEmpty(options.emptyIcon, options.emptyHeading, options.emptyMessage);

  node.querySelectorAll("[data-open-response]").forEach((button) => {
    button.addEventListener("click", () => openResponseModal(button.dataset.openResponse));
  });
}

function renderAll() {
  const { context } = session;

  renderList("[data-office-feedback-list]", "[data-office-feedback-count]", workspace.officeFeedback, {
    showOffice: false,
    emptyIcon: "\u{1F4ED}",
    emptyHeading: "No office-specific feedback",
    emptyMessage: "Feedback for your assigned office will appear here.",
  });

  if (context.isSevenCore) {
    renderList("[data-general-feedback-list]", "[data-general-feedback-count]", workspace.generalFeedback, {
      showOffice: true,
      emptyIcon: "\u{1F4E2}",
      emptyHeading: "No general feedback",
      emptyMessage: "General feedback from students will appear here.",
    });
    return;
  }

  const generalNode = document.querySelector("[data-general-feedback-list]");
  const generalCount = document.querySelector("[data-general-feedback-count]");
  if (generalCount) {
    generalCount.textContent = "Seven Core";
  }
  if (generalNode) {
    generalNode.innerHTML = renderEmpty(
      "\u{1F512}",
      "Handled by the Seven Core",
      "Feedback addressed to the SRC as a whole is answered by Seven Core executives."
    );
  }
}

function setModalOpen(open) {
  const modal = document.querySelector("[data-response-modal]");
  if (!modal) {
    return;
  }

  modal.classList.toggle("hidden", !open);
  modal.setAttribute("aria-hidden", open ? "false" : "true");
  document.body.classList.toggle("modal-open", open);

  if (!open) {
    activeFeedback = null;
  }
}

function updateCounter(value) {
  const counter = document.querySelector("[data-response-counter]");
  if (counter) {
    counter.textContent = `${value.length} / ${RESPONSE_LIMIT}`;
  }
}

function openResponseModal(feedbackId) {
  activeFeedback = findFeedback(feedbackId);
  if (!activeFeedback) {
    showToast("That feedback could not be found. Refresh and try again.", "error");
    return;
  }

  const officeNode = document.querySelector("[data-response-office]");
  const previewNode = document.querySelector("[data-response-feedback-preview]");
  const messageNode = document.querySelector("[data-response-message]");
  const anonymousNode = document.querySelector("[data-response-anonymous]");

  if (officeNode) {
    officeNode.textContent = activeFeedback.leader_id
      ? activeFeedback.leaders?.office_title || session.context.leader.office_title
      : "General — whole SRC";
  }

  if (previewNode) {
    previewNode.textContent = `"${activeFeedback.message}" — ${activeFeedback.student_codename_snapshot || "anonymous_user"}, ${activeFeedback.rating}/5`;
  }

  if (messageNode) {
    messageNode.value = activeFeedback.response?.response_message || "";
    updateCounter(messageNode.value);
  }

  if (anonymousNode) {
    /*
     * Default the checkbox to whatever the page-level identity switch is set
     * to, but let the leader override it for this one reply.
     */
    anonymousNode.checked = identity.current.anonymous;
  }

  setModalOpen(true);
  messageNode?.focus();
}

async function submitResponse(event) {
  event.preventDefault();
  if (!activeFeedback) {
    return;
  }

  const form = event.currentTarget;
  const submitButton = form.querySelector("[data-response-submit]");
  const messageNode = form.querySelector("[data-response-message]");
  const anonymousNode = form.querySelector("[data-response-anonymous]");
  const responseMessage = String(messageNode?.value || "").trim();

  if (!responseMessage) {
    showToast("Write a response before posting.", "error");
    return;
  }

  const chosen = identity.resolve(Boolean(anonymousNode?.checked));

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Posting...";
    }

    await saveLeaderResponse({
      feedback_id: activeFeedback.id,
      /*
       * Responses are always filed against the responder's own office, even
       * for general feedback, so students can see which desk answered.
       */
      leader_id: session.context.leaderId,
      leader_profile_id: session.profile.id,
      author_codename_snapshot: session.profile.codename,
      author_display_name: chosen.displayName,
      response_message: responseMessage,
    });

    await logAbuseEvent("leader_response_posted", {
      feedbackId: activeFeedback.id,
      leaderId: session.context.leaderId,
      anonymous: chosen.anonymous,
      general: !activeFeedback.leader_id,
    });

    showToast("Response posted.", "success");
    setModalOpen(false);
    await refresh();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Post Response";
    }
  }
}

async function refresh() {
  workspace = await getSrcWorkspace(session.context);
  renderAll();
}

function bindModal() {
  document.querySelectorAll("[data-close-response]").forEach((node) => {
    node.addEventListener("click", () => setModalOpen(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setModalOpen(false);
    }
  });

  const messageNode = document.querySelector("[data-response-message]");
  messageNode?.addEventListener("input", () => updateCounter(messageNode.value));

  document.querySelector("[data-response-form]")?.addEventListener("submit", submitResponse);
}

async function init() {
  session = await bootstrapSrcPage({ activeNav: "src-feedback" });
  if (!session) {
    return;
  }

  /*
   * This chooses how a reply is signed, which is not the same thing as the
   * anonymous account offered on the dashboard. Both replies go out from the
   * office either way, so the wording avoids the word "anonymous" entirely.
   */
  identity = setupIdentityToggle({
    context: session.context,
    profile: session.profile,
    realLabel: "Your name",
    anonymousLabel: "Codename only",
  });

  bindModal();

  try {
    await refresh();
  } catch (error) {
    showToast(error.message, "error");
  }
}

init();
