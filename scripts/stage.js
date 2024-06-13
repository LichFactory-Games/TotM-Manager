import { NAMESPACE, updateActiveTileButton } from './utilities.js';
import { applyEffectsToTile, removeEffectsFromTile } from './effects.js';
import { updateActiveImageButton } from './images.js';


////////////////////
// Image Actions  //
////////////////////

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
  console.log(`Activating image on tile ID: ${tileId}, Name: ${tileName}`);
  console.log(`Image paths for tile:`, imagePaths);

  // Deactivate effects of the previous image
  const previousIndex = await tile.document.getFlag(NAMESPACE, 'imgIndex');
  if (previousIndex !== undefined && imagePaths[previousIndex]) {
    const previousImage = imagePaths[previousIndex];
    const previousEffects = previousImage.effects || [];
    await removeEffectsFromTile(tile, previousEffects, false);
    console.log(`Removed effects from previous image index: ${previousIndex}`);
  }

  // Update the tile's texture and flag
  console.log(`Updating tile ID ${tileId} texture to: ${image.img}`);
  await tile.document.update({ 'texture.src': image.img });
  await tile.document.setFlag(NAMESPACE, 'imgIndex', index);

  // Apply tile-wide effects
  const tileEffects = await tile.document.getFlag(NAMESPACE, 'tileEffects') || [];
  await applyEffectsToTile(tile, tileEffects, true);
  console.log(`Applied tile-wide effects to tile ID: ${tileId}`);

  // Apply image-specific effects
  const currentImage = imagePaths.find(img => img.img === image.img);
  if (currentImage && currentImage.effects) {
    await applyEffectsToTile(tile, currentImage.effects, false);
    console.log(`Applied image-specific effects to tile ID: ${tileId}`);
  }

  // Render the instance
  instance.render();
  console.log(`Image ${image.displayImg} activated on tile ID: ${tileId}.`);
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
    await updateActiveImageButton(instance);
  } catch (error) {
    console.error("Failed to cycle images:", error);
    ui.notifications.error("Error cycling images. See console for details.");
  }
}

////////////////////
// Search Actions //
////////////////////

export function performImageSearch(instance, query) {
  const lowerCaseQuery = query.toLowerCase();
  const results = instance.imagePaths.filter(image =>
    image.displayImg.toLowerCase().includes(lowerCaseQuery) ||
    image.tags.some(tag => tag.toLowerCase().includes(lowerCaseQuery))
  );
  console.log('TotM - Search results:', results);
  displaySearchResults(instance, results);
}

 function displaySearchResults(instance, results) {
  const imageSize = game.settings.get('totm-manager', 'imageSize');
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
  setTimeout(() => {
    const searchField = instance.element.find('#image-search-bar')[0];
    if (searchField) searchField.focus();
  }, 0);
}

