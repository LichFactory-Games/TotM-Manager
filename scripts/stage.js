import { NAMESPACE } from './utilities.js';
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
  const imagePaths = await tile.document.getFlag(NAMESPACE, 'imagePaths') || [];

  // Deactivate effects of the previous image
  const previousIndex = await tile.document.getFlag(NAMESPACE, 'imgIndex');
  if (previousIndex !== undefined && imagePaths[previousIndex]) {
    const previousImage = imagePaths[previousIndex];
    const previousEffects = previousImage.effects || [];
    await removeEffectsFromTile(tile, previousEffects, false);
  }

  // Update the tile's texture and flag
  await tile.document.update({ 'texture.src': image.img });
  await tile.document.setFlag(NAMESPACE, 'imgIndex', index);

  // Apply tile-wide effects
  const tileEffects = await tile.document.getFlag(NAMESPACE, 'tileEffects') || [];
  await applyEffectsToTile(tile, tileEffects, true);

  // Apply image-specific effects
  const currentImage = imagePaths.find(img => img.img === image.img);
  if (currentImage && currentImage.effects) {
    await applyEffectsToTile(tile, currentImage.effects, false);
  }

  // Render the instance
  instance.render();
  console.log(`Image ${image.displayImg} activated.`);
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
    // console.log("Cycled to new image at index:", currentIndex, "Path:", currentImage.img);

    // Update the instance's current image index and render the instance
    instance.currentImageIndex = currentIndex;
    instance.render();
    setTimeout(() => updateActiveImageButton(instance), 10);
  } catch (error) {
    console.error("Failed to cycle images:", error);
    ui.notifications.error("Error cycling images. See console for details.");
  }
}

export async function setActiveImage(instance, index) {
  try {
    // Ensure the current tile is defined
    if (!instance.currentTile || !instance.currentTile.document) {
      console.warn("No current tile is selected or missing document property.");
      return;
    }

    // Retrieve the image paths from the tile flags
    const imagePaths = await instance.currentTile.document.getFlag('totm-manager', 'imagePaths') || [];

    // Log the retrieved image paths
    console.log('Retrieved image paths:', imagePaths);

    // Check if the index is within bounds
    if (index >= 0 && index < imagePaths.length) {
      await activateImage(instance, imagePaths[index], index);
      console.log(`Active image set to index ${index}`);
    } else {
      console.warn(`Index ${index} out of bounds for image paths. Image paths length: ${imagePaths.length}`);
    }
  } catch (error) {
    console.error("Error setting active image:", error);
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

