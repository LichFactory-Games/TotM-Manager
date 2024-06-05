import { NAMESPACE } from './utilities.js';
import { findTileByTag, updateActiveTileButton } from './utilities.js';
import { collectTileData, collectImagePaths, saveTileFlags, clearTileFlags }  from './tiles-utils.js';
import { loadTileData, loadTileImages, updateStageButtons, updateTileFields } from './tiles-utils.js';
import { activateTile, deselectActiveTile, switchToTileByTag }  from './tiles-utils.js';

export function generateTileFields(instance, html, options = { replace: false, count: 1 }) {
  console.log("Generating tile fields...");

  const tileCount = options.count;
  const replaceTiles = options.replace;
  const tileFieldsContainer = html.find('#tile-fields-container');

  if (isNaN(tileCount) || tileCount < 0) {
    console.warn("Invalid tile count entered.");
    return;
  }

  // Initialize instance.tiles if it is not already an array
  if (!Array.isArray(instance.tiles)) {
    instance.tiles = [];
  }

  if (replaceTiles) {
    clearTileFlags(instance).then(() => {
      instance.tiles = []; // Reset the tiles array
      tileFieldsContainer.empty(); // Clear all existing fields in one go
      generateFields(instance, tileFieldsContainer, tileCount);
      });
  } else {
    generateFields(instance, tileFieldsContainer, tileCount);
  }
}

function generateFields(instance, tileFieldsContainer, count) {
  const currentOrder = instance.tiles.length; // Start from the current length of instance.tiles

  for (let i = 0; i < count; i++) {
    const order = currentOrder + i; // Ensure unique order

    const tileField = $(`
      <div class="tile-field" data-order="${order}" style="display: flex; align-items: center; margin-bottom: 10px;">
        <span class="handle" data-order="handle-${order}" style="cursor: move; margin-right: 5px;">&#9776;</span>
        <input type="text" name="tile-name-${order}" placeholder="Tile Name" style="margin-right: 10px;">
        <input type="range" name="tile-opacity-${order}" min="0" max="1" step="0.01" style="margin-right: 10px;">
        <input type="color" name="tile-tint-${order}" style="margin-right: 10px;">
        <button type="button" class="delete-tile" data-order="${order}"><i class="fas fa-trash"></i></button>
      </div>
    `);

    tileFieldsContainer.append(tileField);

    // Generate a temporary unique ID for each tile
    const tileId = `tile-${order}-${Date.now()}`;

    // Add a new tile to the tiles array with the generated ID
    instance.tiles.push({ id: tileId, name: '', opacity: 1, tint: '', order });
  }

  console.log("Generated tile fields:", instance.tiles)
}

// Save data to tile document 
export async function saveTileData(instance, html) {
  console.log("Saving tile data...");
  const container = html.find('#tile-fields-container').length ? html.find('#tile-fields-container') : html.find('.add-image-container');
  
  if (container.attr('id') === 'tile-fields-container') {
    instance.tiles = collectTileData(container);
  } else {
    instance.imagePaths = collectImagePaths(container);
  }

  for (let tile of instance.tiles) {
    if (tile.name.trim() === '') {
      console.warn("Skipping tile with empty name.");
      continue;
    }
    const foundTile = findTileByTag(tile.name);

    if (foundTile) {
      await saveTileFlags(tile, foundTile, instance.imagePaths);
    } else {
      console.warn(`No tile found with the name: ${tile.name}`);
    }
    }
}

export async function handleSaveAndRender(instance, html) {
  console.log("Saving tile data...");
  await saveTileData(instance, html);
  
  console.log("Loading tile data...");
  await loadTileData(instance);
  
  console.log("Updating stage buttons...");
  updateStageButtons(instance);
  
  console.log("Updating tile fields...");
  updateTileFields(instance);
  
  console.log("Rendering the instance...");
  instance.render(true);
  
  console.log("Completed handleSaveAndRender");
}

export async function deleteTileData(instance, order, html) {
  if (!instance || !instance.tiles) {
    console.error("Instance or instance.tiles is undefined");
    return;
  }
  
  console.log("Before deletion, instance.tiles:", instance.tiles);

  // Find the tile to be deleted
  const tileToDelete = instance.tiles.find(tile => Number(tile.order) === order);
  if (!tileToDelete) {
    console.warn(`Tile with order ${order} not found in instance`);
    return;
  }

  // Log tile to be deleted
  console.log("Tile to be deleted:", tileToDelete);

  // Remove tile from instance.tiles
  instance.tiles = instance.tiles.filter(tile => Number(tile.order) !== order);
  console.log("After deletion, instance.tiles:", instance.tiles);
  
  if (!tileToDelete) {
    console.warn(`Tile with order ${order} not found in instance`);
    return;
  }

  // Remove tile from DOM
  html.find(`.tile-field[data-order="${order}"]`).remove();

  if (tileToDelete) {
    // Remove flags from the tile document
    const foundTile = findTileByTag(tileToDelete.name);
    console.log("Tile delete name: ${foundTile}");
    if (foundTile) {
      await foundTile.document.unsetFlag(NAMESPACE, 'tileName');
      await foundTile.document.unsetFlag(NAMESPACE, 'opacity');
      await foundTile.document.unsetFlag(NAMESPACE, 'tint');
      await foundTile.document.unsetFlag(NAMESPACE, 'order');
      await foundTile.document.unsetFlag(NAMESPACE, 'imagePaths');

      console.log("Tile Flags Unset!");
    }
  }
  // Synchronize the internal state with the updated canvas data
  console.log("After updating orders, instance.tiles:", instance.tiles);
}

export async function handleDeleteAndSave(instance, order, html) {
  await deleteTileData(instance, order, html);  // Delete the tile field
  await saveTileData(instance, html);       // Save the updated tile data
  await loadTileData(instance);             // Reload the latest data
  // updateStageButtons(instance);             // Update the UI stage buttons
  // updateTileFields(instance);               // Update the UI tile fields

}



