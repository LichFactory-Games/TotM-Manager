// scripts/utilities.js
export function logMessage(message) {
  console.log(`Theatre of the Mind Manager | ${message}`);
}

export function showNotification(message, type="info") {
  ui.notifications.notify(message, type);
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

// Method to find a tile by tagger tag
export function findTileByTag(tag) {
  const tiles = canvas.tiles.placeables;
  return tiles.find(t => Tagger.hasTags(t, [tag], { caseInsensitive: true }));
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
  // Ensure a current tile and its document are available
  if (!instance.currentTile || !instance.currentTile.document) {
    console.warn("No currently active tile or missing document property.");
    return; // Exit the function to prevent further errors
  }
  $('.tile-button').removeClass('active-button');
  const selector = `.tile-button[data-tile-name="${instance.currentTile.document.getFlag('core', 'tileName')}"]`;
  $(selector).addClass('active-button');
  console.log("Updating active tile button");
}
