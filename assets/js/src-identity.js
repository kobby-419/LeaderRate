/*
 * The identity switch shared by the three SRC pages.
 *
 * A leader has two names: the real name printed against their office in the
 * directory ("Isaac Asumah Asante") and the codename their account signs in
 * with ("steady_lantern"). This module remembers which one they are currently
 * speaking as, keeps the toggle markup in step with that choice, and hands the
 * answer back to whichever page needs to stamp a name onto a record.
 *
 * The choice is a presentation preference, so it lives in localStorage rather
 * than the database. Each page still writes both names onto the row it saves,
 * which means switching later never rewrites what was already published.
 */

const STORAGE_KEY = "leaderrate-src-identity";

function readStoredPreference() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "anonymous";
  } catch {
    return false;
  }
}

function writeStoredPreference(anonymous) {
  try {
    localStorage.setItem(STORAGE_KEY, anonymous ? "anonymous" : "real");
  } catch {
    /* A blocked storage API should not break the page. */
  }
}

/*
 * `realLabel` differs per page: the dashboard and feedback pages talk about a
 * "Real Identity", while the updates page frames the same switch as posting as
 * "Official SRC". The underlying state is identical.
 */
export function setupIdentityToggle({
  context,
  profile,
  realLabel = "Real Identity",
  anonymousLabel = "Anonymous",
  /*
   * What the "anonymous" side is actually called on this page. Replies fall
   * back to the codename, but an update simply carries the office name, so the
   * updates page passes its own wording.
   */
  anonymousNameText = null,
  onChange = null,
} = {}) {
  const toggle = document.querySelector("[data-identity-toggle]");
  const status = document.querySelector("[data-identity-status]");
  const realNameNode = document.querySelector("[data-real-name]");
  const anonymousNameNode = document.querySelector("[data-anonymous-name]");

  const realName = context?.leader?.display_name || context?.leader?.office_title || "Office holder";
  const codename = profile?.codename || context?.loginCodename || "anonymous_user";

  if (realNameNode) realNameNode.textContent = realName;
  if (anonymousNameNode) anonymousNameNode.textContent = anonymousNameText || codename;

  let anonymous = readStoredPreference();

  const apply = () => {
    if (toggle) toggle.checked = anonymous;
    if (status) {
      status.textContent = anonymous ? anonymousLabel : realLabel;
      status.classList.toggle("anonymous", anonymous);
      status.classList.toggle("real", !anonymous);
    }
  };

  apply();

  if (toggle && toggle.dataset.identityBound !== "true") {
    toggle.dataset.identityBound = "true";
    toggle.addEventListener("change", () => {
      anonymous = toggle.checked;
      writeStoredPreference(anonymous);
      apply();
      onChange?.(identitySnapshot());
    });
  }

  function identitySnapshot() {
    return {
      anonymous,
      codename,
      realName,
      /* The name a reader should actually see on the saved record. */
      displayName: anonymous ? null : realName,
      label: anonymous ? codename : realName,
    };
  }

  return {
    get current() {
      return identitySnapshot();
    },
    /*
     * Lets a page override the stored preference for a single action, such as
     * the "Respond anonymously" checkbox inside the response form.
     */
    resolve(overrideAnonymous) {
      const useAnonymous = typeof overrideAnonymous === "boolean" ? overrideAnonymous : anonymous;
      return {
        anonymous: useAnonymous,
        codename,
        realName,
        displayName: useAnonymous ? null : realName,
        label: useAnonymous ? codename : realName,
      };
    },
  };
}

/*
 * Records store both names, so read them back in the same order every time:
 * a real name when one was published, otherwise the codename.
 */
export function authorLabel(record, fallback = "anonymous_user") {
  return record?.author_display_name || record?.author_codename_snapshot || fallback;
}
