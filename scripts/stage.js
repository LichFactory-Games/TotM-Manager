import { NAMESPACE, logMessage } from './utilities.js';
import { applyEffectsToTile, removeEffectsFromTile } from './effects.js';
import { updateActiveImageButton } from './images.js';
import { controlFeaturesBasedOnTags } from './featureControl.js';

////////////////////
// Image Actions  //
////////////////////

// Function to create fade in and fade out effect for a tile
async function fadeTile(tileDocument, fadeIn = true, targetAlpha = 1, duration = 2000, increment = 0.01) {
  if (!game.user.isGM) {
    console.log("User is not GM. Skipping fadeTile.");
    return;
  }
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

async function adjustAspectRatio(tile) {
  if (!tile || !tile.document) {
    ui.notifications.error("No tile selected or invalid tile.");
    return;
  }

  // Get the image path
  const imagePath = tile.document.texture.src;
  if (!imagePath) {
    ui.notifications.error("Tile does not have an image set.");
    return;
  }

  // Load the image to get its natural dimensions
  const texture = await loadTexture(imagePath);
  const { width: imgWidth, height: imgHeight } = texture.baseTexture;

  if (imgWidth === 0 || imgHeight === 0) {
    ui.notifications.error("Failed to load image or invalid image dimensions.");
    return;
  }

  // Calculate the aspect ratio of the image
  const aspectRatio = imgWidth / imgHeight;

  // Get the original tile's dimensions
  const originalWidth = tile.document.width;
  const originalHeight = tile.document.height;

  // Calculate the original area of the tile
  const originalArea = originalWidth * originalHeight;

  // Calculate new dimensions while maintaining the original area
  const newWidth = Math.sqrt(originalArea * aspectRatio);
  const newHeight = newWidth / aspectRatio;

  // Update the tile's size to match the image's aspect ratio but retain the original area
  await tile.document.update({
    width: newWidth,
    height: newHeight,
  });

  console.log(`Tile resized to match image aspect ratio while maintaining size. New dimensions: ${newWidth} x ${newHeight}`);
}

export async function activateImage(instance, image, index) {
  if (!game.user.isGM) {
    console.log("User is not GM. Skipping activateImage.");
    return;
  }
  if (!instance.currentTile) {
    console.error("No currently active tile.");
    ui.notifications.warn("Error setting image. No tile is currently active.");
    return;
  }

  const tile = instance.currentTile;
  const tileId = tile.id;
  const tileName = await tile.document.getFlag(NAMESPACE, 'tileName');
  const imagePaths = await tile.document.getFlag(NAMESPACE, 'imagePaths') || [];

  if (!tileName) {
    console.error("Tile has no name set.");
    ui.notifications.warn("Error setting image. Tile has no name set.");
    return;
  }

  logMessage(`Activating image on tile ID: ${tileId}, Name: ${tileName}`);
  logMessage(`Image paths for tile:`, imagePaths);

  // Retrieve global settings for transition
  const duration = game.settings.get(NAMESPACE, 'imageTransitionDuration');
  const increment = game.settings.get(NAMESPACE, 'imageTransitionIncrement');
  const targetAlpha = game.settings.get(NAMESPACE, 'imageTransitionTargetAlpha');

  // Retrieve transition effects if they exist
  const transitionEffects = await tile.document.getFlag(NAMESPACE, 'transitionEffects') || [];

  // Apply transition effects before changing the image
  if (transitionEffects.length > 0) {
    for (const { effectName, effectParams } of transitionEffects) {
      logMessage(`Applying transition effect before image change: ${effectName}`, effectParams);
      await TokenMagic.addFilters(tile, effectParams);
    }
  }

  // Deactivate effects of the previous image
  const previousIndex = await tile.document.getFlag(NAMESPACE, 'imgIndex');
  if (previousIndex !== undefined && imagePaths[previousIndex]) {
    const previousImage = imagePaths[previousIndex];
    const previousEffects = previousImage.effects || [];
    await removeEffectsFromTile(tile, previousEffects, false);
    logMessage(`Removed effects from previous image index: ${previousIndex}`);
  }

  // Fade out the tile's current image
  await fadeTile(tile.document, false, targetAlpha, duration, increment); // Fade out to targetAlpha

  // Update the tile's texture to the new image
  await tile.document.update({ 'texture.src': image.img });
  await tile.document.setFlag(NAMESPACE, 'imgIndex', index);

  // Check for the "adjustAR" tag using Tagger and adjust aspect ratio
  const tileTags = await Tagger.getTags(tile);
  const shouldAdjustAspectRatio = tileTags.includes('adjustAR');
  if (shouldAdjustAspectRatio) {
    // Ensure the aspect ratio is adjusted *after* the image is loaded
    await adjustAspectRatio(tile);
  }

  // Fade in the new image
  await fadeTile(tile.document, true, 1, duration, increment); // Fade in to full opacity

  // Remove transition effects after the image change and transition is complete
  if (transitionEffects.length > 0) {
    for (const { effectName } of transitionEffects) {
      logMessage(`Removing transition effect after image change: ${effectName}`);
      await TokenMagic.deleteFilters(tile, effectName);
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
  if (!game.user.isGM) {
    console.log("User is not GM. Skipping cycleImages.");
    return;
  }
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

