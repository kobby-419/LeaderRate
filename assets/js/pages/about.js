import { bootstrapPage } from "../app.js";

async function init() {
  await bootstrapPage({ activeNav: "about" });
}

init();
