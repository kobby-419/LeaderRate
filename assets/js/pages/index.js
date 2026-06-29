import { bootstrapPage } from "../app.js";
import { getLandingStats } from "../data.js";
import { showToast } from "../ui.js";

const SPLASH_VISIBLE_MS = 2700;
const SPLASH_FADE_MS = 320;

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
  splash.setAttribute("aria-hidden", "false");
  await wait(SPLASH_VISIBLE_MS);
  splash.classList.add("is-hiding");
  await wait(SPLASH_FADE_MS);
  splash.classList.add("hidden");
  splash.classList.remove("is-hiding");
  splash.setAttribute("aria-hidden", "true");
}

async function init() {
  const bootstrapPromise = bootstrapPage({ activeNav: "home" });
  await Promise.all([bootstrapPromise, showSplashWithDelay()]);

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
