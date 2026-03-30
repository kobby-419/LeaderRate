import {
  BLOCKED_WORDS,
  CODENAME_WORDS,
  RESERVED_CODENAME_PARTS,
} from "./constants.js";
import { appConfig, requireSupabaseClient } from "./supabase-client.js";

/*
 * Supabase Auth expects email + password. To keep the public UX codename-only,
 * the frontend quietly maps codenames to internal synthetic email addresses.
 * Users never type or see those emails in the app.
 */

export function codenameToEmail(codename, role = "student") {
  const normalized = String(codename || "").trim().toLowerCase();
  return `${normalized}@${role}.${appConfig.institutionSlug}.leaderrate.local`;
}

export function validateCodename(rawCodename) {
  const codename = String(rawCodename || "").trim().toLowerCase();
  const errors = [];

  if (codename.length < 4 || codename.length > 24) {
    errors.push("Codename must be between 4 and 24 characters.");
  }

  if (!/^[a-z0-9_]+$/.test(codename)) {
    errors.push("Codename can only contain letters, numbers, and underscores.");
  }

  if (RESERVED_CODENAME_PARTS.some((part) => codename.includes(part))) {
    errors.push("Choose a codename that does not impersonate an official role.");
  }

  if (BLOCKED_WORDS.some((word) => codename.includes(word))) {
    errors.push("Choose a respectful codename.");
  }

  return {
    codename,
    errors,
  };
}

export function validatePassword(password) {
  const value = String(password || "");
  const errors = [];

  if (value.length < 8) {
    errors.push("Password must be at least 8 characters.");
  }

  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) {
    errors.push("Password must include uppercase, lowercase, and a number.");
  }

  return errors;
}

function randomIndex(max) {
  if (window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] % max;
  }

  return Math.floor(Math.random() * max);
}

function randomDigits() {
  const digitCount = randomIndex(2) + 2;
  const minimum = digitCount === 2 ? 10 : 100;
  const maximum = digitCount === 2 ? 90 : 900;
  return String(minimum + randomIndex(maximum));
}

function makeGeneratedCodename() {
  /*
   * Student codenames are now one pronounceable word followed by 2 or 3
   * digits. That keeps them short enough to remember while still giving the
   * generator plenty of combinations.
   */
  return `${CODENAME_WORDS[randomIndex(CODENAME_WORDS.length)]}${randomDigits()}`;
}

export function generateCodenameSuggestions({ count = 6, exclude = [] } = {}) {
  /*
   * Students no longer invent their own aliases in the form. The UI offers a
   * short list of generated codenames instead. Final duplicate protection still
   * happens at sign-up because Supabase Auth and the profiles table enforce it.
   */
  const suggestions = [];
  const used = new Set(exclude.map((value) => String(value || "").trim().toLowerCase()));
  let attempts = 0;

  while (suggestions.length < count && attempts < 500) {
    attempts += 1;
    const candidate = makeGeneratedCodename();
    if (used.has(candidate)) {
      continue;
    }

    const validation = validateCodename(candidate);
    if (validation.errors.length) {
      continue;
    }

    used.add(validation.codename);
    suggestions.push(validation.codename);
  }

  if (suggestions.length < count) {
    throw new Error("Could not generate enough codename options. Try again.");
  }

  return suggestions;
}

export async function getCurrentSession() {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  return data.session;
}

export async function getCurrentProfile() {
  const supabase = requireSupabaseClient();
  const session = await getCurrentSession();
  if (!session?.user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (error) {
    /*
     * New auth users should get a profile row through the database trigger,
     * but the browser can occasionally ask for the profile before that row is
     * visible. Falling back to auth metadata keeps the header and redirects
     * usable during that short window.
     */
    if (error.code === "PGRST116" || error.details?.includes("0 rows")) {
      return {
        id: session.user.id,
        codename: session.user.user_metadata?.codename || "anonymous_user",
        role: session.user.user_metadata?.role || "student",
        institution_slug: session.user.user_metadata?.institution_slug || appConfig.institutionSlug,
      };
    }

    throw error;
  }

  return data;
}

export async function registerStudent({ codename, password, confirmPassword }) {
  const supabase = requireSupabaseClient();
  const codenameCheck = validateCodename(codename);
  const passwordErrors = validatePassword(password);

  if (password !== confirmPassword) {
    passwordErrors.push("Password confirmation does not match.");
  }

  const errors = [...codenameCheck.errors, ...passwordErrors];
  if (errors.length) {
    throw new Error(errors[0]);
  }

  const email = codenameToEmail(codenameCheck.codename, "student");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        codename: codenameCheck.codename,
        role: "student",
        institution_slug: appConfig.institutionSlug,
      },
    },
  });

  if (error) {
    if (String(error.message || "").toLowerCase().includes("already")) {
      throw new Error("That codename is no longer available. Show new options and try again.");
    }

    throw error;
  }

  return data;
}

export async function loginWithCodename({ codename, password, adminMode = false }) {
  const supabase = requireSupabaseClient();
  const normalizedCodename = String(codename || "").trim().toLowerCase();
  const rolesToTry = adminMode ? ["admin"] : ["student", "leader"];

  if (!normalizedCodename) {
    throw new Error("Enter your codename to continue.");
  }

  for (const role of rolesToTry) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: codenameToEmail(normalizedCodename, role),
      password,
    });

    if (error) {
      continue;
    }

    if (role === "leader") {
      await claimSeededLeaderAccount();
    }

    return {
      ...data,
      authenticatedRole: role,
    };
  }

  throw new Error(
    adminMode
      ? "Admin login failed. Check the codename and password."
      : "Login failed. Check your codename and password."
  );
}

export async function logout() {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function claimSeededLeaderAccount() {
  const supabase = requireSupabaseClient();
  const { error } = await supabase.rpc("claim_seeded_leader_account");
  if (error) {
    throw error;
  }
}
