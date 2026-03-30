/*
 * This file creates one shared Supabase browser client.
 * Every page imports from here so auth state and database access stay consistent.
 */

const appConfig = window.LEADERRATE_CONFIG || {};
const hasSupabaseConfig = Boolean(appConfig.supabaseUrl && appConfig.supabaseAnonKey);

const supabaseClient = hasSupabaseConfig
  ? window.supabase.createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey)
  : null;

function requireSupabaseClient() {
  if (!supabaseClient) {
    throw new Error("Supabase is not configured yet. Update assets/js/config.js first.");
  }

  return supabaseClient;
}

export {
  appConfig,
  hasSupabaseConfig,
  supabaseClient,
  requireSupabaseClient,
};
