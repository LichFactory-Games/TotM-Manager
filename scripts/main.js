//// Setup & Initialization
console.log("TotM Manager: Script loaded");

const moduleId = 'totm-manager';
import { totmManager } from './totmManager.js';

console.log("TotM Manager: file imported");

// Setup function that encapsulates instantiation and event listener configuration
async function setuptotmManager() {

    const matchesTags = tile => {
        try {
            const tags = Tagger.getTags(tile);
            console.log("Tile:", tile, "Tags:", tags);  // Detailed tag logging
            return tags.includes('scene') || tags.some(tag => /^speaker\d+$/.test(tag));
        } catch (error) {
            console.error("Error getting tags for tile:", tile, error);
            return false;  // If error in getting tags, exclude this tile
        }
    };

    // Detailed logging to verify tiles before filtering
    canvas.tiles.placeables.forEach(tile => {
        const tags = Tagger.getTags(tile);
        console.log("Pre-filter Tile:", tile, "Tags:", tags);
    });

    // Filter tiles based on matching tags
    const tiles = canvas.tiles.placeables.filter(matchesTags);
    console.log("Filtered tiles after matching tags:", tiles);

    if (tiles.length === 0) {
        console.warn("No tiles found with specified tags.");
        return;  // Exit if no matching tiles are found
    }
}


Hooks.once("init", async () => {  // Declare the function as async
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

    // Register keybinding
    game.keybindings.register('totm-manager', 'openManager', {
        name: 'Open TotM Manager',
        hint: 'Opens the Theatre of the Mind Manager window.',
        editable: [{key: 'KeyT', modifiers: [KeyboardManager.MODIFIER_KEYS.CONTROL]}],  // Ctrl + T
        onDown: () => {
            // Check if the totmManager instance already exists
            if (!totmManagerInstance || totmManagerInstance.rendered === false) {
                const tiles = getFilteredTiles(); // Make sure you define how to retrieve the tiles
                totmManagerInstance = new totmManager(tiles);
                totmManagerInstance.render(true);
            } else {
                totmManagerInstance.bringToTop(); // If already open, bring to front
            }
            return true; // Indicates the keybinding was handled
        },
        restricted: true // Restrict this keybinding to GM or make false for all players
    });

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

// Filter and return tiles
function getFilteredTiles() {
    console.log("TotM Manager: Filtering tiles");
    const tiles = canvas.tiles.placeables.filter(tile => {
        try {
            const tags = Tagger.getTags(tile);
            return tags.includes('scene') || tags.some(tag => /^speaker\d+$/.test(tag));
        } catch (error) {
            console.error("Error getting tags for tile:", tile, error);
            return false;
        }
    });

    if (tiles.length === 0) {
        console.warn("No tiles found with specified tags.");
        return [];
    }
    return tiles;
}

// Render button
Hooks.on('getSceneControlButtons', function(controls) {
    console.log("TotM Manager: getSceneControlButtons hook called");
    let tileControl = controls.find(c => c.name === "tiles");
    if (tileControl) {
        tileControl.tools.push({
            name: "totmManager",
            title: "Theatre of the Mind Manager",
            icon: "fas fa-mask",
            onClick: () => {
                // Check if the totmManager instance already exists
                if (!totmManagerInstance || totmManagerInstance.rendered === false) {
                    const tiles = getFilteredTiles(); // Get the filtered tiles right when the button is clicked
                    totmManagerInstance = new totmManager(tiles);
                    totmManagerInstance.render(true);
                } else {
                    totmManagerInstance.bringToTop(); // If already open, bring to front
                }
            },
            button: true
        });
    }
});

// Make TotM Manager available globally
window.totmManager = totmManager;

console.log("TotM Manager Script loaded successfully.");
