import { NAMESPACE, logMessage } from './utilities.js';
import { applyEffectsToTile, removeEffectsFromTile } from './effects.js';
import { updateActiveImageButton } from './images.js';
import { controlFeaturesBasedOnTags } from './featureControl.js';

////////////////////
// Image Actions  //
////////////////////

// Function to create fade in and fade out effect for a tile
async function fadeTile(tileDocument, fadeIn = true, targetAlpha = 1, duration = 2000, increment = 0.01) {
  if (fadeIn) {
    // Fade In
    for (let i = 0; i <= targetAlpha; i += increment) {
      await tileDocument.update({ alpha: i });
      await new Promise(resolve => setTimeout(resolve, duration * increment));
    }
  } else {
    // Fade Out
    for (let i = 1; i >= targetAlpha; i -= increment) {
      await tileDocument.update({ alpha: i });
      await new Promise(resolve => setTimeout(resolve, duration * increment));
    }
  }
}

export async function activateImage(instance, image, index) {
  if (!instance.currentTile) {
    console.error("No currently active tile.");
    ui.notifications.error("Error setting image. No tile is currently active.");
    return;
  }

  const tile = instance.currentTile;
  const tileId = tile.id;
  const tileName = await tile.document.getFlag(NAMESPACE, 'tileName');
  const imagePaths = await tile.document.getFlag(NAMESPACE, 'imagePaths') || [];

  if (!tileName) {
    console.error("Tile has no name set.");
    ui.notifications.error("Error setting image. Tile has no name set.");
    return;
  }

  // Log current tile information
  logMessage(`Activating image on tile ID: ${tileId}, Name: ${tileName}`);
  logMessage(`Image paths for tile:`, imagePaths);

  // Check if the image transition effect is enabled
  const enableTransition = game.settings.get('totm-manager', 'enableImageTransition');
  const duration = game.settings.get('totm-manager', 'imageTransitionDuration');
  const increment = game.settings.get('totm-manager', 'imageTransitionIncrement');
  const targetAlpha = game.settings.get('totm-manager', 'imageTransitionTargetAlpha');

  // Check if Token Magic effect is enabled
  const effectName = game.settings.get('totm-manager', 'imageTransitionEffect');
  let effectParams = JSON.parse(game.settings.get('totm-manager', 'imageTransitionEffectParams') || '{}');

  if (enableTransition) {
    if (effectName) {
      // Use default parameters if none are provided
      if (Object.keys(effectParams).length === 0) {
        effectParams = TokenMagic.getPreset(effectName);
      }
      logMessage("Applying transition effect:", effectParams);
      // Apply the Token Magic effect before fading out
      await TokenMagic.addFiltersOnSelected(effectName, false);
    }
    // Fade out the tile to partial transparency before updating the image
    await fadeTile(tile.document, false, targetAlpha, duration, increment); // Fade out to targetAlpha
  }

  // Deactivate effects of the previous image
  const previousIndex = await tile.document.getFlag(NAMESPACE, 'imgIndex');
  if (previousIndex !== undefined && imagePaths[previousIndex]) {
    const previousImage = imagePaths[previousIndex];
    const previousEffects = previousImage.effects || [];
    await removeEffectsFromTile(tile, previousEffects, false);
    logMessage(`Removed effects from previous image index: ${previousIndex}`);
  }

  // Update the tile's texture and flag
  logMessage(`Updating tile ID ${tileId} texture to: ${image.img}`);
  await tile.document.update({ 'texture.src': image.img });
  await tile.document.setFlag(NAMESPACE, 'imgIndex', index);

  if (enableTransition) {
    // Fade in the tile to full opacity after updating the image
    await fadeTile(tile.document, true, 1, duration, increment); // Fade in to full opacity
    if (effectName) {
      // Remove the Token Magic effect after fading in
      await TokenMagic.deleteFiltersOnSelected(effectName, false);
    }
  }

  // Apply tile-wide effects
  const tileEffects = await tile.document.getFlag(NAMESPACE, 'tileEffects') || [];
  await applyEffectsToTile(tile, tileEffects, true);
  logMessage(`Applied tile-wide effects to tile ID: ${tileId}`);

  // Apply image-specific effects
  const currentImage = imagePaths.find(img => img.img === image.img);
  if (currentImage && currentImage.effects) {
    logMessage("Applying image-specific effects:", currentImage.effects);
    await applyEffectsToTile(tile, currentImage.effects, false);
    logMessage(`Applied image-specific effects to tile ID: ${tileId}`);
  }

  // Control features based on tags
  if (currentImage) {
    await controlFeaturesBasedOnTags(tile, index);
    logMessage(`Applied image tags to control features to tile: ${tileId}`);
  }

  // Update active image button
  await updateActiveImageButton(instance, index);

  // Render the instance
  instance.render();
  logMessage(`Image ${image.displayImg} activated on tile ID: ${tileId}.`);
}


export async function cycleImages(instance, tile, direction) {
  const imagePaths = await tile.document.getFlag(NAMESPACE, 'imagePaths') || [];
  if (imagePaths.length === 0) {
    ui.notifications.warn("No images to cycle. Please add images.");
    return;
  }
  let currentIndex = await tile.document.getFlag(NAMESPACE, 'imgIndex') || 0;
  currentIndex = direction === 'next' ? (currentIndex + 1) % imagePaths.length : (currentIndex - 1 + imagePaths.length) % imagePaths.length;
  const currentImage = imagePaths[currentIndex];
  try {
    await activateImage(instance, currentImage, currentIndex);
    // Update the instance's current image index and render the instance
    instance.currentImageIndex = currentIndex;
    await updateActiveImageButton(instance, currentIndex);
  } catch (error) {
    console.error("Failed to cycle images:", error);
    ui.notifications.error("Error cycling images. See console for details.");
  }
}

////////////////////
// Search Actions //
////////////////////

export function performImageSearch(instance, query) {
  if (!instance.imagePaths || !Array.isArray(instance.imagePaths)) {
    console.error("Image paths not found or not an array.");
    return;
  }

  const lowerCaseQuery = query.toLowerCase();

  const results = instance.imagePaths.filter(image => {
    const displayNameMatch = image.displayImg.toLowerCase().includes(lowerCaseQuery);
    const tagsMatch = Array.isArray(image.tags) && image.tags.some(tag => tag.toLowerCase().includes(lowerCaseQuery));

    return displayNameMatch || tagsMatch;
  });

  logMessage('Search results:', results);
  displaySearchResults(instance, results);
}

function displaySearchResults(instance, results) {
  const imageSize = game.settings.get(NAMESPACE, 'imageSize');
  const resultsContainer = instance.element.find('#search-results')[0];
  resultsContainer.innerHTML = '';

  results.forEach((image, index) => {
    const imageElement = document.createElement('img');
    imageElement.src = image.img;
    imageElement.alt = image.displayImg;
    imageElement.style.width = `${imageSize}px`;
    imageElement.style.height = 'auto';
    imageElement.style.cursor = 'pointer';
    imageElement.addEventListener('click', () => activateImage(instance, image, index));
    resultsContainer.appendChild(imageElement);
  });
}

export function focusSearchField(instance) {
  const searchField = instance.element.find('#image-search-bar')[0];
  if (searchField) searchField.focus();
}

