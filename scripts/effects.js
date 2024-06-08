import { NAMESPACE } from './utilities.js';
import { hexToDecimal, adjustColor, findTileByTag } from './utilities.js';
import { getImageById } from './images.js';
import { ModifyEffectForm } from './modifyEffectForm.js';

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

    tileDropdown.innerHTML = '';

    const filteredTiles = tiles.filter(tile => tile.document.getFlag(NAMESPACE, 'tileName'));
    filteredTiles.forEach(tile => {
        const option = document.createElement('option');
        option.value = tile.id;
        const tileName = tile.document.getFlag(NAMESPACE, 'tileName');
        option.textContent = tileName;
        tileDropdown.appendChild(option);
    });

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

async function isTokenMagicActive() {
    if (!game.modules.get('tokenmagic')?.active) {
        console.warn("TokenMagic module is not active.");
        return false;
    }
    return true;
}

async function getEffectParams(effectName) {
    // Assuming TokenMagic.getPreset is the function to get effect presets
    const effectParams = TokenMagic.getPreset(effectName);
    if (!effectParams) {
        console.error(`No effect parameters found for effect: ${effectName}`);
        return null;
    }
    return effectParams;
}

export async function applyTokenMagicEffect(target, effectParams, isTile = true) {
  if (!await isTokenMagicActive()) return;

  // Ensure effectParams is an array
  const effectParamsArray = Array.isArray(effectParams) ? effectParams : [effectParams];

  effectParamsArray.forEach((param, index) => {
    if (!param.tmFilterId) {
      param.tmFilterId = `${param.filterId}-${index}`;
    }
    if (!param.filterInternalId) {
      param.filterInternalId = foundry.utils.randomID();
    }
    if (!param.filterOwner) {
      param.filterOwner = game.userId;
    }
    console.log(`Applying param ${index}:`, param);
  });

  try {
    console.log(`${isTile ? 'Tile' : 'Image'} before applying filters:`, target);
    console.log("Effect Parameters:", effectParamsArray);

    // Apply the effect to the target
    await TokenMagic.addFilters(target, effectParamsArray);
    console.log(`Effect applied to ${isTile ? 'tile' : 'image'} ${target.id || target.displayImg}`);
  } catch (error) {
    console.error("Error applying TokenMagic effect:", error);
  }
};


export async function addEffect(instance, targetType, effectName, effectParams, tileId, imageId = null) {
  const applyEffect = async (tile, isTile) => {
    await applyTokenMagicEffect(tile, effectParams, isTile);
    await updateEffects(tile, effectParams, true, !isTile);
  };

  try {
    const tile = canvas.tiles.get(tileId);
    if (!tile) throw new Error("No tile found to apply effect.");

    if (targetType === 'tile') {
      await applyEffect(tile, true);

      // Store the effect in the tile's effects array
      let tileEffects = tile.document.getFlag(NAMESPACE, 'tileEffects') || [];
      if (Array.isArray(tileEffects[0])) {
        tileEffects = tileEffects.flat();
      }
      tileEffects.push(effectParams);
      await tile.document.setFlag(NAMESPACE, 'tileEffects', tileEffects);
      
    } else if (targetType === 'image') {
      const imagePaths = await tile.document.getFlag(NAMESPACE, 'imagePaths') || [];
      const image = imagePaths.find(img => img.img === imageId);
      if (!image) throw new Error("No image found to apply effect.");

      await applyEffect(tile, false);

      // Store the effect in the image's effects array
      const imgIndex = imagePaths.findIndex(img => img.img === imageId);
      if (imgIndex !== -1) {
        if (!Array.isArray(imagePaths[imgIndex].effects)) {
          imagePaths[imgIndex].effects = [];
        }
        imagePaths[imgIndex].effects.push(effectParams);
        await tile.document.setFlag(NAMESPACE, 'imagePaths', imagePaths);
      } else {
        console.error(`Image with ID ${imageId} not found in imagePaths.`);
      }
    }
  } catch (error) {
    console.error(error.message);
    // Optionally, add UI notification here
  }
}


function createEffectItem(targetType, targetName, effectName, effectId, tile, image = null) {
  let tileName = tile.document.getFlag(NAMESPACE, 'tileName') || 'Unknown Tile';

  const effectItem = document.createElement('div');
  effectItem.classList.add('effect-item');
  effectItem.innerHTML = `
      <span class="effect-target-type">
        ${targetType === 'Tile' ? '<i class="fas fa-square"></i>' : '<i class="fas fa-image"></i>'}
      </span>
      <span class="effect-target-name">${targetType === 'Tile' ? tileName : targetName}</span>
      <span class="effect-name">${effectName}</span>
      <button class="remove-effect-button" data-effect-id="${effectId}"><i class="fas fa-trash"></i></button>
    `;
  
  effectItem.querySelector('.remove-effect-button').addEventListener('click', () => {
    removeEffect(tile, targetType, effectName, targetName);
  });

  return effectItem;
}

function removeEffectFromList(effects, effectName) {
  for (let i = 0; i < effects.length; i++) {
    if (Array.isArray(effects[i])) {
      for (let j = 0; j < effects[i].length; j++) {
        if (effects[i][j].filterId === effectName || effects[i][j].tmFilterId === effectName) {
          effects[i].splice(j, 1);
          if (effects[i].length === 0) {
            effects.splice(i, 1);
          }
          console.log(`Removed effect: ${effectName} from nested array at index ${i}`);
          return true;
        }
      }
    } else if (effects[i].filterId === effectName || effects[i].tmFilterId === effectName) {
      effects.splice(i, 1);
      console.log(`Removed effect: ${effectName} from array at index ${i}`);
      return true;
    }
  }
  console.error(`No effect found with id: ${effectName}`);
  return false;
}

export async function removeEffect(tile, targetType, effectName) {
  console.log(`Attempting to remove effect: ${effectName} from tile`, tile);

  if (!tile) {
    console.error("No tile provided.");
    return;
  }

  if (targetType === 'Tile') {
    let tileEffects = tile.document.getFlag("totm-manager", 'tileEffects') || [];
    console.log("Tile Effects Before Removal:", JSON.stringify(tileEffects, null, 2));
    const result = removeEffectFromList(tileEffects, effectName);
    console.log("Tile Effects After Removal:", JSON.stringify(tileEffects, null, 2));
    if (result) {
      await tile.document.setFlag("totm-manager", 'tileEffects', tileEffects);
      console.log(`Effect ${effectName} removed from tile effects`);
    } else {
      console.error(`Failed to remove effect ${effectName} from tile effects`);
    }

    // Remove the effect using TokenMagic
    await removeTokenMagicEffect(tile, effectName, true);
  } else if (targetType === 'Image') {
    const imageId = document.getElementById('image-dropdown').value;
    let imagePaths = tile.document.getFlag("totm-manager", 'imagePaths') || [];
    console.log("Image Paths Before Removal:", JSON.stringify(imagePaths, null, 2));
    let image = imagePaths.find(img => img.img === imageId);
    if (image) {
      const result = removeEffectFromList(image.effects, effectName);
      console.log("Image Paths After Removal:", JSON.stringify(imagePaths, null, 2));
      if (result) {
        await tile.document.setFlag("totm-manager", 'imagePaths', imagePaths);
        console.log(`Effect ${effectName} removed from image effects`);
      } else {
        console.error(`Failed to remove effect ${effectName} from image effects`);
      }
      
      // Remove the effect using TokenMagic
      await removeTokenMagicEffect(tile, effectName, false);
    } else {
      console.error("No image found with the provided ID.");
    }
  } else {
    console.error("Invalid target type.");
  }
  updateCurrentEffects(tile);
}

export async function removeTokenMagicEffect(target, effectName, isTile) {
  console.log(`Attempting to remove effect: ${effectName} from ${isTile ? 'tile' : 'image'}`);

  // Fetch the effect parameters using the effect name
  const effectParamsArray = await getEffectParams(effectName);
  if (!effectParamsArray) {
    console.error(`Invalid effect parameters provided for effect: ${effectName}`);
    return;
  }
  const effectParams = Array.isArray(effectParamsArray) ? effectParamsArray[0] : effectParamsArray;

  if (!effectParams || !effectParams.filterId) {
    console.error(`Invalid effect parameters provided:`, effectParams);
    return;
  }

  console.log(`Removing effect with parameters:`, effectParams);

  // Use TokenMagic to remove the effect from the target
  if (game.modules.get('tokenmagic')?.active) {
    TokenMagic.deleteFilters(target, effectParams.filterId);
    console.log(`Effect ${effectName} removed from ${isTile ? 'tile' : 'image'}`);
  } else {
    console.warn("TokenMagic module is not active.");
  }
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

  // Helper function to create and append effect items
  const appendEffectItems = (effects, targetType, targetName, tile, image = null) => {
    effects.forEach((effect, index) => {
      const effectName = document.getElementById('effect-dropdown').value || "Unknown Effect!";
      const effectId = `${targetType}-${index}`;
      const effectItem = createEffectItem(targetType, targetName, effectName, effectId, tile, image);
      effectsContainer.appendChild(effectItem);
    });
  };

  // Get and display tile-wide effects
  const tileEffects = tile.document.getFlag(NAMESPACE, 'tileEffects') || [];
  appendEffectItems(tileEffects, 'Tile', 'Tile', tile);

  // Get and display image-specific effects
  const imagePaths = tile.document.getFlag(NAMESPACE, 'imagePaths') || [];
  imagePaths.forEach((image, imageIndex) => {
    const imageEffects = image.effects || [];
    appendEffectItems(imageEffects, 'Image', image.displayImg, tile, image);
  });

  console.log(`Updated current effects for tile ${tile.id}`);
}


export async function updateEffects(target, effectParams, isAdd, isTile = true) {
  if (!target) {
    console.error("No target provided for updating effects.");
    return;
  }

  const flag = isTile ? 'tileEffects' : 'imagePaths';
  let effects = await target.document.getFlag(NAMESPACE, flag) || (isTile ? [] : []);

  if (isTile) {
    if (isAdd) {
      effects.push(effectParams);
    } else {
      effects = effects.filter(effect => effect.filterId !== effectParams.filterId);
    }
    await target.document.setFlag(NAMESPACE, flag, effects);
  } else {
    const imagePaths = effects.map(imgPath =>
      imgPath.img === target.img
        ? { ...imgPath, effects: isAdd ? [...(imgPath.effects || []), effectParams] : (imgPath.effects || []).filter(effect => effect.filterId !== effectParams.filterId) }
      : imgPath
    );
    await target.document.setFlag(NAMESPACE, flag, imagePaths);
  }
}


export function onTargetChange(event, instance) {
  const target = event.target.value;
  instance.selectedTarget = target;

  console.log(`Target changed to: ${target}`);
  console.log(`Current tile:`, instance.currentTile);
  console.log(`Current image paths:`, instance.imagePaths);

  if (target === 'tile') {
    document.getElementById('tile-selection').style.display = 'block';
    document.getElementById('image-selection').style.display = 'none';
    const tiles = canvas.tiles.placeables;
    console.log(`Tiles available:`, tiles);
    populateTileDropdown(tiles, instance.currentTile?.id);
  } else if (target === 'image') {
    document.getElementById('tile-selection').style.display = 'none';
    document.getElementById('image-selection').style.display = 'block';
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

console.log("effects.js loaded!");
