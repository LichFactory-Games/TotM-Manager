console.log("TotM Manager: Script loading");

const moduleId = 'totm-manager';

import { totmManager } from './totmManager.js';
import { setuptotmManager } from './setup.js';
import { registerHooks } from './hooks.js';
import { getFilteredTiles } from './utilities.js';

console.log("TotM Manager: dependencies imported");

// Make TotM Manager available globally
window.totmManager = totmManager;

// Initialize the instance
window.totmManagerInstance = null;

// Register all hooks
registerHooks();
console.log("TotM Manager: hooks rendered");
