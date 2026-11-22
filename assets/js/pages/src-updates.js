import { logAbuseEvent } from "../audit.js";
import { PROJECT_STATUSES } from "../constants.js";
import { deleteProject, getSevenCoreUpdates, getSrcWorkspace, saveProject } from "../data.js";
import { setupIdentityToggle } from "../src-identity.js";
import { bootstrapSrcPage } from "../src-shell.js";
import { escapeHtml, formatRelativeDate, renderStackState, showToast } from "../ui.js";

let session = null;
let identity = null;
let updates = [];
let editingUpdateId = null;

function renderStatusOptions() {
  const select = document.querySelector("[data-update-status]");
  if (!select) {
    return;
  }

  select.innerHTML = PROJECT_STATUSES
    .map((status) => `<option value="${status}">${status}</option>`)
    .join("");
}

function isMine(update) {
  return update.leader_id === session.context.leaderId;
}

function renderFeed() {
  const node = document.querySelector("[data-updates-feed]");
  if (!node) {
    return;
  }

  if (!updates.length) {
    node.innerHTML = `
      <div class="empty-state-mini">
        <div class="empty-icon">&#128226;</div>
        <p>No Core Seven updates have been posted yet. Yours would be the first.</p>
      </div>
    `;
    return;
  }

  node.innerHTML = updates.map((update) => `
    <article class="src-card src-update-card ${isMine(update) ? "is-mine" : ""}">
      <header class="src-update-head">
        <div>
          <div class="src-update-kicker">
            <span class="pill">${escapeHtml(update.leaders?.office_title || update.office_title_snapshot || "Office")}</span>
            ${update.is_official ? `<span class="status-pill-mini responded">official</span>` : ""}
            <span class="status-pill-mini ${update.status === "completed" ? "responded" : "pending"}">${escapeHtml(update.status)}</span>
          </div>
          <h3>${escapeHtml(update.title)}</h3>
          <div class="src-update-meta">
            <span>${escapeHtml(update.author_display_name || "Posted by the office")}</span>
            <span>${escapeHtml(formatRelativeDate(update.created_at))}</span>
          </div>
        </div>
      </header>
      <p class="src-update-body">${escapeHtml(update.description)}</p>
      ${isMine(update) ? `
        <footer class="button-row">
          <button class="btn btn-ghost btn-small" type="button" data-edit-update="${update.id}">Edit</button>
          <button class="btn btn-danger btn-small" type="button" data-delete-update="${update.id}">Delete</button>
        </footer>
      ` : ""}
    </article>
  `).join("");

  node.querySelectorAll("[data-edit-update]").forEach((button) => {
    button.addEventListener("click", () => startEditing(button.dataset.editUpdate));
  });

  node.querySelectorAll("[data-delete-update]").forEach((button) => {
    button.addEventListener("click", () => removeUpdate(button.dataset.deleteUpdate));
  });
}

function startEditing(updateId) {
  const update = updates.find((item) => item.id === updateId);
  if (!update) {
    return;
  }

  editingUpdateId = update.id;
  const form = document.querySelector("[data-update-form]");
  form.querySelector("[name='title']").value = update.title;
  form.querySelector("[name='content']").value = update.description;
  form.querySelector("[name='isOfficial']").checked = Boolean(update.is_official);

  const statusSelect = form.querySelector("[data-update-status]");
  if (statusSelect) {
    statusSelect.value = update.status;
  }

  form.querySelector("[data-update-submit]").textContent = "Save changes";
  form.querySelector("[data-update-cancel]")?.classList.remove("hidden");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetForm() {
  editingUpdateId = null;
  const form = document.querySelector("[data-update-form]");
  form?.reset();
  const submit = form?.querySelector("[data-update-submit]");
  if (submit) {
    submit.textContent = "Post Update";
  }
  form?.querySelector("[data-update-cancel]")?.classList.add("hidden");
  applyOfficialPermission();
}

/*
 * Only Seven Core members may badge an update as an official SRC announcement.
 * The database enforces this too; disabling the control just means other
 * leaders never get a rejected save they cannot explain.
 */
function applyOfficialPermission() {
  const checkbox = document.querySelector("[name='isOfficial']");
  const note = document.querySelector("[data-official-note]");
  if (!checkbox) {
    return;
  }

  if (session.context.isSevenCore) {
    checkbox.disabled = false;
    return;
  }

  checkbox.checked = false;
  checkbox.disabled = true;
  if (note) {
    note.textContent = "Only Seven Core executives can post official SRC announcements.";
  }
}

async function removeUpdate(updateId) {
  const confirmed = window.confirm("Delete this update? Students will no longer see it.");
  if (!confirmed) {
    return;
  }

  try {
    await deleteProject(updateId);
    await logAbuseEvent("leader_project_deleted", { projectId: updateId });
    showToast("Update deleted.", "success");
    if (editingUpdateId === updateId) {
      resetForm();
    }
    await refresh();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function submitUpdate(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const submitButton = form.querySelector("[data-update-submit]");
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("content") || "").trim();

  if (!title || !description) {
    showToast("Add a title and some detail before posting.", "error");
    return;
  }

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Saving...";
    }

    await saveProject({
      leader_id: session.context.leaderId,
      leader_profile_id: session.profile.id,
      office_title_snapshot: session.context.leader.office_title,
      title,
      description,
      status: String(formData.get("status") || "ongoing"),
      is_official: session.context.isSevenCore && formData.get("isOfficial") === "on",
      /*
       * Null means the update carries only the office name. The identity switch
       * above the form is what decides that.
       */
      author_display_name: identity.current.displayName,
    }, editingUpdateId);

    await logAbuseEvent(editingUpdateId ? "leader_project_updated" : "leader_project_created", {
      leaderId: session.context.leaderId,
      anonymous: identity.current.anonymous,
    });

    showToast(editingUpdateId ? "Update saved." : "Update posted.", "success");
    resetForm();
    await refresh();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = editingUpdateId ? "Save changes" : "Post Update";
    }
  }
}

async function refresh() {
  const coreUpdates = await getSevenCoreUpdates();

  if (session.context.isSevenCore) {
    updates = coreUpdates;
    renderFeed();
    return;
  }

  /*
   * The feed is filtered to Seven Core offices, so a leader outside the core
   * would never see their own posts in it. Merge those back in and sort the
   * combined list so the page still works as their own updates manager.
   */
  const workspace = await getSrcWorkspace(session.context);
  const mine = workspace.projects.map((project) => ({
    ...project,
    leaders: {
      office_title: session.context.leader.office_title,
      display_name: session.context.leader.display_name,
    },
  }));

  updates = [...mine, ...coreUpdates]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  renderFeed();
}

async function init() {
  session = await bootstrapSrcPage({ activeNav: "src-updates" });
  if (!session) {
    return;
  }

  identity = setupIdentityToggle({
    context: session.context,
    profile: session.profile,
    realLabel: "Official SRC",
    anonymousLabel: "Office name only",
    anonymousNameText: session.context.leader.office_title,
  });

  renderStatusOptions();
  applyOfficialPermission();
  renderStackState("[data-updates-feed]", "Loading Core Seven updates...");

  document.querySelector("[data-update-form]")?.addEventListener("submit", submitUpdate);
  document.querySelector("[data-update-cancel]")?.addEventListener("click", resetForm);

  try {
    await refresh();
  } catch (error) {
    renderStackState("[data-updates-feed]", "Updates could not be loaded right now.");
    showToast(error.message, "error");
  }
}

init();
