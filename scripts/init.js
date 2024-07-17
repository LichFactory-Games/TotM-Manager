// scripts/initialize.js

import { initializeHooks } from "./hooks.js";
import { setupModule, openTotMManager } from "./setup.js";

Hooks.once('init', async function() {
  console.log("Theatre of the Mind Manager | Initializing module");
  initializeHooks();
  await setupModule();

});

Hooks.once('ready', async function() {
  console.log("Theatre of the Mind Manager | Module is ready");
});
