/*
 * Switching between a leader account and a personal anonymous one.
 *
 * Leaders are students too. They answer feedback from the account that speaks
 * for their office, but they also want to browse and rate offices as an
 * ordinary anonymous student. Those are two separate accounts on purpose:
 * nothing in the database links them, so a leader's student activity cannot be
 * traced back to their office.
 *
 * That separation is also why this module exists. Because the two accounts are
 * unrelated, the app cannot look up "the other one" -- it can only remember
 * that this browser has signed into both. So each successful login parks its
 * session in a slot named after its role, and switching restores the other
 * slot's session.
 *
 * We store the session Supabase already persists (access token and refresh
 * token) and never a password. That is the same secret the Supabase client
 * keeps in localStorage to stay signed in, so holding a second one adds no new
 * kind of exposure -- only a second instance of it. Both are cleared on logout.
 */

import { requireSupabaseClient } from "./supabase-client.js";

const SLOT_STORAGE_KEY = "leaderrate-account-slots";

/* Only these two kinds of account can be switched between. */
const SWITCHABLE_ROLES = ["leader", "student"];

function readSlots() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SLOT_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSlots(slots) {
  try {
    localStorage.setItem(SLOT_STORAGE_KEY, JSON.stringify(slots));
  } catch {
    /* A blocked storage API just means switching is unavailable. */
  }
}

export function clearAccountSlots() {
  try {
    localStorage.removeItem(SLOT_STORAGE_KEY);
  } catch {
    /* Nothing to do. */
  }
}

/*
 * Called after a successful sign-in and on every page load, so a session that
 * was refreshed in the background does not leave a stale token behind.
 */
export function rememberAccountSlot(profile, session) {
  if (!profile || !session?.refresh_token || !SWITCHABLE_ROLES.includes(profile.role)) {
    return;
  }

  const slots = readSlots();
  slots[profile.role] = {
    codename: profile.codename,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
  };
  writeSlots(slots);
}

/*
 * The account this browser could switch to: the one whose role is not the role
 * currently signed in. Returns null when only one account has been used here.
 */
export function getAlternateAccount(profile) {
  if (!profile || !SWITCHABLE_ROLES.includes(profile.role)) {
    return null;
  }

  const otherRole = profile.role === "leader" ? "student" : "leader";
  const slot = readSlots()[otherRole];
  if (!slot?.refreshToken || slot.codename === profile.codename) {
    return null;
  }

  return { role: otherRole, codename: slot.codename };
}

function dashboardRoute(role) {
  if (role === "admin") {
    return "admin-dashboard.html";
  }

  return role === "leader" ? "src-dashboard.html" : "dashboard.html";
}

/*
 * Restores the stored session for the other role. Refresh tokens expire and can
 * be revoked, so a failure here is expected rather than exceptional: we forget
 * the dead slot and send the user to a normal login instead of stranding them.
 */
export async function switchToAccount(targetRole) {
  const slots = readSlots();
  const slot = slots[targetRole];

  if (!slot?.refreshToken) {
    return { ok: false, reason: "not-linked" };
  }

  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.auth.setSession({
    access_token: slot.accessToken,
    refresh_token: slot.refreshToken,
  });

  if (error || !data?.session) {
    delete slots[targetRole];
    writeSlots(slots);
    return { ok: false, reason: "expired", codename: slot.codename };
  }

  /*
   * setSession may hand back rotated tokens, so write them straight back or the
   * next switch would replay one that has already been spent.
   */
  slots[targetRole] = {
    codename: slot.codename,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
  writeSlots(slots);

  return { ok: true, route: dashboardRoute(targetRole), codename: slot.codename };
}
