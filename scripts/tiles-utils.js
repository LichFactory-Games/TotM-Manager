import { NAMESPACE, logMessage, findTileById } from './utilities.js';

// Helper function to save tile flags
export async function saveTileDataToFlags(tile, foundTile, imagePaths) {
  // Add GM check
  if (!game.user.isGM) {
    console.log("User is not GM. Skipping saveTileDataToFlags.");
    return;
  }

  // Log the arguments
  logMessage("Arguments received in saveTileDataToFlags:");
  logMessage("tile:", tile);
  logMessage("foundTile:", foundTile);
  logMessage("imagePaths:", imagePaths);

  // Add validation to check if foundTile is an actual tile object
  if (!tile || !foundTile || !foundTile.document) {
    console.error("Invalid tile or foundTile:", { tile, foundTile });
    return;
  }

  logMessage(`Saving flags for tile: ${tile.name}`);
  await foundTile.document.setFlag(NAMESPACE, 'tileName', tile.name);
  await foundTile.document.setFlag(NAMESPACE, 'opacity', tile.opacity);
  await foundTile.document.setFlag(NAMESPACE, 'tint', tile.tint);
  await foundTile.document.setFlag(NAMESPACE, 'order', tile.order);

  logMessage("Flags saved:", {
    tileName: tile.name,
    opacity: tile.opacity,
    tint: tile.tint,
    order: tile.order
  });

  if (imagePaths && imagePaths.length > 0) {
    const pathsToSave = imagePaths.map((path, index) => ({
      img: path.img,
      displayImg: path.displayImg,
      tags: path.tags
    }));

    await foundTile.document.setFlag(NAMESPACE, 'imagePaths', pathsToSave);
    logMessage("Image paths saved:", pathsToSave);

    let currentImgIndex = await foundTile.document.getFlag(NAMESPACE, 'imgIndex') || 0;
    if (currentImgIndex >= pathsToSave.length) {
      currentImgIndex = pathsToSave.length - 1;
    }
    await foundTile.document.setFlag(NAMESPACE, 'imgIndex', currentImgIndex);
    logMessage("Current image index saved:", currentImgIndex);
  } else {
    logMessage("No image paths provided.");
  }
}

// Remove all tile flags
export async function clearTileFlags(instance) {
  if (!game.user.isGM) {
    console.log("User is not GM. Skipping clearTileFlags.");
    return;
  }

  const tiles = canvas.tiles.placeables;
  for (let tile of tiles) {
    await tile.document.unsetFlag(NAMESPACE, 'tileName');
    await tile.document.unsetFlag(NAMESPACE, 'opacity');
    await tile.document.unsetFlag(NAMESPACE, 'tint');
    await tile.document.unsetFlag(NAMESPACE, 'order');
    await tile.document.unsetFlag(NAMESPACE, 'imagePaths');
    await tile.document.unsetFlag(NAMESPACE, 'tileEffects');

  }
  instance.tiles = []; // Clear the instance's tile data
  logMessage('Tile flags cleared and instance tiles reset.');
}

export async function loadTileData(instance) {
  instance.tiles = canvas.tiles.placeables.map(tile => {
    const name = tile.document.getFlag(NAMESPACE, 'tileName') || '';
    const opacity = tile.document.getFlag(NAMESPACE, 'opacity') || 1;
    const tint = tile.document.getFlag(NAMESPACE, 'tint') || '#ffffff';
    const order = Number(tile.document.getFlag(NAMESPACE, 'order'));
    const imagePaths = tile.document.getFlag(NAMESPACE, 'imagePaths') || [];
    const effects = tile.document.getFlag(NAMESPACE, 'tileEffects') || [];


    // Only return tiles that have a valid name
    if (name.trim() !== '') { // only load tiles w/valid names
      logMessage(`Loaded tile: ${tile.id}`, { name, opacity, tint, order, imagePaths, effects });
      return { id: tile.id, name, opacity, tint, order, imagePaths, effects };
    }
  }).filter(tile => tile !== undefined);

  logMessage("Loaded tile data:", instance.tiles);
}

export async function loadTileImages(instance, tile) {
  try {
    if (!tile || !tile.document) {
      throw new Error("No tile provided or tile is undefined.");
    }

    // Fetch the image paths stored in the tile's flags
    let loadedPaths = await tile.document.getFlag(NAMESPACE, 'imagePaths') || [];
    logMessage("Fetched image paths from tile flags:", loadedPaths);

    if (!Array.isArray(loadedPaths)) {
      throw new Error("Image paths retrieved are not in an array format.");
    }

    // Prepare the image paths for display
    instance.imagePaths = loadedPaths.map(path => {
      let displayPath; // This will hold the filename for display purposes
      if (typeof path === 'string') {  // Handle legacy or incorrectly saved paths
        displayPath = path.split('/').pop(); // Extract filename from the full path
        return { img: path, displayImg: displayPath, tags: [] };
      } else if (path && typeof path === 'object' && path.img) {
        displayPath = path.img.split('/').pop(); // Ensure to handle object structured paths
        return { ...path, displayImg: displayPath };
      } else {
        throw new Error("Invalid path format detected in image paths.");
      }
    });

    logMessage("TotM - Loaded image paths for tile:", instance.imagePaths);

    try {
      await instance.render(true);
      logMessage("Instance rendered with new image paths.");
    } catch (renderError) {
      console.error("Error rendering instance with new image paths:", renderError);
      ui.notifications.error("Failed to render instance with new image paths.");
    }

  } catch (error) {
    console.error("Error loading tile images:", error);
    ui.notifications.error("Failed to load tile images. See console for details.");
  }
}

//// Tile Updating Functions

export  function updateTileFields(instance) {
  const tileFieldsContainer = document.getElementById('tile-fields-container');
  if (!tileFieldsContainer) {
    console.warn('Tile fields container not found.');
    return;
  }

  tileFieldsContainer.innerHTML = '';

  instance.tiles.forEach((tile, index) => {
    const tileField = document.createElement('div');
    tileField.classList.add('tile-field');
    tileField.setAttribute('data-index', index);
    tileField.setAttribute('data-order', tile.order); // Store the order attribute
    tileField.setAttribute('draggable', 'true'); // Ensure the tile field is draggable
    tileField.style.display = 'flex';
    tileField.style.alignItems = 'center';
    tileField.style.marginBottom = '10px';

    tileField.innerHTML = `
      <span class="totm-manager handle" data-order="${tile.order}" style="cursor: move; margin-right: 5px;">&#9776;</span>
      <input type="text" name="tile-name-${tile.order}" placeholder="Tile Name" value="${tile.name}" style="margin-right: 10px;">
      <input type="range" name="tile-opacity-${tile.order}" min="0.01" max="1" step="0.01" value="${tile.opacity}" style="margin-right: 10px;">
      <input type="color" name="tile-tint-${tile.order}" value="${tile.tint || '#ffffff'}" style="margin-right: 10px;">
      <button type="button" class="totm-manager delete-tile" data-order="${tile.order}"><i class="totm-manager fas fa-trash"></i></button>
    `;

    tileFieldsContainer.appendChild(tileField);
  });
}

// Toggle tile visibility
export async function toggleTileVisibility(tileId) {
  if (!game.user.isGM) {
    console.log("User is not GM. Skipping toggleTileVisibility.");
    return;
  }

  const tile = findTileById(tileId)
  if (tile) {
    const isHidden = tile.document.hidden; // Directly check the hidden property
    const newVisibility = !isHidden;
    await tile.document.update({ hidden: newVisibility });
    console.log(`Tile ${tileId} visibility toggled to: ${newVisibility}`);

    // Force a re-draw of the tile layer
    await canvas.tiles.draw();
  } else {
    console.error(`Tile with ID ${tileId} not found.`);
  }
}

// Tile Property Updating
export async function updateTileProperties(foundTile, tileData) {
  if (!game.user.isGM) {
    console.log("User is not GM. Skipping updateTileProperties.");
    return;
  }

  logMessage("Updating tile properties for tile:", foundTile);
  logMessage("Tile data:", tileData);

  // Update the tile document with the correct properties
  await foundTile.document.update({
    'texture.tint': tileData.tint,
    'alpha': tileData.opacity
  });

  logMessage(`Updated tile ${tileData.name} with opacity: ${tileData.opacity} and tint: ${tileData.tint}`);
}

////

// Function to open the configuration window for the first controlled tile
export function openTileConfigForControlledTile() {
  if (!game.user.isGM) {
    console.log("User is not GM. Skipping openTileConfigForControlledTile.");
    return;
  }

  const controlledTiles = canvas.tiles.controlled;

  if (controlledTiles.length === 0) {
    console.warn("No controlled tiles found.");
    return;
  }

  const tile = controlledTiles[0]; // Get the first controlled tile
  new TileConfig(tile.document).render(true);
}
