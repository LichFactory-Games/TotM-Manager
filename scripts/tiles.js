import {  findTileByTag, updateActiveTileButton } from './utilities.js';

export function generateTileFields(instance, html, options = { replace: false, count: 1 }) {
  console.log("Generating tile fields...");

  const tileCount = options.count;
  const replaceTiles = options.replace;
  const tileFieldsContainer = html.find('#tile-fields-container');

  if (isNaN(tileCount) || tileCount < 0) {
    console.warn("Invalid tile count entered.");
    return;
  }

  if (replaceTiles) {
    clearTileFlags(instance).then(() => {
      instance.tiles = []; // Reset the tiles array
      tileFieldsContainer.empty(); // Clear existing fields
      generateFields(instance, tileFieldsContainer, tileCount);
    });
  } else {
    generateFields(instance, tileFieldsContainer, tileCount);
  }
  updateTileFields(instance); // Ensure the fields are updated after generating
}

function generateFields(instance, tileFieldsContainer, count) {
  for (let i = 0; i < count; i++) {
    const tileField = $(`
            <div class="tile-field" data-index="${i}" style="display: flex; align-items: center; margin-bottom: 10px;">
                <span class="handle" data-index="handle-${i}" style="cursor: move; margin-right: 5px;">&#9776;</span>
                <input type="text" name="tile-name-${i}" placeholder="Tile Name" style="margin-right: 10px;">
                <input type="range" name="tile-opacity-${i}" min="0" max="1" step="0.01" style="margin-right: 10px;">
                <input type="color" name="tile-tint-${i}" style="margin-right: 10px;">
            </div>
            <button type="button" class="delete-tile" data-index="${i}"><i class="fas fa-trash"></i></button>
        `);

    tileFieldsContainer.append(tileField);

    // Generate a temporary unique ID for each tile
    const tileId = `tile-${i}-${Date.now()}`;

    // Add a new tile to the tiles array with the generated ID
    instance.tiles.push({ id: tileId, name: '', opacity: 1, tint: '' });
  }

  console.log("Generated tile fields:", instance.tiles);
  updateStageButtons(instance); // Update stage buttons based on the tile count
}

export async function loadTileData(instance) {
  instance.tiles = canvas.tiles.placeables.map(tile => {
    const name = tile.document.getFlag('core', 'tileName') || '';
    const opacity = tile.document.getFlag('core', 'opacity') || 1;
    const tint = tile.document.getFlag('core', 'tint') || '';
    const imagePaths = tile.document.getFlag('core', 'imagePaths') || [];

    // Only return tiles that have a valid name
    if (name) {
        return { name, opacity, tint };
    }
  }).filter(tile => tile !== undefined); // Filter out undefined entries

  console.log("Loaded tile data:", instance.tiles);
  updateTileFields(instance); // Update the fields with loaded data
  updateStageButtons(instance);
}

export async function clearTileFlags(instance) {
  const tiles = canvas.tiles.placeables;
  for (let tile of tiles) {
    await tile.document.unsetFlag('core', 'tileName');
    await tile.document.unsetFlag('core', 'opacity');
    await tile.document.unsetFlag('core', 'tint');
  }
  instance.tiles = []; // Clear the instance's tile data
  console.log('Tile flags cleared and instance tiles reset.');
}

export async function saveTileData(instance, html) {
  console.log("Saving tile data...");
  console.log("Instance:", instance);
  console.log("HTML:", html);

  const containerId = html.find('#tile-fields-container').length ? '#tile-fields-container' : '.add-image-container';
  const container = html.find(containerId);
  console.log("Using container:", containerId);

  const tileData = [];

  if (containerId === '#tile-fields-container') {
    const tileFields = container.find('.tile-field');

    tileFields.each((index, tileField) => {
      const $tileField = $(tileField);
      const name = $tileField.find(`input[name="tile-name-${index}"]`).val();
      const opacity = $tileField.find(`input[name="tile-opacity-${index}"]`).val();
      const tint = $tileField.find(`input[name="tile-tint-${index}"]`).val();

      tileData.push({ name, opacity, tint });
    });

    instance.tiles = tileData;
    console.log("Tile data collected from tile-fields-container:", instance.tiles);
  } else {
    const pathListItems = container.find('#image-path-list .form-field');

    const imagePaths = [];
    pathListItems.each((index, pathItem) => {
      const $pathItem = $(pathItem);
      const img = $pathItem.find('.path-field').data('img');
      const tags = $pathItem.find('.tag-field').val().split(',').map(tag => tag.trim());
      const color = $pathItem.find('.color-picker').val();

      imagePaths.push({ img, displayImg: img.split('/').pop(), tags, color });
    });

    instance.imagePaths = imagePaths;
    console.log("Image paths collected from add-image-container:", imagePaths);
  }

  for (let i = 0; i < instance.tiles.length; i++) {
    const tile = instance.tiles[i];
    console.log(`Processing tile ${i}:`, tile);

    const foundTile = findTileByTag(tile.name); // Use findTileByTag to locate the tile by its name
    console.log("Found tile by tag:", foundTile);

    if (foundTile) {
      await foundTile.document.setFlag('core', 'tileName', tile.name);
      await foundTile.document.setFlag('core', 'opacity', tile.opacity);
      await foundTile.document.setFlag('core', 'tint', tile.tint);

      if (instance.imagePaths) {
        const existingPaths = await foundTile.document.getFlag('core', 'imagePaths') || [];
        const pathsToSave = existingPaths.map((path, index) => ({
          img: path.img,
          displayImg: path.displayImg,
          tags: path.tags,
          color: path.color || existingPaths[index]?.color
        }));
        await foundTile.document.setFlag('core', 'imagePaths', pathsToSave);
        const currentImgIndex = await foundTile.document.getFlag('core', 'imgIndex') || 0;
        if (currentImgIndex >= pathsToSave.length) {
          const newIndex = pathsToSave.length > 0 ? pathsToSave.length - 1 : 0;
          await foundTile.document.setFlag('core', 'imgIndex', newIndex);
        } else {
          await foundTile.document.setFlag('core', 'imgIndex', currentImgIndex);
        }
        console.log(`Image paths saved for tile ${i}:`, pathsToSave);
      }

      console.log(`Tile ${i} info saved: name=${tile.name}, opacity=${tile.opacity}, tint=${tile.tint}`);
    } else {
      console.warn(`No tile found with the name: ${tile.name}`);
    }
  }

  console.log("Saved tile data:", instance.tiles);
  updateStageButtons(instance);
}


function updateTileFields(instance) {
  const tileFieldsContainer = document.getElementById('tile-fields-container');
  tileFieldsContainer.innerHTML = '';

  instance.tiles.forEach((tile, index) => {
    const tileField = document.createElement('div');
    tileField.classList.add('tile-field');
    tileField.setAttribute('data-index', index);
    tileField.setAttribute('draggable', 'true'); // Ensure the tile field is draggable
    tileField.style.display = 'flex';
    tileField.style.alignItems = 'center';
    tileField.style.marginBottom = '10px';

    tileField.innerHTML = `
            <span class="handle" data-index="handle-${index}" style="cursor: move; margin-right: 5px;">&#9776;</span>
        <input type="text" name="tile-name-${index}" placeholder="Tile Name" value="${tile.name}" style="margin-right: 10px;">
        <input type="range" name="tile-opacity-${index}" min="0" max="1" step="0.01" value="${tile.opacity}" style="margin-right: 10px;">
        <input type="color" name="tile-tint-${index}" value="${tile.tint}" style="margin-right: 10px;">
        <button type="button" class="delete-tile" data-index="${index}"><i class="fas fa-trash"></i></button>
      `;

    tileFieldsContainer.appendChild(tileField);
  });
}

export function updateStageButtons(instance) {
  const stageButtonsContainer = document.querySelector('.stage-buttons-container');
  if (!stageButtonsContainer) {
    console.warn('Stage buttons container not found.');
    return;
  }

  stageButtonsContainer.innerHTML = ''; // Clear existing buttons

  instance.tiles.forEach((tile, index) => {
    if (tile.name) { // Only create buttons for tiles with names
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.add('tile-button');
      button.dataset.tileName = tile.name;
      button.textContent = tile.name || `Tile ${index + 1}`;
      stageButtonsContainer.appendChild(button);

      // Debugging: Log number of buttons created
      console.log(`Created button for tile: ${tile.name}`);
    }
  });
}

export function switchToTileByTag(instance, tag) {
  const tiles = canvas.tiles.placeables;
  console.log(`TotM - Checking for tiles with tag: ${tag}`);

  const tileWithTag = tiles.find(t => Tagger.hasTags(t, tag, { caseInsensitive: true, matchExactly: true }));

  if (tileWithTag) {
    console.log("TotM - Found tile with tag:", tag);
    instance.currentActiveTag = tag; // Update the current active tag
    activateTile(instance, tileWithTag);
    updateActiveTileButton(instance); // Update button states
    instance.render();
  } else {
    console.log("TotM - No tile found with the specified tag:", tag);
    ui.notifications.error(`No tile found with tag: ${tag}`);
  }
}

export async function loadTileImages(instance, tile) {
    if (!tile) {
        console.error("No tile provided or tile is undefined.");
        ui.notifications.warn("No tile provided or tile is undefined.");
        return;
    }

    if (!tile.document) {
        console.error("Tile does not have a document property:", tile);
        ui.notifications.warn("Tile does not have a document property.");
        return;
    }

    // Fetch the image paths stored in the tile's flags
    let loadedPaths = tile.document.getFlag('core', 'imagePaths') || [];

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
    console.log("TotM - Loaded image paths for tile:", instance.imagePaths);

    // Call the render method to update the UI with loaded images
    instance.render(true);
    // Initial call to update the button state
    setTimeout(() => updateActiveTileButton(instance), 10);  // Delay the update call to ensure DOM has updated
}

export async function activateTile(instance, tile) {
  if (!tile) {
    console.log("TotM - No tile is currently active.");
    return;
  }

  try {
    canvas.tiles.releaseAll();
    tile.control({ releaseOthers: true });
    console.log(`TotM - Activated tile with ID: ${tile.id}`);
    instance.currentTile = tile; // Update the current tile
    loadTileImages(instance, tile); // Load images for the new active tile
    instance.render(true); // Re-render to update UI with new tile data
  } catch (error) {
    console.error("Error controlling tile:", error);
    ui.notifications.error("Failed to activate tile.");
  }
}

export function deselectActiveTile(instance) {
    instance.currentTile = null;
    instance.currentTileIndex = null;
    instance.render(true);
}

export async function initializeTiles(instance) {
    if (!instance.currentTile && canvas.tiles.placeables.length > 0) {
        await activateTile(instance, canvas.tiles.placeables[0]);
    }
}

export function deleteTile(instance, index) {
    // Remove the tile from the instance's tiles array
    instance.tiles.splice(index, 1);

    // Update the indices of the remaining tiles
    instance.tiles.forEach((tile, idx) => {
        tile.index = idx;
    });

    // Update the tile fields and stage buttons
    updateTileFields(instance);
    updateStageButtons(instance);
}
