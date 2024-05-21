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

        // Register search image size setting
        game.settings.register('totm-manager', 'imageSize', {
            name: 'Search Image Size',
            hint: 'Set the size of images in search results.',
            scope: 'client',
            config: true,
            type: Number,
            range: {
                min: 50,
                max: 300,
                step: 10
            },
            default: 100
        });

        // Register preview image size setting
        game.settings.register('totm-manager', 'previewImageSize', {
            name: 'Preview Image Size',
            hint: 'Set the size of the preview images.',
            scope: 'client',
            config: true,
            type: Number,
            range: {
                min: 50,
                max: 300,
                step: 10
            },
            default: 200
        });

        // Register keybinding from settings
        game.keybindings.register(moduleId, 'openManager', {
            name: 'Open TotM Manager',
            hint: 'Opens the Theatre of the Mind Manager window.',
            editable: [{ key: 'KeyT', modifiers: ['Control'] }], // Set default keybinding
            onDown: () => {
                console.log("TotM Manager: Keybinding triggered");
                if (!window.totmManagerInstance || window.totmManagerInstance.rendered === false) {
                    const tiles = getFilteredTiles();
                    window.totmManagerInstance = new totmManager(tiles);
                    window.totmManagerInstance.render(true);
                } else {
                    window.totmManagerInstance.close();
                }
                return true;
            },
            restricted: true
        });

        // Register keybinding for opening TotM Manager and focusing search
        game.keybindings.register('totm-manager', 'openAndFocusSearch', {
            name: 'Open TotM Manager and Focus Search',
            hint: 'Open the TotM Manager window and focus on the search field.',
            editable: [{ key: 'KeyF', modifiers: ['Control'] }], // Set default keybinding
            onDown: () => {
                console.log("TotM Manager: Focus search keybinding triggered");
                if (window.totmManagerInstance && window.totmManagerInstance.rendered) {
                    window.totmManagerInstance.bringToTop();
                    window.totmManagerInstance.focusSearchField();
                } else {
                    const tiles = getFilteredTiles();
                    window.totmManagerInstance = new totmManager(tiles);
                    window.totmManagerInstance.render(true);
                    window.totmManagerInstance.focusSearchField();
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
                    if (!window.totmManagerInstance) {
                        const tiles = getFilteredTiles();
                        window.totmManagerInstance = new totmManager(tiles);
                        window.totmManagerInstance.render(true);
                        console.log("TotM Manager: Instance created and rendered");
                    } else if (window.totmManagerInstance.rendered === false) {
                        window.totmManagerInstance.render(true);
                        console.log("TotM Manager: Instance rendered again");
                    } else {
                        window.totmManagerInstance.close();
                        console.log("TotM Manager: Instance closed");
                    }
                },
                button: true
            });
        }
    });
}
