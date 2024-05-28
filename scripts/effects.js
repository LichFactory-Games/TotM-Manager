console.log("effects.js loaded!");

import { hexToDecimal, adjustColor, findTileByTag } from './utilities.js';

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

export async function populateTileDropdown(tiles) {
    const dropdown = document.getElementById('tile-dropdown');
    if (!dropdown) {
        console.error("Tile dropdown element not found!");
        return;
    }

    console.log("Populating tile dropdown...");
    dropdown.innerHTML = '';

    tiles.forEach(tile => {
        const option = document.createElement('option');
        option.value = tile.id;
        option.textContent = tile.name;
        dropdown.appendChild(option);
    });

    console.log("Tile dropdown populated.");
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
        const imagePaths = await tile.document.getFlag('core', 'imagePaths') || [];
        const updatedImagePaths = imagePaths.map(imgPath => imgPath.img === image.img ? { ...imgPath, effects: imageEffects } : imgPath);
        await tile.document.setFlag('core', 'imagePaths', updatedImagePaths);

        // Update current effects list
        updateCurrentEffects(tile);
    } else {
        console.warn("TokenMagic module is not active.");
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
        const imagePaths = await tile.document.getFlag('core', 'imagePaths') || [];
        const updatedImagePaths = imagePaths.map(imgPath => imgPath.img === image.img ? { ...imgPath, effects: imageEffects } : imgPath);
        await tile.document.setFlag('core', 'imagePaths', updatedImagePaths);

        // Update current effects list
        updateCurrentEffects(tile);
    } else {
        console.warn("TokenMagic module is not active.");
    }
}

export function updateCurrentEffects(tile) {
    if (!tile) {
        console.error("No tile provided.");
        return;
    }

    const effectsContainer = document.getElementById('current-effects-container'); // Updated ID
    if (!effectsContainer) {
        console.error("Current effects container not found.");
        return;
    }

    // Clear the existing effects list
    effectsContainer.innerHTML = '';

    // Get tile-wide effects
    const tileEffects = tile.document.getFlag('totm-manager', 'tileEffects') || [];
    tileEffects.forEach(effect => {
        const effectItem = document.createElement('div');
        effectItem.textContent = `Tile-wide effect: ${effect}`;
        effectsContainer.appendChild(effectItem);
    });

    // Get image-specific effects
    const imagePaths = tile.document.getFlag('core', 'imagePaths') || [];
    imagePaths.forEach(image => {
        const imageEffects = image.effects || [];
        imageEffects.forEach(effect => {
            const effectItem = document.createElement('div');
            effectItem.textContent = `Image-specific effect: ${effect} on ${image.displayImg}`;
            effectsContainer.appendChild(effectItem);
        });
    });

    console.log(`Updated current effects for tile ${tile.id}`);
}



