// scripts/hooks.js
import { assignOrderToTiles } from "./utilities.js";
import { TotMForm } from "./totmManager.js";

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

  game.settings.register(moduleId, 'imageTransitionDuration', {
    name: "Image Transition Duration",
    hint: "Duration of the image transition effect in milliseconds.",
    scope: 'world',
    config: true,
    type: Number,
    default: 500,
  });

  game.settings.register(moduleId, 'imageTransitionIncrement', {
    name: "Image Transition Increment",
    hint: "Increment value for the image transition effect.",
    scope: 'world',
    config: true,
    type: Number,
    default: 0.01,
  });

  game.settings.register(moduleId, 'imageTransitionTargetAlpha', {
    name: "Image Transition Target Alpha",
    hint: "Target alpha value for the image transition effect. 0 is fully transparent, 1 is fully opaque.",
    scope: 'world',
    config: true,
    type: Number,
    default: 0.5,
    range: {
      min: 0,
      max: 1,
      step: 0.01
    }
  });

  game.settings.register(moduleId, 'initialTileTag', {
    name: 'Initial Tile Tag',
    hint: 'The tag of the initial tile to be selected when the module loads.',
    scope: 'world',
    config: true,
    type: String,
    default: 'scene',
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

  function addTotMButton(controls) {
    // In v13, controls is an object, not an array
    let tileControl;
    if (Array.isArray(controls)) {
      // Legacy v12 format - array
      tileControl = controls.find(c => c.name === "tiles");
    } else if (typeof controls === 'object' && controls !== null) {
      // v13 format - object
      tileControl = controls.tiles;
    } else {
      return false;
    }
    
    if (tileControl) {
      // In v13, tools is an object, not an array
      if (!tileControl.tools) {
        tileControl.tools = {};
      }
      
      // Handle both array (v12) and object (v13) formats
      let hasExisting;
      if (Array.isArray(tileControl.tools)) {
        // Legacy v12 format - tools is an array
        hasExisting = tileControl.tools.some(t => (t.name === "totmManager" || t.tool === "totmManager"));
      } else {
        // v13 format - tools is an object
        hasExisting = "totmManager" in tileControl.tools;
      }
      
      if (!hasExisting) {
        const buttonConfig = {
          name: "totmManager",
          title: "Theatre of the Mind Manager",
          icon: "fas fa-mask",
          onClick: () => {
            TotMForm.renderSingleton();
          },
          button: true
        };
        
        if (Array.isArray(tileControl.tools)) {
          // Add to array (v12)
          tileControl.tools.push(buttonConfig);
        } else {
          // Add to object (v13)
          tileControl.tools.totmManager = buttonConfig;
        }
        return true;
      }
    }
    return false;
  }


  // Hook into the getSceneControlButtons event
  Hooks.on("getSceneControlButtons", (controls) => {
    if (canvas.ready && game.scenes.active) {
      if (addTotMButton(controls)) {
        ui.controls.render();
      }
    }
  });

  Hooks.on('canvasReady', () => {
    if (canvas.ready && game.user.isGM) {
      assignOrderToTiles();
      
      // Refresh the form if it's open
      if (TotMForm._instance && TotMForm._instance.rendered) {
        TotMForm._instance.refreshManagerData();
      }
    }
  });

  Hooks.on('createTile', (tile, options, userId) => {
    if (game.user.isGM) {
      assignOrderToTiles();
    }
  });

}
