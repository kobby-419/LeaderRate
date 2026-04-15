import { bootstrapPage } from "../app.js";
import { getLandingStats } from "../data.js";
import { showToast } from "../ui.js";

const HOME_SPLASH_KEY = "leaderrate-home-splash-seen";
const SPLASH_VISIBLE_MS = 2700;
const SPLASH_FADE_MS = 320;

function hideSplashImmediately() {
  const splash = document.getElementById("splash");
  if (!splash) {
    return;
  }

  splash.classList.remove("is-hiding");
  splash.classList.add("hidden");
}

function wait(duration) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

async function showSplashWithDelay() {
  const splash = document.getElementById("splash");
  if (!splash) {
    return;
  }

  splash.classList.remove("hidden");
  splash.classList.remove("is-hiding");
  await wait(SPLASH_VISIBLE_MS);
  splash.classList.add("is-hiding");
  await wait(SPLASH_FADE_MS);
  splash.classList.add("hidden");
  splash.classList.remove("is-hiding");
}

function shouldShowSplash() {
  try {
    if (sessionStorage.getItem(HOME_SPLASH_KEY) === "true") {
      return false;
    }

    sessionStorage.setItem(HOME_SPLASH_KEY, "true");
    return true;
  } catch {
    return false;
  }
}

async function init() {
  const shouldDisplaySplash = shouldShowSplash();
  const bootstrapPromise = bootstrapPage({ activeNav: "home" });

  if (!shouldDisplaySplash) {
    hideSplashImmediately();
  }

  if (shouldDisplaySplash) {
    await Promise.all([bootstrapPromise, showSplashWithDelay()]);
  } else {
    await bootstrapPromise;
  }

  try {
    const stats = await getLandingStats();
    document.querySelector("[data-stat-leaders]").textContent = String(stats.leaders);
    document.querySelector("[data-stat-feedback]").textContent = String(stats.approvedFeedback);
    document.querySelector("[data-stat-projects]").textContent = String(stats.projects);
    document.querySelector("[data-stat-rating]").textContent = `${stats.averageRating}/5`;
  } catch (error) {
    showToast(error.message, "error");
  }
}

init();
