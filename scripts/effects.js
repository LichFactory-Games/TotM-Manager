import { NAMESPACE } from './utilities.js';
import { hexToDecimal, adjustColor, findTileByTag } from './utilities.js';
import { getImageById } from './images.js';

export async function populateEffectsDropdown() {
    const presets = TokenMagic.getPresets();
    console.log("TokenMagic presets: ", presets);

    if (!presets || presets.length === 0) {
        console.warn("No presets found or Token Magic module is not active.");
        return;
    }

    const dropdown = document.getElementById('effect-dropdown');
    if (!dropdown) {
        console.error("Dropdown element not found!");
        return;
    }

    console.log("Populating dropdown with presets...");
    dropdown.innerHTML = '';

    presets.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.name;
        option.textContent = preset.name;
        dropdown.appendChild(option);
    });

    console.log("Dropdown populated with presets.");
}

export function populateTileDropdown(tiles, currentTileId) {
    const tileDropdown = document.getElementById('tile-dropdown');
    if (!tileDropdown) {
        console.error("Tile dropdown element not found!");
        return;
    }

    // Clear the existing options
    tileDropdown.innerHTML = '';

    // Filter tiles to include only those with a tileName flag
    const filteredTiles = tiles.filter(tile => tile.document.getFlag(NAMESPACE, 'tileName'));

    // Populate the dropdown with filtered tile names and IDs
    filteredTiles.forEach(tile => {
        const option = document.createElement('option');
        option.value = tile.id;
        const tileName = tile.document.getFlag(NAMESPACE, 'tileName'); // We know tileName exists because of the filter
        option.textContent = tileName;
        tileDropdown.appendChild(option);
    });

    // Set the selected value to the current tile ID
    if (currentTileId) {
        tileDropdown.value = currentTileId;
    }

    console.log("Tile dropdown populated with tiles:", filteredTiles);
}

export async function populateImageDropdown(instance) {
    console.log("Populating image dropdown...");
    const imagePaths = instance.imagePaths;
    if (!imagePaths || imagePaths.length === 0) {
        console.error("Image paths are not defined or empty.");
        ui.notifications.warn("No images found for the selected tile. Please add images first.");
        return;
    }

    const dropdown = document.getElementById('image-dropdown');
    if (!dropdown) {
        console.error("Image dropdown element not found!");
        return;
    }

    console.log("Image paths: ", imagePaths);
    dropdown.innerHTML = '';

    imagePaths.forEach(image => {
        const option = document.createElement('option');
        option.value = image.img;
        option.textContent = image.displayImg;
        dropdown.appendChild(option);
    });

    console.log("Image dropdown populated.");
}

export async function applyEffectToTile(tile, effectName) {
    const effectParams = TokenMagic.getPreset(effectName);
    if (game.modules.get('tokenmagic')?.active) {
        TokenMagic.addFilters(tile, effectParams);
        console.log(`Effect ${effectName} applied to tile ${tile.id}`);

        // Store the effect in the tile's metadata
        let tileEffects = tile.document.getFlag('totm-manager', 'tileEffects') || [];
        tileEffects.push(effectName);
        await tile.document.setFlag('totm-manager', 'tileEffects', tileEffects);

        // Update current effects list
        updateCurrentEffects(tile);
    } else {
        console.warn("TokenMagic module is not active.");
    }
}

export async function applyEffectToImage(instance, tile, image, effectName) {
    if (!tile || !image) {
        console.error("No tile or image provided.");
        return;
    }

    const effectParams = TokenMagic.getPreset(effectName);
    if (game.modules.get('tokenmagic')?.active) {
        // Apply the effect to the image and store it in the image-specific metadata
        await TokenMagic.addFilters(tile, effectParams);
        console.log(`Effect ${effectName} applied to image ${image.displayImg} on tile ${tile.id}`);

        // Store the effect in the image-specific metadata
        let imageEffects = image.effects || [];
        imageEffects.push(effectName);
        image.effects = imageEffects;

        // Save the updated image paths with effects to the tile
      const imagePaths = await tile.document.getFlag(NAMESPACE, 'imagePaths') || [];
      const updatedImagePaths = imagePaths.map(imgPath => imgPath.img === image.img ? { ...imgPath, effects: imageEffects } : imgPath);
      await tile.document.setFlag(NAMESPACE, 'imagePaths', updatedImagePaths);

      // Update current effects list
      updateCurrentEffects(tile);
    } else {
        console.warn("TokenMagic module is not active.");
    }
}

async function deleteEffect(instance, tile, effectName, image = null) {
  console.log(`Deleting effect: ${effectName} from target: ${image ? 'image' : 'tile'}`);

   if (!tile) {
    console.error("No tile provided.");
    return;
  }

  if (image) {
    console.log(`Deleting effect from image:`, image);
    await removeEffectFromImage(instance, tile, image, effectName); // Function to remove effect from the image
  } else {
    console.log(`Deleting effect from tile:`, tile);
    await removeEffectFromTile(tile, effectName); // Function to remove effect from the tile
  }
}

export async function removeEffectFromTile(tile, effectName) {
    if (!tile) {
        console.error("No tile provided.");
        return;
    }
    if (game.modules.get('tokenmagic')?.active) {
        TokenMagic.deleteFilters(tile, effectName);
        console.log(`Effect ${effectName} removed from tile ${tile.id}`);

        // Remove the effect from the tile's metadata
        let tileEffects = tile.document.getFlag('totm-manager', 'tileEffects') || [];
        tileEffects = tileEffects.filter(effect => effect !== effectName);
        await tile.document.setFlag('totm-manager', 'tileEffects', tileEffects);

        // Update current effects list
        updateCurrentEffects(tile);
    } else {
        console.warn("TokenMagic module is not active.");
    }
}

export async function removeEffectFromImage(instance, tile, image, effectName) {
    if (!tile || !image) {
        console.error("No tile or image provided.");
        return;
    }

    if (game.modules.get('tokenmagic')?.active) {
        TokenMagic.deleteFilters(tile, effectName);
        console.log(`Effect ${effectName} removed from image ${image.displayImg} on tile ${tile.id}`);

        // Remove the effect from the image-specific metadata
        let imageEffects = image.effects || [];
        imageEffects = imageEffects.filter(effect => effect !== effectName);
        image.effects = imageEffects;

        // Save the updated image paths with effects to the tile
      const imagePaths = await tile.document.getFlag(NAMESPACE, 'imagePaths') || [];
      const updatedImagePaths = imagePaths.map(imgPath => imgPath.img === image.img ? { ...imgPath, effects: imageEffects } : imgPath);
      await tile.document.setFlag(NAMESPACE, 'imagePaths', updatedImagePaths);

      // Update current effects list
      updateCurrentEffects(tile);
    } else {
        console.warn("TokenMagic module is not active.");
    }
}

function createEffectItem(targetType, targetName, effect, effectId, tile, image = null) {
  let tileName = tile.document.getFlag(NAMESPACE, 'tileName') || 'Unknown Tile';
  const effectItem = document.createElement('div');
  effectItem.classList.add('effect-item');
  effectItem.innerHTML = `
    <span class="effect-target-type">
      ${targetType === 'Tile' ? '<i class="fas fa-square"></i>' : '<i class="fas fa-image"></i>'}
    </span>
    <span class="effect-target-name">${targetType === 'Tile' ? tileName : targetName}</span>
    <span class="effect-name">${effect}</span>
    <button class="delete-effect" data-effect-id="${effectId}"><i class="fas fa-trash"></i></button>
  `;

  // Add event listener to delete button
  effectItem.querySelector('.delete-effect').addEventListener('click', () => {
    deleteEffect(null, tile, effect, image);
  });

  return effectItem;
}


export function updateCurrentEffects(tile) {
  if (!tile) {
    console.error("No tile provided.");
    return;
  }

  const effectsContainer = document.getElementById('current-effects-container');
  if (!effectsContainer) {
    console.error("Current effects container not found.");
    return;
  }

  // Clear the existing effects list
  effectsContainer.innerHTML = '';

  // Get tile-wide effects
  const tileEffects = tile.document.getFlag('totm-manager', 'tileEffects') || [];
  tileEffects.forEach((effect, index) => {
    const effectItem = createEffectItem('Tile', 'Tile', effect, `tile-${index}`, tile);
    effectsContainer.appendChild(effectItem);
  });

  // Get image-specific effects
  const imagePaths = tile.document.getFlag(NAMESPACE, 'imagePaths') || [];
  imagePaths.forEach((image, imageIndex) => {
    const imageEffects = image.effects || [];
    imageEffects.forEach((effect, effectIndex) => {
      const effectItem = createEffectItem('Image', image.displayImg, effect, `image-${imageIndex}-${effectIndex}`, tile, image);
      effectsContainer.appendChild(effectItem);
    });
  });

  console.log(`Updated current effects for tile ${tile.id}`);
}

export function onTargetChange(event, instance) {
  const target = event.target.value;
  instance.selectedTarget = target; // Store the selected target in the instance

  console.log(`Target changed to: ${target}`);
  console.log(`Current tile:`, instance.currentTile);
  console.log(`Current image paths:`, instance.imagePaths);

  if (target === 'tile') {
    document.getElementById('tile-selection').style.display = 'block';
    document.getElementById('image-selection').style.display = 'none';
    // Populate tile dropdown
    const tiles = canvas.tiles.placeables; // Assuming you have access to canvas tiles
    console.log(`Tiles available:`, tiles);
    populateTileDropdown(tiles, instance.currentTile?.id);
  } else if (target === 'image') {
    document.getElementById('tile-selection').style.display = 'none';
    document.getElementById('image-selection').style.display = 'block';
    // Ensure a tile is selected and imagePaths are populated
    if (!instance.currentTile) {
      console.error("No tile selected. Please select a tile first.");
      ui.notifications.warn("No tile selected. Please select a tile first.");
      return;
    }
    if (instance.imagePaths && instance.imagePaths.length > 0) {
      console.log("Image paths found, populating image dropdown.");
      populateImageDropdown(instance);
    } else {
      console.error("Image paths are not populated or empty.");
      ui.notifications.warn("No images found for the selected tile. Please add images first.");
    }
  }
}

export async function addEffect(instance) {
  const target = document.getElementById('target-dropdown').value;
  const effect = document.getElementById('effect-dropdown').value;
  console.log(`Adding effect: ${effect} to target: ${target}`);

  if (target === 'tile') {
    const tileId = document.getElementById('tile-dropdown').value;
    console.log(`Tile ID selected: ${tileId}`);
    const tile = canvas.tiles.get(tileId);
    if (tile) {
      console.log(`Applying effect to tile:`, tile);
      await applyEffectToTile(tile, effect); // Function to apply effect to the tile
    } else {
      console.error("No tile found to apply effect.");
    }
  } else if (target === 'image') {
    const imageId = document.getElementById('image-dropdown').value;
    console.log(`Image ID selected: ${imageId}`);
    const image = getImageById(instance, imageId); // Get the image by ID
    console.log(`Image found:`, image);
    if (image && instance.currentTile) {
      console.log(`Applying effect to image:`, image);
      await applyEffectToImage(instance, instance.currentTile, image, effect); // Function to apply effect to the image
    } else {
      console.error("No image found to apply effect or no tile selected.");
    }
  }
}

export async function removeEffect(instance) {
  const target = document.getElementById('target-dropdown').value;
  const effect = document.getElementById('effect-dropdown').value;
  console.log(`Removing effect: ${effect} from target: ${target}`);

  if (target === 'tile') {
    const tileId = document.getElementById('tile-dropdown').value;
    console.log(`Tile ID selected: ${tileId}`);
    const tile = canvas.tiles.get(tileId);
    if (tile) {
      console.log(`Removing effect from tile:`, tile);
      await removeEffectFromTile(tile, effect); // Function to remove effect from the tile
    } else {
      console.error("No tile found to remove effect.");
    }
  } else if (target === 'image') {
    const imageId = document.getElementById('image-dropdown').value;
    console.log(`Image ID selected: ${imageId}`);
    const image = getImageById(instance, imageId); // Get the image by ID
    console.log(`Image found:`, image);
    if (image && instance.currentTile) {
      console.log(`Removing effect from image:`, image);
      await removeEffectFromImage(instance, instance.currentTile, image, effect); // Function to remove effect from the image
    } else {
      console.error("No image found to remove effect or no tile selected.");
    }
  }
}

export function modifyEffect() {
  // Functionality to update the effect
}

console.log("effects.js loaded!");
