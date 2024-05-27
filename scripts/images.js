// scripts/images.js
import { saveTileData, loadTileImages } from './tiles.js';

export async function addImageToTile(instance, tile, imagePath) {
  if (!tile) {
    console.error("No active tile selected to add an image.");
    ui.notifications.error("No active tile selected to add an image.");
    return;
  }

  let imagePaths = await tile.document.getFlag('core', 'imagePaths') || [];
  imagePaths.push({
    img: imagePath,
    displayImg: imagePath.split('/').pop(),
    tags: []
  });

  await tile.document.setFlag('core', 'imagePaths', imagePaths);
  instance.imagePaths = imagePaths;  // Update the instance's imagePaths
  console.log("Image paths updated for tile:", imagePaths);

  instance.render(true);
}

export async function addDirectoryToTile(instance, tile, directoryPath) {
  if (!tile) {
    console.error("No active tile selected to add images from directory.");
    ui.notifications.error("No active tile selected to add images from directory.");
    return;
  }

  let response = await FilePicker.browse("data", directoryPath);
  if (response.target && response.files.length) {
    const newImagePaths = response.files.filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.webp')).map(path => ({
      img: path,
      displayImg: path.split('/').pop(),
      tags: []
    }));
    let existingPaths = await tile.document.getFlag('core', 'imagePaths') || [];
    existingPaths = existingPaths.concat(newImagePaths);

    await tile.document.setFlag('core', 'imagePaths', existingPaths);
    instance.imagePaths = existingPaths;  // Update the instance's imagePaths
    console.log("Image paths updated for tile:", existingPaths);

    instance.render(true);
  } else {
    ui.notifications.error("No images found in the selected directory.");
  }
}

export async function setActiveImage(instance, index) {
  try {
    const imagePaths = await instance.currentTile.document.getFlag('core', 'imagePaths') || [];
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

export function updateImageTags(instance, index, tags) {
  const imagePaths = instance.currentTile.document.getFlag('core', 'imagePaths') || [];
  if (imagePaths.length > index) {
    imagePaths[index].tags = tags.split(',').map(tag => tag.trim());
    instance.currentTile.document.setFlag('core', 'imagePaths', imagePaths);
  }
}

export function activateImage(instance, image, index) {
  if (!instance.currentTile) {
    console.error("No currently active tile.");
    ui.notifications.error("Error setting image. No tile is currently active.");
    return;
  }

  instance.currentTile.document.update({ 'texture.src': image.img })
    .then(() => {
      return instance.currentTile.document.setFlag('core', 'imgIndex', index);
    })
    .then(() => {
      // Add any necessary effects application here
      ui.notifications.info(`Image ${image.displayImg} activated.`);
      instance.render();
    })
    .catch(error => {
      console.error("Error activating image:", error);
      ui.notifications.error("Failed to activate image.");
    });
}

export async function cycleImages(instance, tile, direction) {
  const imagePaths = await tile.document.getFlag('core', 'imagePaths') || [];
  if (imagePaths.length === 0) {
    ui.notifications.warn("No images to cycle. Please add images.");
    return;
  }
  let currentIndex = await tile.document.getFlag('core', 'imgIndex') || 0;
  currentIndex = direction === 'next' ? (currentIndex + 1) % imagePaths.length : (currentIndex - 1 + imagePaths.length) % imagePaths.length;
  const currentImage = imagePaths[currentIndex];
  try {
    await tile.document.update({ 'texture.src': currentImage.img });
    await tile.document.setFlag('core', 'imgIndex', currentIndex);
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

export function updateActiveImageButton(instance) {
  if (!instance.currentTile || !instance.currentTile.document) {
    console.warn("Attempted to update image button with no active tile or missing document.");
    return;
  }

  const imagePaths = instance.currentTile.document.getFlag('core', 'imagePaths');
  if (!imagePaths || imagePaths.length === 0) {
    console.warn("No image paths available for the current tile:", instance.currentTile.id);
    return;
  }

  const imageIndex = instance.currentTile.document.getFlag('core', 'imgIndex');
  if (imageIndex === undefined || imageIndex < 0 || imageIndex >= imagePaths.length) {
    console.warn(`Image index is out of bounds or undefined: ${imageIndex}`);
    return;
  }

  const imageButtonSelector = `.set-image-button[data-index="${imageIndex}"]`;
  const activeImageButton = instance.element.find(imageButtonSelector);

  instance.element.find('.set-image-button').removeClass('active-button');
  if (activeImageButton.length) {
    activeImageButton.addClass('active-button');
    console.log(`TotM - Active image button found and activated: ${imageButtonSelector}`);
    console.log(`TotM - Active image button marked: Index ${imageIndex}`);
  } else {
    console.warn("No image button found for index:", imageIndex);
  }
}

export async function reorderPaths(instance, origin, target) {
  const imagePaths = instance.imagePaths;
  if (origin === undefined || target === undefined || origin === target) return;

  console.log(`Reordering: origin=${origin}, target=${target}`);

  const item = imagePaths.splice(origin, 1)[0];
  imagePaths.splice(target, 0, item);

  instance.imagePaths = imagePaths;  // Update the instance's imagePaths
  console.log("Reordered imagePaths:", instance.imagePaths);

  // Save the updated paths to the tile document
  await instance.currentTile.document.setFlag('core', 'imagePaths', imagePaths);
}

 export async function deleteImageByPath(instance, imagePath) {
  const imagePaths = instance.imagePaths;
  const index = imagePaths.findIndex(image => image.img === imagePath);
  if (index !== -1) {
    imagePaths.splice(index, 1);
    instance.imagePaths = imagePaths;  // Update the instance's imagePaths
    console.log("Deleted image:", imagePath);

    // Save the updated paths to the tile document
    await instance.currentTile.document.setFlag('core', 'imagePaths', imagePaths);

    // Load tile images to update UI
    await loadTileImages(instance, instance.currentTile);
  }
  }

export async function deleteAllPaths(instance) {
  instance.imagePaths = [];  // Clear the instance's imagePaths
  console.log("Deleted all image paths");

  // Save the cleared paths to the tile document
  await instance.currentTile.document.setFlag('core', 'imagePaths', []);

  // Update the tile document with a blank texture source
  await instance.currentTile.document.update({'texture.src': null})
    .then(() => ui.notifications.info("Tile reset successfully."))
    .catch(err => console.error("Failed to reset tile:", err));

  // Load tile images to update UI
  await loadTileImages(instance, instance.currentTile);

  instance.render(true); // Update the UI to reflect the changes
}

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

// export function focusSearchField(instance) {
//   setTimeout(() => {
//     const searchField = instance.element.find('#image-search-bar')[0];
//     if (searchField) searchField.focus();
//   }, 0);
// }


// TODO Requires toggleFeaturesBasedOnTags
// export async function updateTileImage(tile, imageObj, index) {
//   try {
//     await tile.document.update({ 'texture.src': imageObj.img });
//     await tile.document.setFlag('core', 'imgIndex', index);
//     await applyGlowEffect(tile, index);
//     const imageTags = imageObj.tags || [];
//     await toggleFeaturesBasedOnTags(imageTags);
//   } catch (error) {
//     console.error("Error updating tile image:", error);
//     throw error;
//   }
// }
