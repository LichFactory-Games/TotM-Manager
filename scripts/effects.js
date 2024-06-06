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

    effectParams.forEach((param, index) => {
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

    await TokenMagic.addFilters(target, effectParams);
    console.log(`Effect applied to ${isTile ? 'tile' : 'image'} ${target.id || target.displayImg}`);
}

export async function removeTokenMagicEffect(target, effectParams, isTile = true) {
    if (!await isTokenMagicActive()) return;

    if (!target) {
        console.error("No target provided for removing effect.");
        return;
    }

    if (!effectParams || !effectParams.filterId) {
        console.error("Invalid effect parameters provided:", effectParams);
        return;
    }

    // Remove the specific filter by its filterId
    const filterId = effectParams.filterId;
    TokenMagic.deleteFilters(target, filterId);
    console.log(`Effect ${filterId} removed from ${isTile ? 'tile' : 'image'} ${target.id || target.displayImg}`);
}

export async function addEffect(instance) {
    const targetType = document.getElementById('target-dropdown').value;
    const effectName = document.getElementById('effect-dropdown').value;
    const effectParams = await getEffectParams(effectName);

    if (targetType === 'tile') {
        const tileId = document.getElementById('tile-dropdown').value;
        const tile = canvas.tiles.get(tileId);
        if (tile) {
            await applyTokenMagicEffect(tile, effectParams);
            await updateEffects(tile, effectParams, true);
        } else {
            console.error("No tile found to apply effect.");
        }
    } else if (targetType === 'image') {
        const imageId = document.getElementById('image-dropdown').value;
        const image = getImageById(instance, imageId);
        if (image && instance.currentTile) {
            await applyTokenMagicEffect(image, effectParams, false);
            await updateEffects(image, effectParams, true, false);
        } else {
            console.error("No image found to apply effect or no tile selected.");
        }
    }
}

export async function removeEffect(instance) {
    const targetType = document.getElementById('target-dropdown').value;
    const effectName = document.getElementById('effect-dropdown').value;

    if (targetType === 'tile') {
        const tileId = document.getElementById('tile-dropdown').value;
        const tile = canvas.tiles.get(tileId);
        if (tile) {
            await deleteEffect(instance, tile, effectName);
        } else {
            console.error("No tile found to remove effect.");
        }
    } else if (targetType === 'image') {
        const imageId = document.getElementById('image-dropdown').value;
        const image = getImageById(instance, imageId);
        if (image && instance.currentTile) {
            await deleteEffect(instance, instance.currentTile, effectName, image);
        } else {
            console.error("No image found to remove effect or no tile selected.");
        }
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
      <button class="delete-effect" data-effect-id="${effectId}"><i class="fas fa-trash"></i></button>
    `;

    effectItem.querySelector('.delete-effect').addEventListener('click', () => {
        deleteEffect(null, tile, effectName, image);
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
    const tileEffects = tile.document.getFlag(NAMESPACE, 'tileEffects') || [];
    tileEffects.forEach((effect, index) => {
        const effectName = document.getElementById('effect-dropdown').value || "Unknown Effect!"
        const effectItem = createEffectItem('Tile', 'Tile', effectName, `tile-${index}`, tile);
        effectsContainer.appendChild(effectItem);
    });

    // Get image-specific effects
    const imagePaths = tile.document.getFlag(NAMESPACE, 'imagePaths') || [];
    imagePaths.forEach((image, imageIndex) => {
        const imageEffects = image.effects || [];
        imageEffects.forEach((effect, effectIndex) => {
            const effectName = document.getElementById('effect-dropdown').value || "Unknown Effect!"
            const effectItem = createEffectItem('Image', image.displayImg, effectName, `image-${imageIndex}-${effectIndex}`, tile, image);
            effectsContainer.appendChild(effectItem);
        });
    });

    console.log(`Updated current effects for tile ${tile.id}`);
}

async function deleteEffect(instance, tile, effectName, image = null) {
    console.log(`Deleting effect: ${effectName} from target: ${image ? 'image' : 'tile'}`);

    if (!tile) {
        console.error("No tile provided.");
        return;
    }

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

  // Remove the effect from the canvas
    if (image) {
        console.log(`Deleting effect from image:`, image);
        await removeTokenMagicEffect(image, effectParams, false);
        await updateEffects(image, effectParams, false, false);
    } else {
        console.log(`Deleting effect from tile:`, tile);
        await removeTokenMagicEffect(tile, effectParams);
        await updateEffects(tile, effectParams, false);
    }

    // Remove the effect from the flags
    if (image) {
        let imagePaths = tile.document.getFlag(NAMESPACE, 'imagePaths') || [];
        imagePaths = imagePaths.map(imgPath => {
            if (imgPath.img === image.img) {
                imgPath.effects = (imgPath.effects || []).filter(effect => effect.filterId !== effectParams.filterId);
            }
            return imgPath;
        });
        await tile.document.unsetFlag(NAMESPACE, 'imagePaths', imagePaths);
    } else {
        let tileEffects = tile.document.getFlag(NAMESPACE, 'tileEffects') || [];
        tileEffects = tileEffects.filter(effect => effect.filterId !== effectParams.filterId);
        await tile.document.unsetFlag(NAMESPACE, 'tileEffects', tileEffects);
    }

    // Update current effects list
    updateCurrentEffects(tile);
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
