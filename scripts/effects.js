import { NAMESPACE, logMessage, isTokenMagicActive, getTileFlag } from './utilities.js';
import { getEffectParams, getElementByIdOrWarn, populateDropdown } from './utilities.js';
import { saveTileDataToFlags } from './tiles-utils.js';


////////////////////////
// Populate Dropdowns //
////////////////////////

export async function populateEffectsDropdown() {
  const presets = TokenMagic.getPresets();
  logMessage("TokenMagic presets: ", presets);

  if (!presets || presets.length === 0) {
    console.warn("No presets found or Token Magic module is not active.");
    return;
  }

  const dropdown = getElementByIdOrWarn('effect-dropdown', 'Dropdown');
  if (!dropdown) return;

  logMessage("Populating dropdown with presets...");
  populateDropdown(dropdown, presets, 'name', 'name');
  logMessage("Dropdown populated with presets.");
}

export function populateTileDropdown(tiles, currentTileId) {
  const tileDropdown = getElementByIdOrWarn('tile-dropdown', 'Tile dropdown');
  if (!tileDropdown) return;

  const filteredTiles = tiles.filter(tile => tile.document.getFlag(NAMESPACE, 'tileName'));
  const tileOptions = filteredTiles.map(tile => ({
    value: tile.id,
    text: tile.document.getFlag(NAMESPACE, 'tileName')
  }));

  populateDropdown(tileDropdown, tileOptions, 'value', 'text');

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

  const dropdown = getElementByIdOrWarn('image-dropdown', 'Image dropdown');
  if (!dropdown) return;

  console.log("Image paths: ", imagePaths);
  const imageOptions = imagePaths.map(image => ({
    value: image.img,
    text: image.displayImg
  }));

  populateDropdown(dropdown, imageOptions, 'value', 'text');
  console.log("Image dropdown populated.");
}


export function onTargetChange(event, instance) {
  const target = event.target.value;
  instance.selectedTarget = target;

  console.log(`Target changed to: ${target}`);
  console.log(`Current tile:`, instance.currentTile);
  console.log(`Current image paths:`, instance.imagePaths);

  const tileSelection = getElementByIdOrWarn('tile-selection', 'Tile selection');
  const imageSelection = getElementByIdOrWarn('image-selection', 'Image selection');
  if (!tileSelection || !imageSelection) return;

  if (target === 'tile') {
    tileSelection.style.display = 'block';
    imageSelection.style.display = 'none';
    const tiles = canvas.tiles.placeables;
    console.log(`Tiles available:`, tiles);
    populateTileDropdown(tiles, instance.currentTile?.id);
  } else if (target === 'image') {
    tileSelection.style.display = 'none';
    imageSelection.style.display = 'block';
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
      // ui.notifications.warn("No images found for the selected tile. Please add images first.");
    }
  }
}





///////////////////////////////////
// Add & Remove Effect Functions //
///////////////////////////////////

export async function addEffect(instance) {
  const targetType = document.getElementById('target-dropdown').value;
  const effectName = document.getElementById('effect-dropdown').value;
  const effectParams = await getEffectParams(effectName);

  if (targetType === 'tile') {
    const tileId = document.getElementById('tile-dropdown').value;
    const tile = canvas.tiles.get(tileId);
    if (tile) {
      await saveTileDataToFlags(tile, 'tile', effectParams);
      await applyTokenMagicEffect(tile, effectParams, true);
    } else {
      console.error("No tile found to apply effect.");
    }
  } else if (targetType === 'image') {
    const imageId = document.getElementById('image-dropdown').value;
    if (instance.currentTile) {
      const tile = instance.currentTile;
      let imagePaths = getTileFlag(tile, 'imagePaths');
      const image = imagePaths.find(img => img.img === imageId);

      if (image) {
        await saveTileDataToFlags(tile, 'image', effectParams, imageId);

        // Check if the image is the currently active image
        const currentIndex = await tile.document.getFlag(NAMESPACE, 'imgIndex');
        if (imagePaths[currentIndex]?.img === imageId) {
          await applyTokenMagicEffect(tile, effectParams, false);
        }
      } else {
        console.error("No image found to apply effect.");
      }
    } else {
      console.error("No tile selected.");
    }
  }
}

//// 

export async function removeEffect(instance) {
  const targetType = document.getElementById('target-dropdown').value;
  const effectName = document.getElementById('effect-dropdown').value;
  const effectParams = await getEffectParams(effectName);

  if (targetType === 'tile') {
    const tileId = document.getElementById('tile-dropdown').value;
    const tile = canvas.tiles.get(tileId);
    if (tile) {
      await updateEffectsData(tile, effectParams, false, true);
      await removeTokenMagicEffect(tile, effectParams, true);
    } else {
      console.error("No tile found to remove effect.");
    }
  } else if (targetType === 'image') {
    const imageId = document.getElementById('image-dropdown').value;
    if (instance.currentTile) {
      const tile = instance.currentTile;
      let imagePaths = getTileFlag(tile, 'imagePaths');
      const image = imagePaths.find(img => img.img === imageId);

      if (image) {
        await updateEffectsData(tile, effectParams, false, false, imageId);

        // Check if the image is the currently active image
        const currentIndex = await tile.document.getFlag(NAMESPACE, 'imgIndex');
        if (imagePaths[currentIndex]?.img === imageId) {
          await removeTokenMagicEffect(tile, effectParams, false);
        }
      } else {
        console.error("No image found to remove effect.");
      }
    } else {
      console.error("No tile selected.");
    }
  }
}

///////////////////////////
// Token Magic Functions //
///////////////////////////


export async function applyTokenMagicEffect(target, effectParams, isTile = true) {
  if (!await isTokenMagicActive()) return;

  // Ensure effectParams is an array
  const effectParamsArray = Array.isArray(effectParams) ? effectParams : [effectParams];

  effectParamsArray.forEach((param, index) => {
    param.tmFilterId = param.tmFilterId || `${param.filterId}-${index}`;
    param.filterInternalId = param.filterInternalId || foundry.utils.randomID();
    param.filterOwner = param.filterOwner || game.userId;
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

  // Update the effects flag on the target
  await updateEffectsData(target, effectParams, true, isTile, isTile ? null : target.img);
}

////

export async function removeTokenMagicEffect(target, effectName, isTile) {
  console.log(`Attempting to remove effect: ${effectName} from ${isTile ? 'tile' : 'image'}`);

  const effectParamsArray = await getEffectParams(effectName);
  if (!effectParamsArray) {
    console.error(`Invalid effect parameters provided for effect: ${effectName}`);
    return;
  }
  const effectParams = Array.isArray(effectParamsArray) ? effectParamsArray[0] : effectParamsArray;

  if (!effectParams?.filterId) {
    console.error(`Invalid effect parameters provided:`, effectParams);
    return;
  }

  console.log(`Removing effect with parameters:`, effectParams);

  if (game.modules.get('tokenmagic')?.active) {
    TokenMagic.deleteFilters(target, effectParams.filterId);
    console.log(`Effect ${effectName} removed from ${isTile ? 'tile' : 'image'}`);
  } else {
    console.warn("TokenMagic module is not active.");
  }

  // Update the effects flag on the target
  await updateEffectsData(target, effectParams, false, isTile, isTile ? null : target.img);
}


//////////////////////////////
// Update effects function  //
//////////////////////////////

export async function updateEffectsData(target, effectParams, isAdd, isTile = true, imageId = null) {
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
    console.log(`Updated effects on tile: ${JSON.stringify(effects)}`);
  } else {
    const imagePaths = effects.map(imgPath =>
      imgPath.img === imageId
        ? { ...imgPath, effects: isAdd ? [...(imgPath.effects || []), effectParams] : (imgPath.effects || []).filter(effect => effect.filterId !== effectParams.filterId) }
      : imgPath
    );
    await target.document.setFlag(NAMESPACE, flag, imagePaths);
    console.log(`Updated effects on image: ${JSON.stringify(imagePaths)}`);
  }
}


/////////////////////////
//   Effect Lists      //
/////////////////////////

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

////

function removeEffectFromList(effects, effectName) {
  let removed = false;

  effects.forEach((effect, i) => {
    if (Array.isArray(effect)) {
      effect.forEach((nestedEffect, j) => {
        if (nestedEffect.filterId === effectName || nestedEffect.tmFilterId === effectName) {
          effect.splice(j, 1);
          if (effect.length === 0) {
            effects.splice(i, 1);
          }
          removed = true;
        }
      });
    } else if (effect.filterId === effectName || effect.tmFilterId === effectName) {
      effects.splice(i, 1);
      removed = true;
    }
  });
  
  return removed;
}

////

export function updateEffectsUI(tile) {
  if (!tile) {
    console.error("No tile provided.");
    return;
  }

  const effectsContainer = getElementByIdOrWarn('current-effects-container', 'Current effects container');
  if (!effectsContainer) return;

  // Clear the existing effects list
  effectsContainer.innerHTML = '';

  // Helper function to create and append effect items
  const appendEffectItems = (effects, targetType, targetName, tile, image = null) => {
    effects.forEach((effect, index) => {
      // Handle nested arrays of effects
      const effectItems = Array.isArray(effect) ? effect : [effect];
      effectItems.forEach((nestedEffect, nestedIndex) => {
        const effectName = nestedEffect.filterId || nestedEffect.tmFilterId || "Unknown Effect!";
        const effectId = `${targetType}-${index}-${nestedIndex}`;
        const effectItem = createEffectItem(targetType, targetName, effectName, effectId, tile, image);
        effectsContainer.appendChild(effectItem);
      });
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

///////////////////////////////
// Effect Utility Functions  //
///////////////////////////////


export async function applyEffectsToTile(tile, effects, isTile) {
  for (const effect of effects) {
    const effectParams = await getEffectParams(effect.filterId || effect.tmFilterId);
    await applyTokenMagicEffect(tile, effectParams, isTile);
  }
}

////

export async function removeEffectsFromTile(tile, effects, isTile) {
  for (const effect of effects) {
    await removeTokenMagicEffect(tile, effect.filterId || effect.tmFilterId, isTile);
  }
}


console.log("effects.js loaded!");
