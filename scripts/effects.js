import { NAMESPACE, logMessage, isTokenMagicActive, getTileFlag } from './utilities.js';
import { getEffectParams, getElementByIdOrWarn } from './utilities.js';
import { populateTileDropdown, populateImageDropdown } from './utilities.js';


///////////////////////////////////
// Watch dropdown target changes //
///////////////////////////////////

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

    const container = document.querySelector('.dropdown-container');
    if (container) {
      populateTileDropdown(tiles, instance.currentTile?.id, container);
    } else {
      console.warn('Container with class "dropdown-container" not found.');
    }
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

// Collect information and save the effect to the relevant target
export async function addEffect(instance) {
  const targetType = document.getElementById('target-dropdown').value;
  const effectName = document.getElementById('effect-dropdown').value;
  const effectParams = await getEffectParams(effectName);

  if (targetType === 'tile') {
    const tileId = document.getElementById('tile-dropdown').value;
    const tile = canvas.tiles.get(tileId);
    if (tile) {
      await updateEffectsData(tile, effectParams, true, true);
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
        await updateEffectsData(tile, effectParams, true, false, imageId);

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

export async function removeEffect(instance, targetType, effectName) {
  // Retrieve effect parameters based on effect name
  const effectParamsArray = await getEffectParams(effectName);
  if (!effectParamsArray || effectParamsArray.length === 0) {
    console.error(`No effect parameters found for effect name: ${effectName}`);
    return;
  }

  const effectParams = effectParamsArray[0]; // Assuming only one set of parameters
  logMessage(`Removing effect: ${effectName} with parameters:`, effectParams);

  let tile = canvas.tiles.controlled[0];
  if (!tile) {
    console.error("No active tile found to remove effect.");
    return;
  }


  if (targetType === 'tile') {
    // Handle tile-wide effects
    let tileEffects = await tile.document.getFlag(NAMESPACE, 'tileEffects') || [];
    tileEffects = tileEffects.map(effectArray =>
      effectArray.filter(effect => effect.filterId !== effectParams.filterId)
    ).filter(effectArray => effectArray.length > 0); // Remove empty arrays

    // Update the tileEffects flag on the tile document
    await tile.document.setFlag(NAMESPACE, 'tileEffects', tileEffects);

  } else if (targetType === 'image') {
    // Retrieve the image ID from the effect target name element
    const imageId = document.querySelector('.effect-item .effect-target-name').textContent;
    const imagePaths = await tile.document.getFlag(NAMESPACE, 'imagePaths');
    if (!imagePaths) {
      console.error("No image paths found on the tile.");
      return;
    }

    // Find the specific image based on displayImg
    const image = imagePaths.find(img => img.displayImg === imageId);
    if (!image) {
      console.error("No image found to remove effect.");
      return;
    }

    // Remove the effect from the nested effects array
    image.effects = image.effects.map(effectArray =>
      effectArray.filter(effect => effect.filterId !== effectParams.filterId)
    ).filter(effectArray => effectArray.length > 0); // Remove empty arrays

    // Update the imagePaths flag on the tile document
    await tile.document.setFlag(NAMESPACE, 'imagePaths', imagePaths);
  }

  if (tile) {
    logMessage("Tile before effect removal:", tile);

    // Remove effect using TokenMagic
    await removeTokenMagicEffect(tile, effectParams, targetType === 'tile');

    // Update the tile's effect data
    await updateEffectsData(tile, effectParams, false, targetType === 'tile');

    // Update the UI to reflect changes
    updateEffectsUI(instance);
    logMessage(`Effect ${effectName} removed from ${targetType}.`);
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

export async function removeTokenMagicEffect(target, effectParams, isTile) {
  const filterId = effectParams.filterId || effectParams.tmFilterId;
  console.log(`Attempting to remove effect: ${filterId} from ${isTile ? 'tile' : 'image'}`);

  if (!filterId) {
    console.error(`Invalid effect parameters provided:`, effectParams);
    return;
  }

  if (game.modules.get('tokenmagic')?.active) {
    TokenMagic.deleteFilters(target, filterId);
    logMessage(`Effect removed from ${isTile ? 'tile' : 'image'}`);
  } else {
    console.warn("TokenMagic module is not active.");
  }

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
  logMessage("Current effects before update:", JSON.stringify(effects));

  if (isTile) {
    if (isAdd) {
      effects.push(effectParams);
    } else {
      effects = effects.filter(effect => effect.filterId !== effectParams.filterId);
    }
    await target.document.setFlag(NAMESPACE, flag, effects);
    logMessage(`Updated effects on tile: ${JSON.stringify(effects)}`);
  } else {
    const imagePaths = effects.map(imgPath =>
      imgPath.img === imageId
        ? { ...imgPath, effects: isAdd ? [...(imgPath.effects || []), effectParams] : (imgPath.effects || []).filter(effect => effect.filterId !==  effectParams.filterId) }
      : imgPath
    );
    await target.document.setFlag(NAMESPACE, flag, imagePaths);
    logMessage(`Updated effects on image: ${JSON.stringify(imagePaths)}`);
  }
  // Verify flag data after update
  const updatedEffects = await target.document.getFlag(NAMESPACE, flag);
  console.log("Updated effects:", JSON.stringify(updatedEffects));
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

  return effectItem;
}

////

export async function updateEffectsUI(instance) {
  const tile = canvas.tiles.controlled[0];
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
    if (effects.length === 0) {
      return false;  // Indicate no effects were found
    } else {
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
      return true;  // Indicate effects were found
    }
  };

  // Track if any effects were found
  let anyEffectsFound = false;

  // Get and display tile-wide effects
  const tileEffects = tile.document.getFlag(NAMESPACE, 'tileEffects') || [];
  const foundTileEffects = appendEffectItems(tileEffects, 'Tile', 'Tile', tile);
  if (foundTileEffects) {
    anyEffectsFound = true;
  }

  // Get and display image-specific effects
  const imagePaths = tile.document.getFlag(NAMESPACE, 'imagePaths') || [];
  imagePaths.forEach((image, imageIndex) => {
    const imageEffects = image.effects || [];
    const foundImageEffects = appendEffectItems(imageEffects, 'Image', image.displayImg, tile, image);
    if (foundImageEffects) {
      anyEffectsFound = true;
    }
  });

  // If no effects were found, display a single message
  if (!anyEffectsFound) {
    const noEffectsMessage = document.createElement('div');
    noEffectsMessage.textContent = "No effects found.";
    effectsContainer.appendChild(noEffectsMessage);
  }

  logMessage(`Updated current effects for tile ${tile.id}`);
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
