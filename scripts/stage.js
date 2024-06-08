import { NAMESPACE } from './utilities.js';
import { applyTokenMagicEffect, removeTokenMagicEffect } from './effects.js';
import { getImageById } from './images.js';
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

    // Remove effects of the previous image
    const previousIndex = await tile.document.getFlag(NAMESPACE, 'imgIndex');
    if (previousIndex !== undefined && imagePaths[previousIndex]) {
        const previousImage = imagePaths[previousIndex];
        const previousEffects = previousImage.effects || [];
        previousEffects.forEach(async (effect) => {
            await TokenMagic.deleteFilters(tile, effect);
        });
    }

    // Apply effects of the new image
    const currentEffects = image.effects || [];
    currentEffects.forEach(async (effect) => {
        const effectParams = TokenMagic.getPreset(effect);
        if (game.modules.get('tokenmagic')?.active) {
            await TokenMagic.addFilters(tile, effectParams);
        } else {
            console.warn("TokenMagic module is not active.");
        }
    });

    // Update the tile's texture and flag
    tile.document.update({ 'texture.src': image.img })
        .then(() => tile.document.setFlag(NAMESPACE, 'imgIndex', index))
        .then(() => {
            ui.notifications.info(`Image ${image.displayImg} activated.`);
            instance.render();
        })
        .catch(error => {
            console.error("Error activating image:", error);
            ui.notifications.error("Failed to activate image.");
        });
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
    await tile.document.update({ 'texture.src': currentImage.img });
    await tile.document.setFlag(NAMESPACE, 'imgIndex', currentIndex);
    // Apply glow effect or any additional effects here if needed
    console.log("Cycled to new image at index:", currentIndex, "Path:", currentImage.img);

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
    const imagePaths = await instance.currentTile.document.getFlag(NAMESPACE, 'imagePaths') || [];
    if (imagePaths.length > index) {
      await activateImage(instance, imagePaths[index], index);
      console.log(`Active image set to index ${index}`);
    } else {
      console.warn(`Index ${index} out of bounds for image paths`);
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

