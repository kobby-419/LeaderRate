import { bootstrapPage } from "../app.js";
import { getLandingStats } from "../data.js";
import { showToast } from "../ui.js";

function runSplashSequence() {
  const splash = document.getElementById("splash");
  const lrLogo = document.getElementById("lrLogo");
  const splashText = document.getElementById("splashText");

  if (!splash || !lrLogo || !splashText) {
    return;
  }

  setTimeout(() => {
    lrLogo.remove();
    const fullName = document.createElement("div");
    fullName.className = "splash-logo-full";
    fullName.textContent = "LeaderRate";
    splashText.appendChild(fullName);
  }, 1000);

  setTimeout(() => {
    splash.style.opacity = "0";
    setTimeout(() => {
      splash.style.display = "none";
    }, 600);
  }, 2200);
}

async function init() {
  await bootstrapPage({ activeNav: "home" });
  runSplashSequence();

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
