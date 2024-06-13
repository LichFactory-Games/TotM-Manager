// scripts/utilities.js

//// Define namespace
export const NAMESPACE = 'totm-manager';

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
  if (hex.indexOf('#') === 0) {
    hex = hex.slice(1); // Remove the '#' character
  }
  return parseInt(hex, 16);
}

export function adjustColor(hex, amount) {
  let color = parseInt(hex.slice(1), 16); // Remove '#' and convert to decimal
  let r = Math.max(0, Math.min(255, ((color >> 16) & 0xFF) + amount));
  let g = Math.max(0, Math.min(255, ((color >> 8) & 0xFF) + amount));
  let b = Math.max(0, Math.min(255, (color & 0xFF) + amount));
  // Convert back to hex string
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/////////////////////
//  Tiles & Tags   //
/////////////////////

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

  const filteredTiles = getFilteredTiles();
  if (!filteredTiles.includes(tile)) {
    console.error("Tile is not in the filtered list of tiles.");
    return;
  }

  // Check if tile is a valid Foundry Tile object
  if (!(tile instanceof Tile)) {
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
    console.error("Tile's parent scene is not active or missing:", tile.scene);
    return;
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

  logMessage(`Current tile ID: ${instance.currentTile.id}, Tile name: ${tileName}`);

  // Remove the active class from all tile buttons
  $('.tile-button').removeClass('active-button');
  logMessage("Removed active class from all tile buttons");

  // Select the button corresponding to the current tile
  const selector = `.tile-button[data-tile-name="${tileName}"]`;
  logMessage("Selecting button with selector: ", selector);

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
  // Assuming TokenMagic.getPreset is the function to get effect presets
  const effectParams = TokenMagic.getPreset(effectName);
  if (!effectParams) {
    console.error(`No effect parameters found for effect: ${effectName}`);
    return null;
  }
  return effectParams;
}

