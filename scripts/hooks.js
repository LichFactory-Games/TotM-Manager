// scripts/hooks.js
import { NAMESPACE, assignOrderToTiles, findTileById } from "./utilities.js";
import { TotMForm } from "./totmManager.js";
import { saveTileDataToFlags } from "./tiles-utils.js";

// Define moduleId
const moduleId = 'totm-manager';

export function initializeHooks() {

  // Register keybinding from settings
  game.keybindings.register(moduleId, 'openManager', {
    name: 'Open/Close TotM Manager',
    hint: 'Toggles the Theatre of the Mind Manager window.',
    editable: [{ key: 'KeyT', modifiers: ['Control'] }], // Set default keybinding
    onDown: () => {
      console.log("TotM Manager: Keybinding triggered");

      // Check if the singleton instance is rendered
      if (TotMForm._instance && TotMForm._instance.rendered) {
        // If the instance is rendered, close it (hide it)
        TotMForm._instance.close();
      } else {
        // If the instance is not rendered, render it
        TotMForm.renderSingleton();
      }
      return true;
    },
    restricted: true
  });

  game.settings.register(moduleId, 'initialTileTag', {
    name: 'Initial Tile Tag',
    hint: 'The tag of the initial tile to be selected when the module loads.',
    scope: 'world',
    config: true,
    type: String,
    default: 'scene', // You can set a default value here
    onChange: value => {
      console.log(`Initial Tile Tag setting changed to: ${value}`);
    }
  });

  // Register search image size setting
  game.settings.register(moduleId, 'imageSize', {
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
  game.settings.register(moduleId, 'previewImageSize', {
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

  // Hook into the getSceneControlButtons event
  Hooks.on("getSceneControlButtons", controls => {
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
          TotMForm.renderSingleton(); // Render the singleton instance
        },
        button: true
      });
    }
  });

  Hooks.on("renderChatLog", (app, html, data) => {
    console.log("Theatre of the Mind Manager | renderChatLog hook");
  });

  Hooks.on("renderSidebarTab", (app, html) => {
    console.log("Theatre of the Mind Manager | renderSidebarTab hook");
  });


  Hooks.on('createTile', (tile, options, userId) => {
  console.log('Tile created, assigning order...');
  assignOrderToTiles();
});

}
