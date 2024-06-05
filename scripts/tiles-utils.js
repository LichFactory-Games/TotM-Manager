import { NAMESPACE } from './utilities.js';
import { findTileByTag, updateActiveTileButton } from './utilities.js';

// Helper function to collect tile data
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

// Helper function to collect image paths
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

// Helper function to save tile flags
export async function saveTileFlags(tile, foundTile, imagePaths) {
  console.log(`Saving flags for tile: ${tile.name}`);
  await foundTile.document.setFlag(NAMESPACE, 'tileName', tile.name);
  await foundTile.document.setFlag(NAMESPACE, 'opacity', tile.opacity);
  await foundTile.document.setFlag(NAMESPACE, 'tint', tile.tint);
  await foundTile.document.setFlag(NAMESPACE, 'order', tile.order);

  console.log("Flags saved:", {
    tileName: tile.name,
    opacity: tile.opacity,
    tint: tile.tint,
    order: tile.order
  });

  
  if (imagePaths) {
    const existingPaths = await foundTile.document.getFlag(NAMESPACE, 'imagePaths') || [];
    const pathsToSave = imagePaths.map((path, index) => ({
      img: path.img,
      displayImg: path.displayImg,
      tags: path.tags,
      color: path.color || existingPaths[index]?.color
    }));
    await foundTile.document.setFlag(NAMESPACE, 'imagePaths', pathsToSave);

    const currentImgIndex = await foundTile.document.getFlag(NAMESPACE, 'imgIndex') || 0;
    await foundTile.document.setFlag(NAMESPACE, 'imgIndex', currentImgIndex >= pathsToSave.length ? pathsToSave.length - 1 : currentImgIndex);
  }
}





// // Helper function to collect tile data
// export function collectTileData(container) {
//   const tileFields = container.find('.tile-field');
//   const tileData = [];

//   tileFields.each((index, tileField) => {
//     const $tileField = $(tileField);
//     const order = $tileField.attr('data-order'); // Use the order attribute for naming
//     const name = $tileField.find(`input[name="tile-name-${order}"]`).val();
//     const opacity = $tileField.find(`input[name="tile-opacity-${order}"]`).val();
//     const tint = $tileField.find(`input[name="tile-tint-${order}"]`).val();

//     tileData.push({ name, opacity, tint, order });
//   });

//   return tileData;
// }

// // Helper function to collect image paths
// export function collectImagePaths(container) {
//   const pathListItems = container.find('#image-path-list .form-field');
//   const imagePaths = [];

//   pathListItems.each((index, pathItem) => {
//     const $pathItem = $(pathItem);
//     const img = $pathItem.find('.path-field').data('img');
//     const tags = $pathItem.find('.tag-field').val().split(',').map(tag => tag.trim());
//     const color = $pathItem.find('.color-picker').val();

//     imagePaths.push({ img, displayImg: img.split('/').pop(), tags, color });
//   });

//   return imagePaths;
// }

// // Helper function to save tile flags
// export async function saveTileFlags(tile, foundTile, imagePaths) {
//   await foundTile.document.setFlag(NAMESPACE, 'tileName', tile.name);
//   await foundTile.document.setFlag(NAMESPACE, 'opacity', tile.opacity);
//   await foundTile.document.setFlag(NAMESPACE, 'tint', tile.tint);
//   await foundTile.document.setFlag(NAMESPACE, 'order', tile.order); // Ensure order is saved

//   if (imagePaths) {
//     const existingPaths = await foundTile.document.getFlag(NAMESPACE, 'imagePaths') || [];
//     const pathsToSave = existingPaths.map((path, index) => ({
//       img: path.img,
//       displayImg: path.displayImg,
//       tags: path.tags,
//       color: path.color || existingPaths[index]?.color
//     }));
//     await foundTile.document.setFlag(NAMESPACE, 'imagePaths', pathsToSave);
//     const currentImgIndex = await foundTile.document.getFlag(NAMESPACE, 'imgIndex') || 0;
//     if (currentImgIndex >= pathsToSave.length) {
//       const newIndex = pathsToSave.length > 0 ? pathsToSave.length - 1 : 0;
//       await foundTile.document.setFlag(NAMESPACE, 'imgIndex', newIndex);
//     } else {
//       await foundTile.document.setFlag(NAMESPACE, 'imgIndex', currentImgIndex);
//     }
//   }
// }

// Remove all tile flags
export async function clearTileFlags(instance) {
  const tiles = canvas.tiles.placeables;
  for (let tile of tiles) {
    await tile.document.unsetFlag(NAMESPACE, 'tileName');
    await tile.document.unsetFlag(NAMESPACE, 'opacity');
    await tile.document.unsetFlag(NAMESPACE, 'tint');
    await tile.document.unsetFlag(NAMESPACE, 'order');

  }
  instance.tiles = []; // Clear the instance's tile data
  console.log('Tile flags cleared and instance tiles reset.');
}

export async function loadTileData(instance) {
  instance.tiles = canvas.tiles.placeables.map(tile => {
    const name = tile.document.getFlag(NAMESPACE, 'tileName') || '';
    const opacity = tile.document.getFlag(NAMESPACE, 'opacity') || 1;
    const tint = tile.document.getFlag(NAMESPACE, 'tint') || '';
    const order = Number(tile.document.getFlag(NAMESPACE, 'order'));
    const imagePaths = tile.document.getFlag(NAMESPACE, 'imagePaths') || [];

    // Only return tiles that have a valid name
    if (name.trim() !== '') { // only load tiles w/valid names
      console.log(`Loaded tile: ${tile.id}`, { name, opacity, tint, order, imagePaths });
      return { id: tile.id, name, opacity, tint, order, imagePaths };
    }
  }).filter(tile => tile !== undefined);

  console.log("Loaded tile data:", instance.tiles);
}

export async function loadTileImages(instance, tile) {
  if (!tile || !tile.document) {
    console.error("No tile provided or tile is undefined.");
    ui.notifications.warn("No tile provided or tile is undefined.");
    return;
  }

  // Fetch the image paths stored in the tile's flags
  let loadedPaths = tile.document.getFlag(NAMESPACE, 'imagePaths') || [];

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
  // instance.render(true);
  // Initial call to update the button state
  // setTimeout(() => updateActiveTileButton(instance), 10);  // Delay the update call to ensure DOM has updated
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

export function updateStageButtons(instance) {
  // Select all elements with the class 'stage-buttons-container'
  const stageButtonsContainers = document.querySelectorAll('.stage-buttons-container');

  if (!stageButtonsContainers.length) {
    console.warn('Stage buttons container not found.');
    return;
  }

  // Loop through each container and update its buttons
  stageButtonsContainers.forEach(stageButtonsContainer => {
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
  });
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
    instance.currentTileId = tile.id; // Update the current tile
    console.log("Check - Current Tile ID: ", instance.currentTileId);
    await loadTileImages(instance, tile); // Load images for the new active tile
    updateActiveTileButton(instance); // Update button states
  } catch (error) {
    console.error("Error controlling tile:", error);
    ui.notifications.error("Failed to activate tile; Please add tiles.");
  }
}

export function deselectActiveTile(instance) {
  instance.currentTile = null;
  instance.currentTileIndex = null;
  instance.render(true);
}

export function switchToTileByTag(instance, tag) {
  const tiles = canvas.tiles.placeables;
  console.log(`TotM - Checking for tiles with tag: ${tag}`);

  const tileWithTag = tiles.find(t => Tagger.hasTags(t, [tag], { caseInsensitive: true, matchExactly: true }));

  if (tileWithTag) {
    console.log("TotM - Found tile with tag:", tag);
    instance.currentActiveTag = tag; // Update the current active tag
    instance.currentTile = tileWithTag; // Update the current tile
    instance.currentTileId = tileWithTag.id; // Update the current tile ID (for reference)
    activateTile(instance, tileWithTag);
    updateActiveTileButton(instance); // Update button states
  } else {
    console.log("TotM - No tile found with the specified tag:", tag);
    ui.notifications.error(`No tile found with tag: ${tag}`);
  }
}
