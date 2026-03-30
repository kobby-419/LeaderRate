import { requireSupabaseClient } from "./supabase-client.js";

/*
 * The client can see browser details and compute a simple fingerprint hash,
 * but only the Edge Function can reliably capture request IP and user-agent
 * headers on the server side.
 */

export async function createFingerprintHash() {
  const raw = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screen.width,
    screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency || "na",
  ].join("|");

  const buffer = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function logAbuseEvent(eventType, metadata = {}) {
  const supabase = requireSupabaseClient();
  const fingerprintHash = await createFingerprintHash();

  const { error } = await supabase.functions.invoke("log-abuse", {
    body: {
      eventType,
      fingerprintHash,
      metadata,
    },
  });

  if (error) {
    console.warn("Abuse logging failed:", error.message);
  }

  return fingerprintHash;
}
