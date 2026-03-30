import { bootstrapPage } from "../app.js";
import { logAbuseEvent } from "../audit.js";
import { generateCodenameSuggestions, registerStudent } from "../auth.js";
import { showToast } from "../ui.js";

function formatCodenameLabel(codename) {
  const match = String(codename || "").match(/^([a-z]+)(\d{2,3})$/i);
  if (!match) {
    return String(codename || "");
  }

  const [, word, digits] = match;
  return `${word.charAt(0).toUpperCase()}${word.slice(1)} ${digits}`;
}

async function init() {
  await bootstrapPage({ activeNav: "register" });

  const form = document.querySelector("[data-register-form]");
  const optionsSlot = document.querySelector("[data-codename-options]");
  const progressCopy = document.querySelector("[data-codename-progress]");
  const refreshButton = document.querySelector("[data-refresh-codenames]");
  const previousButton = document.querySelector("[data-codename-prev]");
  const nextButton = document.querySelector("[data-codename-next]");
  const hiddenInput = document.querySelector("[data-selected-codename]");
  const selectionCopy = document.querySelector("[data-selected-copy]");
  const seenSuggestions = new Set();

  let currentOptions = [];
  let currentIndex = 0;
  let selectedCodename = "";

  function setSelectedCodename(codename) {
    selectedCodename = codename;

    if (hiddenInput) {
      hiddenInput.value = codename;
    }

    if (selectionCopy) {
      selectionCopy.textContent = codename
        ? `Selected codename: ${codename}. Keep it because you will use it when logging in.`
        : "Select one codename to continue.";
    }
  }

  function renderCurrentCodename() {
    if (!optionsSlot) {
      return;
    }

    const currentCodename = currentOptions[currentIndex];
    if (!currentCodename) {
      optionsSlot.innerHTML = "";
      if (progressCopy) {
        progressCopy.textContent = "No codename options are available right now.";
      }
      setSelectedCodename("");
      return;
    }

    optionsSlot.innerHTML = `
      <button
        class="codename-option"
        type="button"
        data-codename-option="${currentCodename}"
        aria-pressed="true"
      >
        <strong>${formatCodenameLabel(currentCodename)}</strong>
        <span>${currentCodename}</span>
      </button>
    `;

    optionsSlot.querySelector("[data-codename-option]")?.addEventListener("click", () => {
      setSelectedCodename(currentCodename);
    });

    if (progressCopy) {
      progressCopy.textContent = `Option ${currentIndex + 1} of ${currentOptions.length}. Use the arrows to browse the codenames one after another.`;
    }

    setSelectedCodename(currentCodename);
  }

  function stepCodename(direction) {
    if (!currentOptions.length) {
      return;
    }

    currentIndex = (currentIndex + direction + currentOptions.length) % currentOptions.length;
    renderCurrentCodename();
  }

  function loadCodenameOptions() {
    try {
      const suggestions = generateCodenameSuggestions({
        count: 6,
        exclude: [...seenSuggestions],
      });

      suggestions.forEach((value) => seenSuggestions.add(value));
      currentOptions = suggestions;
      currentIndex = 0;
      renderCurrentCodename();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  loadCodenameOptions();
  refreshButton?.addEventListener("click", loadCodenameOptions);
  previousButton?.addEventListener("click", () => stepCodename(-1));
  nextButton?.addEventListener("click", () => stepCodename(1));

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);

    try {
      if (!selectedCodename) {
        throw new Error("Select one of the generated codenames before creating an account.");
      }

      await registerStudent({
        codename: formData.get("codename"),
        password: formData.get("password"),
        confirmPassword: formData.get("confirmPassword"),
      });

      await logAbuseEvent("student_register_success", {
        codename: String(formData.get("codename") || "").toLowerCase(),
      });

      showToast("Student account created. You can now log in.", "success");
      form.reset();
      loadCodenameOptions();
      setTimeout(() => {
        window.location.href = "login.html";
      }, 700);
    } catch (error) {
      await logAbuseEvent("student_register_failed", {
        reason: error.message,
      });
      showToast(error.message, "error");
    }
  });
}

init();
