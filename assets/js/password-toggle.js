const EYE_ICON = `
  <span class="password-toggle-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="M1.5 12s3.9-6.5 10.5-6.5S22.5 12 22.5 12 18.6 18.5 12 18.5 1.5 12 1.5 12Z"></path>
      <circle cx="12" cy="12" r="3.2"></circle>
    </svg>
  </span>
`;

const EYE_OFF_ICON = `
  <span class="password-toggle-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="M3 3l18 18"></path>
      <path d="M10.6 5.7A10.5 10.5 0 0 1 12 5.5C18.6 5.5 22.5 12 22.5 12a19.2 19.2 0 0 1-4.1 4.9"></path>
      <path d="M6.2 6.2A19.7 19.7 0 0 0 1.5 12S5.4 18.5 12 18.5c1.9 0 3.5-.5 4.8-1.2"></path>
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"></path>
    </svg>
  </span>
`;

function setPasswordVisibility(field, visible) {
  const input = field.querySelector("[data-password-input]");
  const button = field.querySelector("[data-password-toggle]");

  if (!input || !button) {
    return;
  }

  const label = input.dataset.passwordLabel || "password";
  input.type = visible ? "text" : "password";
  button.innerHTML = visible ? EYE_OFF_ICON : EYE_ICON;
  button.setAttribute("aria-label", `${visible ? "Hide" : "Show"} ${label}`);
  button.setAttribute("aria-pressed", String(visible));
}

export function initPasswordVisibilityToggles(root = document) {
  root.querySelectorAll("[data-password-field]").forEach((field) => {
    const input = field.querySelector("[data-password-input]");
    const button = field.querySelector("[data-password-toggle]");

    if (!input || !button || button.dataset.passwordToggleBound === "true") {
      return;
    }

    button.dataset.passwordToggleBound = "true";
    setPasswordVisibility(field, false);

    button.addEventListener("click", () => {
      setPasswordVisibility(field, input.type === "password");
    });
  });
}
