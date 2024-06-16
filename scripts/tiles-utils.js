import { NAMESPACE, logMessage, getFilteredTiles } from './utilities.js';

// Helper function to save tile flags
export async function saveTileDataToFlags(tile, foundTile, imagePaths) {
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
    const existingPaths = await foundTile.document.getFlag(NAMESPACE, 'imagePaths') || [];
    const pathsToSave = imagePaths.map((path, index) => ({
      img: path.img,
      displayImg: path.displayImg,
      tags: path.tags,
      color: path.color || (existingPaths[index] && existingPaths[index].color) || "#000000"
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
    const tint = tile.document.getFlag(NAMESPACE, 'tint') || '';
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
  if (!tile || !tile.document) {
    console.error("No tile provided or tile is undefined.");
    ui.notifications.warn("No tile provided or tile is undefined.");
    return;
  }

  // Fetch the image paths stored in the tile's flags
  let loadedPaths = tile.document.getFlag(NAMESPACE, 'imagePaths') || [];
  logMessage("Fetched image paths from tile flags:", loadedPaths);

  // Prepare the image paths for display
  instance.imagePaths = loadedPaths.map(path => {
    let displayPath; // This will hold the filename for display purposes
    if (typeof path === 'string') {  // Handle legacy or incorrectly saved paths
      displayPath = path.split('/').pop(); // Extract filename from the full path
      return { img: path, displayImg: displayPath, tags: [] };
    } else {
      displayPath = path.img.split('/').pop(); // Ensure to handle object structured paths
      return { ...path, displayImg: displayPath };
    }
  });
  logMessage("TotM - Loaded image paths for tile:", instance.imagePaths);
  await instance.render(true);
  logMessage("Instance rendered with new image paths.");

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
      <span class="handle" data-order="${tile.order}" style="cursor: move; margin-right: 5px;">&#9776;</span>
      <input type="text" name="tile-name-${tile.order}" placeholder="Tile Name" value="${tile.name}" style="margin-right: 10px;">
      <input type="range" name="tile-opacity-${tile.order}" min="0" max="1" step="0.01" value="${tile.opacity}" style="margin-right: 10px;">
      <input type="color" name="tile-tint-${tile.order}" value="${tile.tint}" style="margin-right: 10px;">
      <button type="button" class="delete-tile" data-order="${tile.order}"><i class="fas fa-trash"></i></button>
    `;

    tileFieldsContainer.appendChild(tileField);
  });
}


export async function toggleTileVisibility(tileId) {
  const tile = canvas.tiles.get(tileId);
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
