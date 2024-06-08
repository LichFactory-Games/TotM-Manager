// scripts/utilities.js

// Define namespace
export const NAMESPACE = 'totm-manager';

export function logMessage(message) {
  console.log(`Theatre of the Mind Manager | ${message}`);
}

export function showNotification(message, type="info") {
  ui.notifications.notify(message, type);
}

// Register custom Handlebars helper
Handlebars.registerHelper('jsonStringify', function (context) {
    return JSON.stringify(context);
});

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

// Function to find a tile by its tag
export function findTileByTag(tag) {
  const tiles = canvas.tiles.placeables;
  const foundTile = tiles.find(t => Tagger.hasTags(t, [tag], { caseInsensitive: true }));
  console.log(`findTileByTag: Looking for tag ${tag}, found: ${foundTile ? foundTile.id : 'none'}`);
  return foundTile;
}

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

export function updateActiveTileButton(instance) {
    console.log("updateActiveTileButton called");
  if (!instance.currentTile || !instance.currentTile.document) {
    console.warn("No currently active tile or missing document property.");
    return;
  }

  // Use Tagger to get the tile's tag
  const tileTag = Tagger.getTags(instance.currentTile)[0]; // Assuming the first tag is the tile name

  if (!tileTag) {
    console.warn("Current tile does not have a tag.");
    return;
  }

  // Log the current tile and tileTag
  console.log(`Current tile ID: ${instance.currentTile.id}, Tile tag: ${tileTag}`);

  // Remove the active class from all tile buttons
  $('.tile-button').removeClass('active-button');

  // Log to ensure buttons are being targeted
  console.log("Removed active class from all tile buttons");

  // Select the button corresponding to the current tile
  const selector = `.tile-button[data-tile-name="${tileTag}"]`;
  console.log("Selecting button with selector: ", selector);

  const button = $(selector);
  if (button.length === 0) {
    console.warn("No button found with selector: ", selector);
    return;
  }

  // Add the active class to the selected button
  button.addClass('active-button');
  console.log("Button after adding class:", button[0]);
  console.log("Added active class to button with selector: ", selector);
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
      console.log(`Set order flag for tile ID: ${tile.id}, Order: ${maxOrder}`);
    }
  });
  console.log("Assigned unique order numbers to tiles.");
}
