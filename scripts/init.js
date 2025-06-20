// scripts/initialize.js

import { initializeHooks } from "./hooks.js";
import { setupModule, openTotMManager } from "./setup.js";

Hooks.once('init', async function() {
  console.log("Theatre of the Mind Manager | Initializing module");
  
  try {
    await setupModule();
  } catch (error) {
    console.error("Theatre of the Mind Manager | Error in setupModule:", error);
  }
  
  initializeHooks();
});

Hooks.once('ready', async function() {
  console.log("Theatre of the Mind Manager | Module is ready");
});
