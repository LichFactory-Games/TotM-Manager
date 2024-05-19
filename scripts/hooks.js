const moduleId = 'totm-manager';

import { setuptotmManager } from './setup.js';
import { getFilteredTiles } from './utilities.js';
import { totmManager } from './totmManager.js';

export function registerHooks() {
    Hooks.once("init", async () => {
        console.log("TotM Manager: Init hook called");

        if (!game.modules.get(moduleId)?.active) {
            console.error("TotM Manager module is not activated!");
            return;
        }

        console.log(`Initializing TotM Manager.`);

        try {
            // Load templates
            await loadTemplates(["modules/totm-manager/templates/totmm-window-template.hbs"]);
            console.log('Templates loaded successfully.');
        } catch (error) {
            console.error('Error loading templates:', error);
        }

        // Register the keybinding setting
        game.settings.register(moduleId, 'keybindingOpenManager', {
            name: 'Open TotM Manager',
            hint: 'Set the keybinding to open the TotM Manager.',
            scope: 'client',
            config: false,
            type: Object,
            default: {
                key: 'KeyT',
                modifiers: ['CONTROL']
            }
        });

        // Register keybinding from settings
        const keybinding = game.settings.get(moduleId, 'keybindingOpenManager');
        game.keybindings.register(moduleId, 'openManager', {
            name: 'Open TotM Manager',
            hint: 'Opens the Theatre of the Mind Manager window.',
            editable: [keybinding],
            onDown: () => {
                console.log("TotM Manager: Keybinding triggered");
                if (!window.totmManagerInstance || window.totmManagerInstance.rendered === false) {
                    const tiles = getFilteredTiles();
                    window.totmManagerInstance = new totmManager(tiles);
                    window.totmManagerInstance.render(true);
                } else {
                    window.totmManagerInstance.bringToTop();
                }
                return true;
            },
            restricted: true
        });
        console.log("TotM Manager: Keybinding registered");
    });

    Hooks.once('ready', async () => {
        console.log("TotM Manager: Ready hook called");
        if (game.modules.get('tagger')?.active) {  // Check if 'Tagger' module is active
            await setuptotmManager();
            console.log("TotM Manager Script loaded and setup completed successfully.");
        } else {
            console.warn("Required module 'Tagger' is not active.");
        }
    });

    Hooks.on('getSceneControlButtons', function (controls) {
        console.log("TotM Manager: getSceneControlButtons hook called");
        let tileControl = controls.find(c => c.name === "tiles");
        if (tileControl) {
            console.log("TotM Manager: Adding button to tile controls");
            tileControl.tools.push({
                name: "totmManager",
                title: "Theatre of the Mind Manager",
                icon: "fas fa-mask",
                onClick: () => {
                    console.log("TotM Manager: Button clicked");
                    if (!window.totmManagerInstance || window.totmManagerInstance.rendered === false) {
                        const tiles = getFilteredTiles();
                        window.totmManagerInstance = new totmManager(tiles);
                        window.totmManagerInstance.render(true);
                        console.log("TotM Manager: Instance created and rendered");
                    } else {
                        window.totmManagerInstance.bringToTop();
                        console.log("TotM Manager: Instance brought to top");
                    }
                },
                button: true
            });
        }
    });
}
