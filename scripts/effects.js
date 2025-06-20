import { NAMESPACE, logMessage, isTokenMagicActive, getTileFlag } from './utilities.js';
import { getEffectParams, getElementByIdOrWarn } from './utilities.js';
import { populateTileDropdown, populateImageDropdown } from './utilities.js';

// Safe wrapper for TokenMagic API calls
async function safeTokenMagicCall(method, ...args) {
  if (!game.modules.get("tokenmagic")?.active) {
    console.warn("TokenMagic module is not active.");
    return;
  }
  
  try {
    if (typeof TokenMagic !== 'undefined' && TokenMagic[method]) {
      return await TokenMagic[method](...args);
    } else {
      const tmModule = game.modules.get("tokenmagic");
      if (tmModule.api && tmModule.api[method]) {
        return await tmModule.api[method](...args);
      }
    }
  } catch (error) {
    console.warn(`TokenMagic ${method} call failed:`, error);
  }
}


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

  if (target === 'tile' || target === 'transitions') { // Handle tile and transitions similarly
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
    }
  } else {
    // Hide all by default
    tileSelection.style.display = 'none';
    imageSelection.style.display = 'none';
  }
}



///////////////////////////////////
// Add & Remove Effect Functions //
///////////////////////////////////

export async function addEffect(instance, targetType, effectName, effectParams, tileId, imageId) {
  if (!game.user.isGM) {
    console.log("User is not GM. Skipping addEffect.");
    return;
  }
  console.log(`Target Type: ${targetType}`);
  console.log(`Effect Name: ${effectName}`);
  console.log(`Effect Params:`, effectParams);

  let tile = canvas.tiles.get(tileId);
  if (!tile && instance.currentTile) {
    tile = instance.currentTile;
    console.warn("Tile not found by ID, using currentTile instead.");
  }

  if (!tile) {
    console.error("No valid tile found to apply effect.");
    return;
  }

  if (targetType === 'transitions') {
    // Remove any existing transition effects
    const existingEffects = await tile.document.getFlag(NAMESPACE, 'transitionEffects') || [];
    if (existingEffects.length > 0) {
      for (const { effectName: existingEffectName } of existingEffects) {
        await safeTokenMagicCall('deleteFilters', tile, existingEffectName);
      }
    }

    // Set the new transition effect, but don't apply it immediately
    const transitionEffects = [{ effectName, effectParams }];
    await tile.document.setFlag(NAMESPACE, 'transitionEffects', transitionEffects);
    console.log(`Transition effect ${effectName} added to tile ID: ${tile.id}`);
  } else if (targetType === 'tile') {
    await updateEffectsData(tile, effectParams, true, true);
    await applyTokenMagicEffect(tile, effectParams, true);
    console.log(`Effect applied to tile: ${tileId}`);
  } else if (targetType === 'image') {
    const imagePaths = await tile.document.getFlag(NAMESPACE, 'imagePaths') || [];
    const image = imagePaths.find(img => img.img === imageId);

    if (image) {
      image.effects = image.effects || [];
      image.effects.push(effectParams);
      await tile.document.setFlag(NAMESPACE, 'imagePaths', imagePaths);

      await applyEffectsToTile(tile, [effectParams], false, image);
      console.log(`Effect applied to image: ${imageId} on tile: ${tile.id}`);

      const currentIndex = await tile.document.getFlag(NAMESPACE, 'imgIndex');
      if (imagePaths[currentIndex]?.img === imageId) {
        console.log(`Effect applied to currently active image: ${imageId}`);
      }
    } else {
      console.error("No image found to apply effect.");
    }
  }

  // Update the UI to reflect the new effect
  updateEffectsUI(instance, tile);
}


////

export async function removeEffect(instance, targetType, effectName) {
  if (!game.user.isGM) {
    console.log("User is not GM. Skipping removeEffect.");
    return;
  }
  logMessage("removeEffect called with arguments:", { instance, targetType, effectName });

  // Retrieve effect parameters based on effect name
  const effectParams = await getEffectParams(effectName);
  if (!effectParams) {
    console.error(`No effect parameters found for effect name: ${effectName}`);
    logMessage("No effect parameters found for effect name:", effectName);
    return;
  }

  // Ensure effectParams is in array format
  const effectParamsArray = Array.isArray(effectParams) ? effectParams : [effectParams];
  logMessage(`Removing effect: ${effectName} with parameters:`, effectParamsArray);

  let tile = canvas.tiles.controlled[0];
  if (!tile) {
    logMessage("No active tile found to remove effect.");
    return;
  }
  logMessage("Tile found for removal:", tile);

  let imageId = null;

  if (targetType === 'tile') {
    // Handle tile-wide effects
    let tileEffects = await tile.document.getFlag(NAMESPACE, 'tileEffects') || [];
    logMessage("Tile effects before removal:", tileEffects);

    tileEffects = tileEffects.filter(effect => effect.filterId !== effectParamsArray[0].filterId);
    logMessage("Tile effects after removal:", tileEffects);

    // Update the tileEffects flag on the tile document
    await tile.document.setFlag(NAMESPACE, 'tileEffects', tileEffects);
    logMessage("Tile effects flag updated.");

  } else if (targetType === 'image') {
    // Handle image-specific effects
    const imagePaths = await tile.document.getFlag(NAMESPACE, 'imagePaths');
    if (!imagePaths) {
      console.error("No image paths found on the tile.");
      logMessage("No image paths found on the tile.");
      return;
    }
    logMessage("Image paths found on the tile:", imagePaths);

    // Use imageId for better targeting if necessary, fallback to existing logic
    imageId = document.querySelector('.effect-item .effect-target-name').textContent || null;
    logMessage("Image ID for effect removal:", imageId);

    const imageIndex = imagePaths.findIndex(img => img.displayImg === imageId);
    if (imageIndex === -1) {
      console.error("No image found to remove effect.");
      logMessage("No image found to remove effect.");
      return;
    }

    const image = imagePaths[imageIndex];
    logMessage("Image found for effect removal:", image);

    // Remove the effect from the nested effects array
    image.effects = image.effects.map(effectArray => {
      if (Array.isArray(effectArray)) {
        return effectArray.filter(effect => effect.filterId !== effectParamsArray[0].filterId);
      }
      return effectArray;
    }).filter(effectArray => effectArray.length > 0);

    logMessage("Image effects after removal:", image.effects);

    // Remove empty effect arrays
    if (image.effects.length === 0) {
      delete image.effects;
    }

    // Update the imagePaths flag on the tile document
    imagePaths[imageIndex] = image;
    await tile.document.setFlag(NAMESPACE, 'imagePaths', imagePaths);
    logMessage("Image paths flag updated.");

  } else if (targetType === 'transitions') {
    // Handle transition effects
    const transitionEffects = await tile.document.getFlag(NAMESPACE, 'transitionEffects') || [];
    logMessage("Transition effects before removal:", transitionEffects);

    const updatedEffects = transitionEffects.filter(effect => effect.effectName !== effectName);
    await tile.document.setFlag(NAMESPACE, 'transitionEffects', updatedEffects);

    logMessage("Updated transition effects after removal:", updatedEffects);

    if (updatedEffects.length === 0) {
      logMessage("No transition effects remain on the tile.");
    } else {
      logMessage(`Transition effect ${effectName} removed from tile ID: ${tile.id}`);
    }
  }

  if (tile) {
    logMessage("Tile before effect removal using TokenMagic:", tile);

    // Remove effect using TokenMagic
    await removeTokenMagicEffect(tile, effectParamsArray, targetType === 'tile' || targetType === 'transitions');
    logMessage("Effect removed using TokenMagic.");

    // Update the tile's effect data
    await updateEffectsData(tile, effectParamsArray, false, targetType === 'tile', imageId);
    logMessage("Tile's effect data updated.");

    // Update the UI to reflect changes
    await updateEffectsUI(instance, tile);
    logMessage(`Effect ${effectName} removed from ${targetType}.`);
  }
}

///////////////////////////
// Token Magic Functions //
///////////////////////////

export async function applyTokenMagicEffect(target, effectParams, isTile = true) {
  if (!await isTokenMagicActive()) return;
  if (!game.user.isGM) {
    console.log("User is not GM. Skipping applyTokenMagicEffect.");
    return;
  }

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
    await safeTokenMagicCall('addFilters', target, effectParamsArray);
    console.log(`Effect applied to ${isTile ? 'tile' : 'image'} ${target.id || target.displayImg}`);
  } catch (error) {
    console.error("Error applying TokenMagic effect:", error);
  }

  // Update the effects flag on the target
  await updateEffectsData(target, effectParamsArray, true, isTile, isTile ? null : target.img);
}

////

export async function removeTokenMagicEffect(target, effectParams, isTile) {
  if (!game.user.isGM) {
    console.log("User is not GM. Skipping removeTokenMagicEffect.");
    return;
  }
  // Log the input arguments
  logMessage("Arguments received:", { target, effectParams, isTile });

  // Ensure effectParams is an array of objects
  const effectParamsArray = Array.isArray(effectParams) ? effectParams : [effectParams];

  for (const effectParam of effectParamsArray) {
    // Determine the filter ID
    const filterId = effectParam.filterId || effectParam.tmFilterId;
    logMessage(`Filter ID determined: ${filterId}`);

    // Log the attempt to remove the effect
    logMessage(`Attempting to remove effect: ${filterId} from ${isTile ? 'tile' : 'image'}`);

    // Check if the filter ID is valid
    if (!filterId) {
      logMessage(`Invalid effect parameters provided:`, effectParam);
      continue;
    }

    // Check if the TokenMagic module is active
    if (game.modules.get('tokenmagic')?.active) {
      // Remove the filter using TokenMagic
      await safeTokenMagicCall('deleteFilters', target, filterId);
      logMessage(`Effect removed from ${isTile ? 'tile' : 'image'}`);
    } else {
      logMessage("TokenMagic module is not active.");
    }

    // Retrieve and log the current TokenMagic filters
    let tokenMagicFilters = await target.document.getFlag('tokenmagic', 'filters') || [];
    logMessage("TokenMagic filters before update:", tokenMagicFilters);

    // Update the TokenMagic filters by removing the specified filter
    tokenMagicFilters = tokenMagicFilters.map(filter => {
      if (filter.tmFilters && Array.isArray(filter.tmFilters)) {
        filter.tmFilters = filter.tmFilters.filter(e => e.filterId !== filterId && e.tmFilterId !== filterId);
      }
      return filter;
    });

    // Log the updated TokenMagic filters
    logMessage("TokenMagic filters after update:", tokenMagicFilters);
    await target.document.setFlag('tokenmagic', 'filters', tokenMagicFilters);

    // Update the effects data in the totm-manager namespace and log the update
    await updateEffectsData(target, effectParam, false, isTile, isTile ? null : target.img);
    logMessage(`Updated effects data for ${isTile ? 'tile' : 'image'}`);
  }
}

//////////////////////////////
// Update effects function  //
//////////////////////////////

async function updateEffectsData(target, effectParams, isAdd, isTile = true, imageId = null) {
  if (!game.user.isGM) {
    console.log("User is not GM. Skipping updateEffectsData.");
    return;
  }
  if (!target) {
    console.error("No target provided for updating effects.");
    return;
  }

  // Ensure effectParams is always an array
  const effectParamsArray = Array.isArray(effectParams) ? effectParams : [effectParams];

  if (effectParamsArray.length === 0) {
    console.error("effectParams is empty");
    return;
  }

  const flag = isTile ? 'tileEffects' : 'imagePaths';
  let effects = await target.document.getFlag(NAMESPACE, flag) || (isTile ? [] : []);
  console.log("Current effects before update:", JSON.stringify(effects));

  if (isTile) {
    console.log("effectParams in updateEffectsData:", JSON.stringify(effectParamsArray));
    effects = modifyEffectsArray(effects, effectParamsArray, isAdd);
  } else {
    effects = modifyImageEffectsArray(effects, imageId, effectParamsArray, isAdd);
  }

  await target.document.setFlag(NAMESPACE, flag, effects);
  const updatedEffects = await target.document.getFlag(NAMESPACE, flag);
  console.log("Updated effects:", JSON.stringify(updatedEffects));
}

function modifyEffectsArray(effects, effectParams, isAdd) {
  console.log("effectParams received in modifyEffectsArray:", JSON.stringify(effectParams));
  if (isAdd) {
    const existingEffectIndex = effects.findIndex(effect => effect.filterId === effectParams[0].filterId);
    if (existingEffectIndex !== -1) {
      effects[existingEffectIndex] = effectParams[0];
    } else {
      effects.push(effectParams[0]);
    }
  } else {
    effects = effects.filter(effect => effect.filterId !== effectParams[0].filterId);
  }
  return effects;
}

function modifyImageEffectsArray(effects, imageId, effectParams, isAdd) {
  return effects.map(imgPath => {
    if (imgPath.img === imageId) {
      let updatedEffects = imgPath.effects || [];
      if (isAdd) {
        const existingEffectIndex = updatedEffects.findIndex(effect => effect.filterId === effectParams[0].filterId);
        if (existingEffectIndex !== -1) {
          updatedEffects[existingEffectIndex] = effectParams[0];
        } else {
          updatedEffects.push(effectParams[0]);
        }
      } else {
        updatedEffects = updatedEffects.filter(effect => effect.filterId !== effectParams[0].filterId);
      }
      return { ...imgPath, effects: updatedEffects };
    }
    return imgPath;
  });
}

/////////////////////////
//   Effect Lists      //
/////////////////////////

function createEffectItem(targetType, targetName, effectName, effectId, tile, image = null) {
  let tileName = tile.document.getFlag(NAMESPACE, 'tileName') || 'Unknown Tile';

  const effectItem = document.createElement('div');
  effectItem.classList.add('effect-item');
  effectItem.innerHTML = `
      <span class="totm-manager effect-target-type">
        ${targetType === 'Tile' ? '<i class="totm-manager fas fa-cubes"></i>' :
          targetType === 'Image' ? '<i class="totm-manager fas fa-image"></i>' :
          targetType === 'transitions' ? '<i class="totm-manager fas fa-arrows-rotate"></i>' :
          '<i class="totm-manager fas fa-question-circle"></i>'} <!-- Fallback icon -->
      </span>
      <span class="totm-manager effect-target-name">${targetType === 'Tile' ? tileName : targetName}</span>
      <span class="totm-manager effect-name">${effectName}</span>
      <button class="totm-manager remove-effect-button" data-effect-id="${effectId}"><i class="totm-manager fas fa-trash"></i></button>
    `;

  return effectItem;
}

////

export async function updateEffectsUI(instance, tile) {

  if (!tile) {
    console.warn("No tile provided; skip effects update.");
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
          const effectName = nestedEffect.filterId || nestedEffect.tmFilterId || nestedEffect.effectName || "Unknown Effect!";
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

  // Get and display transition effects
  const transitionEffects = tile.document.getFlag(NAMESPACE, 'transitionEffects') || [];
  const foundTransitionEffects = appendEffectItems(transitionEffects, 'transitions', 'Transitions', tile);
  if (foundTransitionEffects) {
    anyEffectsFound = true;
  }

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

export async function applyEffectsToTile(tile, effects, isTile, image = null) {
  if (!game.user.isGM) {
    console.log("User is not GM. Skipping applyEffectsToTile.");
    return;
  }

  logMessage(`Applying effects to ${isTile ? 'tile' : 'image'}: ${tile.id}`, effects);
  for (const effect of effects) {
    try {
      const effectParamsArray = await getEffectParams(effect.filterId || effect.tmFilterId, image);
      if (!Array.isArray(effectParamsArray)) {
        console.error("Effect parameters array is not valid:", effectParamsArray);
        continue;
      }
      for (const effectParams of effectParamsArray) {
        await applyTokenMagicEffect(tile, effectParams, isTile);
      }
    } catch (error) {
      console.error("Error applying effect:", error);
    }
  }
}

////

export async function removeEffectsFromTile(tile, effects, isTile, image = null) {
  if (!game.user.isGM) {
    console.log("User is not GM. Skipping removeEffectsFromTile.");
    return;
  }
  logMessage(`Removing effects from ${isTile ? 'tile' : 'image'}: ${tile.id}`, effects);
  for (const effect of effects) {
    try {
      const effectParamsArray = await getEffectParams(effect.filterId || effect.tmFilterId, image);
      if (!Array.isArray(effectParamsArray)) {
        console.error("Effect parameters array is not valid:", effectParamsArray);
        continue;
      }
      for (const effectParams of effectParamsArray) {
        await removeTokenMagicEffect(tile, effectParams, isTile);
      }
    } catch (error) {
      console.error("Error removing effect:", error);
    }
  }
}


logMessage("effects.js loaded!");
