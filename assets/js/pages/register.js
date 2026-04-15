import { bootstrapPage } from "../app.js";
import { logAbuseEvent } from "../audit.js";
import { generateCodenameSuggestions, registerStudent } from "../auth.js";
import { initPasswordVisibilityToggles } from "../password-toggle.js";
import { showToast } from "../ui.js";

async function init() {
  await bootstrapPage({ activeNav: "register" });
  initPasswordVisibilityToggles();

  const form = document.querySelector("[data-register-form]");
  const codenameInput = document.querySelector("[data-selected-codename]");
  const helpCopy = document.querySelector("[data-codename-help]");
  const previousButton = document.querySelector("[data-codename-prev]");
  const nextButton = document.querySelector("[data-codename-next]");
  const seenSuggestions = new Set();

  let currentOptions = [];
  let currentIndex = 0;
  let selectedCodename = "";

  function setSelectedCodename(codename) {
    selectedCodename = codename;

    if (codenameInput) {
      codenameInput.value = codename;
    }
  }

  function renderCurrentCodename() {
    const currentCodename = currentOptions[currentIndex];
    if (!currentCodename) {
      if (codenameInput) {
        codenameInput.value = "";
      }
      if (helpCopy) {
        helpCopy.textContent = "No codename options are available right now.";
      }
      setSelectedCodename("");
      return;
    }

    if (helpCopy) {
      helpCopy.innerHTML = `If you do not like these options, <button class="codename-refresh" type="button" data-refresh-codenames>show other options</button>.`;
    }

    setSelectedCodename(currentCodename);
    helpCopy?.querySelector("[data-refresh-codenames]")?.addEventListener("click", loadCodenameOptions);
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
  previousButton?.addEventListener("click", () => stepCodename(-1));
  nextButton?.addEventListener("click", () => stepCodename(1));
  codenameInput?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepCodename(-1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      stepCodename(1);
    }
  });

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
