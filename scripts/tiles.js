import { NAMESPACE, updateTileButtons, updateActiveTileButton, logMessage, getFilteredTiles } from './utilities.js';
import { findAndSwitchToTileByTag } from './utilities.js';
import { saveTileDataToFlags, clearTileFlags }  from './tiles-utils.js';
import { loadTileData, updateTileFields } from './tiles-utils.js';

export function generateTileFields(instance, html, options = { replace: false, count: 1 }) {
  logMessage("Generating tile fields...");

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

  logMessage("Generated tile fields:", instance.tiles)
}

// Save data to tile document

export async function collectAndSaveTileData(instance, html) {
  logMessage("Saving tile data for tiles...");

  const container = html.find('#tile-fields-container');
  const tiles = collectTileData(container);

  for (const tileData of tiles) {
    // Ensure the tileName is defined and not empty
    let tileName = tileData.name;

    if (!tileName || tileName.trim() === '') {
      // Generate a temporary tileName if it's not provided
      tileName = `tile-${Date.now()}`;
      tileData.name = tileName;
      logMessage(`Generated temporary tileName: ${tileName}`);
    }

    // Log the tile name before using it
    logMessage(`Processing tile with tileName: ${tileName}`);

    // Find the tile by tag
    const foundTile = findAndSwitchToTileByTag(instance, tileName, false);

    if (foundTile) {
      // Extract image paths specific to this tile
      const tileImagePaths = collectImagePaths(container);

      // Log the found tile before calling saveTileDataToFlags
      logMessage("Found tile:", foundTile);
      await saveTileDataToFlags(tileData, foundTile, tileImagePaths);
    } else {
      console.warn(`No tile found with the tileName: ${tileName}`);
    }
  }
}

export function collectTileData(container) {
  return container.find('.tile-field').map((index, tileField) => {
    const $tileField = $(tileField);
    const order = $tileField.attr('data-order');
    return {
      name: $tileField.find(`input[name="tile-name-${order}"]`).val(),
      opacity: $tileField.find(`input[name="tile-opacity-${order}"]`).val(),
      tint: $tileField.find(`input[name="tile-tint-${order}"]`).val(),
      order
    };
  }).get();
}

export function collectImagePaths(container) {
  const pathListItems = container.find('#image-path-list .form-field');
  return pathListItems.map((index, pathItem) => {
    const $pathItem = $(pathItem);
    const img = $pathItem.find('.path-field').data('img');
    const tags = $pathItem.find('.tag-field').val().split(',').map(tag => tag.trim());
    const color = $pathItem.find('.color-picker').val();
    return { img, displayImg: img.split('/').pop(), tags, color };
  }).get();
}



export async function handleSaveAndRender(instance, html) {
  logMessage("Saving data for tile...");
  await collectAndSaveTileData(instance, html);

  console.log("Loading tile data...");
  await loadTileData(instance);

  await collectAndSaveTileData(instance, html);

  console.log("Updating stage buttons...");
  updateTileButtons(instance);

  console.log("Updating tile fields...");
  updateTileFields(instance);

  logMessage("Rendering the instance...");
  instance.render(true);

  logMessage("Completed handleSaveAndRender");
}

export async function deleteTileData(instance, order, html) {
  if (!instance || !instance.tiles) {
    console.error("Instance or instance.tiles is undefined");
    return;
  }
  
  logMessage("Before deletion, instance.tiles:", instance.tiles);

  // Find the tile to be deleted
  const tileToDelete = instance.tiles.find(tile => Number(tile.order) === order);
  if (!tileToDelete) {
    console.warn(`Tile with order ${order} not found in instance`);
    return;
  }

  // Log tile to be deleted
  logMessage("Tile to be deleted:", tileToDelete);

  // Remove tile from instance.tiles
  instance.tiles = instance.tiles.filter(tile => Number(tile.order) !== order);
  logMessage("After deletion, instance.tiles:", instance.tiles);
  
  if (!tileToDelete) {
    console.warn(`Tile with order ${order} not found in instance`);
    return;
  }

  // Remove tile from DOM
  html.find(`.tile-field[data-order="${order}"]`).remove();

  if (tileToDelete) {
    // Remove flags from the tile document
    const foundTile = findAndSwitchToTileByTag(instance, tileToDelete.name, false);
    logMessage(`Tile delete name:`, foundTile);
    if (foundTile) {
      await foundTile.document.unsetFlag(NAMESPACE, 'tileName');
      await foundTile.document.unsetFlag(NAMESPACE, 'opacity');
      await foundTile.document.unsetFlag(NAMESPACE, 'tint');
      await foundTile.document.unsetFlag(NAMESPACE, 'order');
      await foundTile.document.unsetFlag(NAMESPACE, 'imagePaths');

      logMessage("Tile Flags Unset!");
    }
  }
  // Synchronize the internal state with the updated canvas data
  logMessage("After updating orders, instance.tiles:", instance.tiles);
}

export async function handleDeleteAndSave(instance, order, html) {
  logMessage("Deleting data for tile...");

  // Delete the tile field and update internal state
  await deleteTileData(instance, order, html);

  // Save the updated tile data
  logMessage("Saving deletion data for tile...");
  await collectAndSaveTileData(instance, html);
  logMessage("Deletion data saved...");

  // Reload the latest data and update UI
  await loadTileData(instance);
  logMessage("Loading updated tile data...");

  // Wait for the next animation frame before updating the UI
  await new Promise(requestAnimationFrame);

  // Update the UI components
  updateTileButtons(instance);
  updateTileFields(instance);

  logMessage("Rendering the updated instance...");
  instance.render(true);
}
