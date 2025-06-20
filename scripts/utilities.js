// scripts/utilities.js

//// Define namespace
export const NAMESPACE = 'totm-manager';

//// Check Permissions
function isUserGM() {
  if (!game.user.isGM) {
    console.log("User is not GM. Action aborted.");
    ui.notifications.warn("You do not have permission to perform this action.");
    return false;
  }
  return true;
}

//// Handlebars
// Register custom Handlebars helper
Handlebars.registerHelper('jsonStringify', function (context) {
    return JSON.stringify(context);
});


/////////////////////
// Logging Helpers //
/////////////////////

export function logMessage(...message) {
  console.log(`Theatre of the Mind Manager | `, ...message);
}

export function showNotification(message, type="info") {
  ui.notifications.notify(message, type);
}

export function getElementByIdOrWarn(id, type) {
  const element = document.getElementById(id);
  if (!element) {
    console.error(`${type} element not found!`);
  }
  return element;
}

//////////////////////
//  Color Helpers   //
//////////////////////

export function hexToDecimal(hex) {
  if (hex.startsWith('#')) {
    hex = hex.slice(1); // Remove the '#' character
  }
  return parseInt(hex, 16);
}

export function decimalToHex(decimal) {
  return `#${decimal.toString(16).padStart(6, '0')}`;
}

export function adjustColor(hex, amount) {
  let color = parseInt(hex.slice(1), 16); // Remove '#' and convert to decimal
  let r = Math.max(0, Math.min(255, ((color >> 16) & 0xFF) + amount));
  let g = Math.max(0, Math.min(255, ((color >> 8) & 0xFF) + amount));
  let b = Math.max(0, Math.min(255, (color & 0xFF) + amount));
  // Combine adjusted RGB values back into a single decimal value
  let adjustedColor = (r << 16) + (g << 8) + b;
  return adjustedColor;
}

/////////////////////
//  Tiles & Tags   //
/////////////////////

/**
 * Finds a tile on the canvas by its ID.
 * @param {string} tileId - The ID of the tile to find.
 * @returns {Tile|null} - The found tile or null if not found.
 */
export function findTileById(tileId) {
  return canvas.tiles.placeables.find(t => t.id === tileId) || null;
}


// Updated findAndSwitchToTileByTag function
export function findAndSwitchToTileByTag(instance, tag, switchToTile = true) {
  // Validate the tag
  if (typeof tag !== 'string' || tag.trim() === '') {
    console.error("Invalid tag type:", tag);
    return null;
  }

  const tiles = getFilteredTiles();
  logMessage(`TotM - Checking for tiles with tag: ${tag}`);

  // Find the tile with the specified tag using Tagger
  const foundTile = tiles.find(tile => {
    const tileTags = Tagger.getTags(tile);
    return tileTags.includes(tag);
  });

  if (foundTile) {
    logMessage(`Tile found with tag ${tag}:`, foundTile);
    if (switchToTile) {
      activateTile(instance, foundTile);
    }
    return foundTile;
  } else {
    console.warn(`No tile found with the tag: ${tag}`);
    return null;
  }
}


////

export async function activateTile(instance, tile) {
  if (!tile) {
    console.error("No tile provided.");
    return;
  }

  instance.currentTile = tile;

  const filteredTiles = getFilteredTiles();
  if (!filteredTiles.includes(tile)) {
    console.error("Tile is not in the filtered list of tiles.");
    return;
  }

  // Check if tile is a valid Foundry Tile object
  const TileClass = foundry.canvas?.placeables?.Tile || Tile;
  if (!(tile instanceof TileClass)) {
    console.error("Invalid tile object passed:", tile);
    return;
  }

  // Ensure the tiles layer is active
  if (canvas.tiles) {
    canvas.tiles.activate();
    console.log("Tiles layer activated.");
  } else {
    console.error("Tiles layer is not available.");
    return;
  }

  // Ensure the tile is not destroyed
  if (tile.destroyed) {
    console.error("Tile is destroyed:", tile);
    return;
  }

  // Ensure the parent scene is active
  if (!tile.scene || !tile.scene.active) {
    console.warn("Tile's parent scene is not active or missing:", tile.scene);
    }

  // Log tile properties for debugging
  console.log("Tile properties:", {
    id: tile.id,
    destroyed: tile.destroyed,
    controlled: tile._controlled,
    layer: tile.layer,
    scene: tile.scene
  });


  // Directly set control properties and force refresh
  console.log("Attempting to control tile:", tile);
  try {
    canvas.tiles.releaseAll();
    tile.control({ releaseOthers: true });
    tile.refresh();
    console.log("Tile should now be controlled:", tile);

    instance.currentTile = tile;
    instance.currentTileId = tile.id;
    console.log(`Set current tile to ID ${tile.id}`);
  } catch (e) {
    console.error("Failed to control the tile:", tile);
  }
}

////

export function getFilteredTiles() {
  console.log("TotM Manager: Filtering tiles");
  const tiles = canvas.tiles.placeables.filter(tile => {
    try {
      const tags = Tagger.getTags(tile);
      return tags.length > 0; // Filter tiles with any tags
    } catch (error) {
      console.error("Error getting tags for tile:", tile, error);
      return false;
    }
  });

  if (tiles.length === 0) {
    console.warn("No tiles found with tags.");
    return [];
  }
  return tiles;
}

////

export function updateTileButtons(instance) {
  const stageButtonsContainers = $('.stage-buttons-container');

  if (!stageButtonsContainers.length) {
    console.warn('Stage buttons container not found.');
    return;
  }

  logMessage("instance.tiles content:", instance.tiles);

  stageButtonsContainers.each((index, stageButtonsContainer) => {
    const $stageButtonsContainer = $(stageButtonsContainer);
    const currentButtons = $stageButtonsContainer.find('.tile-button');
    const currentButtonNames = currentButtons.map((_, button) => $(button).data('tileName')).get();
    const instanceTileNames = instance.tiles.map(tile => tile.name);

    if (JSON.stringify(currentButtonNames) !== JSON.stringify(instanceTileNames)) {
      $stageButtonsContainer.empty();
      instance.tiles.forEach((tile, index) => {
        logMessage(`Processing tile ${index}:`, tile);
        if (tile.name) {
          const $button = $('<button>', {
            type: 'button',
            class: 'tile-button',
            'data-tile-name': tile.name,
            'data-tile-id': tile.id,
            text: tile.name || `Tile ${index + 1}`
          });
          $stageButtonsContainer.append($button);
          logMessage(`Created button for tile: ${tile.name}`);
        } else {
          logMessage(`Tile ${index} does not have a name.`);
        }
      });
    }
  });
}

export function updateActiveTileButton(instance) {
  if (!game.user.isGM) {
    console.log("User is not GM. Skipping assignOrderToTiles.");
    return;
  }
  logMessage("updateActiveTileButton called");
  if (!instance.currentTile || !instance.currentTile.document) {
    console.warn("No currently active tile or missing document property.");
    return;
  }
  const tileName = instance.currentTile.document.getFlag(NAMESPACE, 'tileName');
  if (!tileName) {
    console.warn("Current tile does not have a tileName flag.");
    return;
  }
  logMessage(`Current tile ID: ${instance.currentTile.id}, Tile name: "${tileName}"`);

  // Remove the active class from all tile buttons
  $('.totm-manager.tile-button').removeClass('active-button');
  logMessage("Removed active class from all tile buttons");

  // Select the button corresponding to the current tile
  const selector = `.totm-manager.tile-button[data-tile-name="${tileName}"]`;
  logMessage("Selecting button with selector: ", selector);

  logMessage(`All totm-manager tile buttons: ${$('.totm-manager.tile-button').length}`);
  logMessage(`Buttons matching selector: ${$(selector).length}`);

  const $activeButton = $(selector);
  if (!$activeButton.length) {
    console.warn("No button found with selector: ", selector);
    return;
  }

  // Add the active class to the selected button
  $activeButton.addClass('active-button');
  logMessage("Active button updated:", $activeButton);
}

/**
 * Assigns a unique order number to each tile on the canvas that has an undefined order.
 * Preserves existing order values.
 */
export function assignOrderToTiles() {
  if (!game.user.isGM) {
    console.log("User is not GM. Skipping assignOrderToTiles.");
    return;
  }

  // Get all existing orders
  let existingOrders = new Set(canvas.tiles.placeables.map(tile => Number(tile.document.getFlag(NAMESPACE, 'order'))).filter(order => order !== undefined && order !== null));

  // Find the max order value
  let maxOrder = existingOrders.size > 0 ? Math.max(...existingOrders) : 0;

  // Assign orders to tiles without one
  canvas.tiles.placeables.forEach(tile => {
    let order = Number(tile.document.getFlag(NAMESPACE, 'order'));
    if (order === undefined || order === null || existingOrders.has(order)) {
      maxOrder += 1;
      tile.document.setFlag(NAMESPACE, 'order', maxOrder);
      existingOrders.add(maxOrder);
      logMessage(`Set order flag for tile ID: ${tile.id}, Order: ${maxOrder}`);
    }
  });
  logMessage("Assigned unique order numbers to tiles.");
}

////

export function getTileFlag(tile, flagName, defaultValue = []) {
  const flag = tile.document.getFlag(NAMESPACE, flagName);
  return flag !== undefined ? flag : defaultValue;
}

////////////////////////
// Populate Dropdowns //
////////////////////////

export async function populateEffectsDropdown() {
  // Check if TokenMagic is available
  if (!game.modules.get("tokenmagic")?.active) {
    console.warn("TokenMagic module is not active.");
    return;
  }

  let presets = [];
  
  // Try different methods to get presets based on TokenMagic version
  try {
    // First check if we can access presets directly without calling a method
    if (typeof TokenMagic !== 'undefined') {
      // Try to get built-in presets first (safer)
      if (TokenMagic.presets) {
        presets = TokenMagic.presets;
      } else if (TokenMagic._presets) {
        presets = TokenMagic._presets;
      } else if (TokenMagic.getPresets && typeof TokenMagic.getPresets === 'function') {
        // Only try to call getPresets if we're sure it won't throw
        try {
          // Check if the required setting exists first
          if (game.settings.settings.has("tokenmagic.presets")) {
            presets = TokenMagic.getPresets();
          }
        } catch (e) {
          // Silently fail if getPresets throws
          console.log("TokenMagic.getPresets() not available in this version");
        }
      }
    }
    
    // If no presets yet, try the module API
    if ((!presets || presets.length === 0)) {
      const tmModule = game.modules.get("tokenmagic");
      if (tmModule?.api?.getPresets) {
        presets = tmModule.api.getPresets();
      } else if (tmModule?.instance?.getPresets) {
        presets = tmModule.instance.getPresets();
      }
    }
    
    // As a last resort, try to get some default presets
    if ((!presets || presets.length === 0) && typeof TokenMagic !== 'undefined') {
      // Create some basic presets if none exist
      presets = [
        { name: "glow", label: "Glow" },
        { name: "outline", label: "Outline" },
        { name: "shadow", label: "Shadow" }
      ];
    }
  } catch (error) {
    console.warn("Failed to retrieve TokenMagic presets:", error);
    // Don't return here, continue with empty presets
    presets = [];
  }

  logMessage("TokenMagic presets: ", presets);

  if (!presets || presets.length === 0) {
    console.warn("No presets found or Token Magic module is not active.");
    return;
  }

  const dropdown = getElementByIdOrWarn('effect-dropdown', 'Dropdown');
  if (!dropdown) return;

  logMessage("Populating dropdown with presets...");
  populateDropdown(dropdown, presets, 'name', 'name');
  logMessage("Dropdown populated with presets.");
}

export async function populateTileDropdown(tiles, currentTileId, container = document) {
  const tileDropdown = container.querySelector('#tile-dropdown');
  if (!tileDropdown) {
    console.warn('Tile dropdown not found within the specified container.');
    return;
  }

  const filteredTiles = tiles.filter(tile => tile.document.getFlag(NAMESPACE, 'tileName'));
  const tileOptions = filteredTiles.map(tile => ({
    value: tile.id,
    text: tile.document.getFlag(NAMESPACE, 'tileName')
  }));

  populateDropdown(tileDropdown, tileOptions, 'value', 'text');

  if (currentTileId) {
    tileDropdown.value = currentTileId;
  }

  logMessage("Tile dropdown populated with tiles:", filteredTiles);
}

export async function populateImageDropdown(instance) {
  console.log("Populating image dropdown...");
  const imagePaths = instance.imagePaths;
  if (!imagePaths || imagePaths.length === 0) {
    console.error("Image paths are not defined or empty.");
    ui.notifications.warn("No images found for the selected tile. Please add images first.");
    return;
  }

  const dropdown = getElementByIdOrWarn('image-dropdown', 'Image dropdown');
  if (!dropdown) return;

  console.log("Image paths: ", imagePaths);
  const imageOptions = imagePaths.map(image => ({
    value: image.img,
    text: image.displayImg
  }));

  populateDropdown(dropdown, imageOptions, 'value', 'text');
  console.log("Image dropdown populated.");
}



////

export function populateDropdown(dropdown, items, valueKey, textKey) {
  dropdown.innerHTML = '';
  items.forEach(item => {
    const option = document.createElement('option');
    option.value = item[valueKey];
    option.textContent = item[textKey];
    dropdown.appendChild(option);
  });
}

//////////////////////////
// TokenMagic & Effects //
//////////////////////////

export async function isTokenMagicActive() {
  if (!game.modules.get('tokenmagic')?.active) {
    console.warn("TokenMagic module is not active.");
    return false;
  }
  return true;
}

////

export async function getEffectParams(effectName) {
  let effectParams = null;

  // Explicit check for controlled tiles or fallback to first placeable tile
  const tile = canvas.tiles.controlled.length ? canvas.tiles.controlled[0] : canvas.tiles.placeables[0];
  if (!tile) {
    console.error("No controlled or placeable tile found.");
    return []; // Return an empty array early
  }

  // Retrieve flags, ensure proper default values if undefined
  const imgIndex = await tile.document.getFlag(NAMESPACE, 'imgIndex');
  const imagePaths = await tile.document.getFlag(NAMESPACE, 'imagePaths') || [];

  // First: Attempt to retrieve effect from imagePaths based on imgIndex
  if (imgIndex !== undefined && imagePaths[imgIndex]) {
    const currentImage = imagePaths[imgIndex];
    const effects = (currentImage.effects || []).flat(); // Flatten if effects array exists
    effectParams = effects.find(e => e.filterId === effectName || e.tmFilterId === effectName);
  }

  // Second: If no effect found in imagePaths, check tileEffects flag
  if (!effectParams) {
    const tileEffects = await tile.document.getFlag(NAMESPACE, 'tileEffects');
    if (tileEffects) {
      effectParams = tileEffects.find(e => e.filterId === effectName || e.tmFilterId === effectName);
    }
  }

  // Third: Fallback to TokenMagic preset if no effect found in flags
  if (!effectParams) {
    effectParams = TokenMagic.getPreset(effectName);
    if (!effectParams) {
      console.warn(`Effect parameters not found for effect: ${effectName}`);
      return []; // Return an empty array early
    }
  }

  // Ensure returning an array
  return Array.isArray(effectParams) ? effectParams : [effectParams];
}
