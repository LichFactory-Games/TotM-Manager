import { NAMESPACE, updateTileButtons, updateActiveTileButton, logMessage, getFilteredTiles } from './utilities.js';
import { findAndSwitchToTileByTag } from './utilities.js';
import { saveTileDataToFlags, clearTileFlags }  from './tiles-utils.js';
import { loadTileData, updateTileFields, updateTileProperties } from './tiles-utils.js';

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
        <input type="range" name="tile-opacity-${order}" min="0.01" max="1" step="0.01" value="1" style="margin-right: 10px;">
        <input type="color" name="tile-tint-${order}" value="#ffffff" style="margin-right: 10px;">
<button type="button" class="delete-tile" data-order="${order}"><i class="fas fa-trash"></i></button>
      </div>
    `);

    tileFieldsContainer.append(tileField);

    // Generate a temporary unique ID for each tile
    const tileId = `tile-${order}-${Date.now()}`;

    // Add a new tile to the tiles array with the generated ID
    instance.tiles.push({ id: tileId, name: '', opacity: 1, tint: '#ffffff', order });
  }

  logMessage("Generated tile fields:", instance.tiles)
}

// Collect data for tile flags and save
export async function collectAndSaveTileData(instance, html) {
  logMessage("Saving tile data for tiles...");

  const container = html.find('#tile-fields-container');
  const tiles = collectTileData(container);

  for (const tileData of tiles) {
    // Ensure the tileName is defined and not empty
    let tileName = tileData.name;

    if (!tileName || tileName.trim() === '') {
      ui.notifications.error("Please provide a name for all tiles.")
      throw new Error(`No tile name provided or tile ${tileName} is undefined.`)
    }

    // Log the tile name before using it
    logMessage(`Processing tile with tileName: ${tileName}`);

    // Find the tile by tag
    const foundTile = findAndSwitchToTileByTag(instance, tileName, false);

    if (foundTile) {
      logMessage("Found tile:", foundTile);
      // Extract image paths specific to this tile
      const tileImagePaths = collectImagePaths(container);

      // Save tile properties under totm-manager flag
      await saveTileDataToFlags(tileData, foundTile, tileImagePaths);

      // Update tile properties on canvas
      await updateTileProperties(foundTile, tileData);
    } else {
      console.warn(`No tile found with the tileName: ${tileName}`);
      ui.notifications.warn(`Tile tagged with name: ${tileName} not found on game canvas.`)
      throw new Error(`No tile tagged with ${tileName} found on game canvas.`)
    }
  }
}

export async function collectAndSaveImageData(instance, html) {
  // Get the current tile from instance
  const foundTile = instance.currentTile;
  if (!foundTile) {
    console.warn("No current tile found.");
    return;
  } else {
    logMessage("Found tile for image paths:", foundTile);
  }
  // Collect image paths from the 'stage' tab
  const container = $('#image-path-list').closest('.form-group');
  const imagePaths = collectImagePaths(container);

  // Save image path information to the tile's flags
  await saveTileDataToFlags(instance.currentTile, foundTile, imagePaths);
}

export function collectTileData(container) {
  const tileElements = container.find('.tile-field');
  return tileElements.map((index, element) => {
    const $element = $(element);
    const name = $element.find('input[name^="tile-name"]').val();
    const opacity = parseFloat($element.find('input[name^="tile-opacity"]').val()) || 1;
    const tint = $element.find('input[name^="tile-tint"]').val() || '#ffffff';
    const order = parseInt($element.attr('data-order'), 10);

    return {
      name,
      opacity,
      tint,
      order,
      imagePaths: []  // Initialize imagePaths for later merge
    };
  }).get();
}

export function collectImagePaths(container) {
  // Correctly selecting the list items within the specified container
  const pathListItems = container.find('li.form-field');

  // Log to verify the selection
  logMessage("Collected path list items:", pathListItems);

  return pathListItems.map((index, pathItem) => {
    const $pathItem = $(pathItem);
    const img = $pathItem.find('.path-field').data('img');
    const tags = $pathItem.find('.tag-field').val().split(',').map(tag => tag.trim());

    // Log each image path object being collected
    logMessage("Collected image path data:");
    logMessage("img:", img);
    logMessage("displayImg:", img.split('/').pop());
    logMessage("tags:", tags);

    return { img, displayImg: img.split('/').pop(), tags };
  }).get();
}

export async function handleSaveAndRender(instance, html) {
  logMessage("Saving data for tile...");
  await collectAndSaveTileData(instance, html);

  console.log("Loading tile data...");
  await loadTileData(instance);

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
