// scripts/images.js
import { NAMESPACE } from './utilities.js';
import { loadTileImages } from './tiles-utils.js';

export async function addImageToTile(instance, tile, imagePath) {
  if (!tile) {
    console.error("No active tile selected to add an image.");
    ui.notifications.error("No active tile selected to add an image.");
    return;
  }

  let imagePaths = await tile.document.getFlag(NAMESPACE, 'imagePaths') || [];
  imagePaths.push({
    img: imagePath,
    displayImg: imagePath.split('/').pop(),
    tags: []
  });

  await tile.document.setFlag(NAMESPACE, 'imagePaths', imagePaths);
  instance.imagePaths = imagePaths;  // Update the instance's imagePaths
  console.log("Image paths updated for tile:", imagePaths);

  instance.render(true);
}

export async function addImageDirectoryToTile(instance, tile, directoryPath) {
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
    let existingPaths = await tile.document.getFlag(NAMESPACE, 'imagePaths') || [];
    existingPaths = existingPaths.concat(newImagePaths);

    await tile.document.setFlag(NAMESPACE, 'imagePaths', existingPaths);
    instance.imagePaths = existingPaths;  // Update the instance's imagePaths
    console.log("Image paths updated for tile:", existingPaths);

    instance.render(true);
  } else {
    ui.notifications.error("No images found in the selected directory.");
  }
}

export function updateImageTags(instance, index, tags) {
  const imagePaths = instance.currentTile.document.getFlag(NAMESPACE, 'imagePaths') || [];
  if (imagePaths.length > index) {
    imagePaths[index].tags = tags.split(',').map(tag => tag.trim());
    instance.currentTile.document.setFlag(NAMESPACE, 'imagePaths', imagePaths);
  }
}

export function updateActiveImageButton(instance) {
  if (!instance.currentTile || !instance.currentTile.document) {
    console.warn("Attempted to update image button with no active tile or missing document.");
    return;
  }

  const imagePaths = instance.currentTile.document.getFlag(NAMESPACE, 'imagePaths');
  console.log("Image paths:", imagePaths);

  if (!imagePaths || imagePaths.length === 0) {
    console.warn("No image paths available for the current tile:", instance.currentTile.id);
    return;
  }

  const imageIndex = instance.currentTile.document.getFlag(NAMESPACE, 'imgIndex');
  console.log("Image index:", imageIndex);

  if (imageIndex === undefined || imageIndex < 0 || imageIndex >= imagePaths.length) {
    console.warn(`Image index is out of bounds or undefined: ${imageIndex}`);
    return;
  }

  const imageButtonSelector = `.set-image-button[data-index="${imageIndex}"]`;
  console.log("Image button selector:", imageButtonSelector);

  const activeImageButton = instance.element.find(imageButtonSelector);
  console.log("Active image button element:", activeImageButton);

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
  await instance.currentTile.document.setFlag(NAMESPACE, 'imagePaths', imagePaths);
}

export async function deleteImageByPath(instance, imagePath) {
    const imagePaths = instance.imagePaths;
    const index = imagePaths.findIndex(image => image.img === imagePath);
    if (index !== -1) {
        imagePaths.splice(index, 1);
        instance.imagePaths = imagePaths;  // Update the instance's imagePaths
        console.log("Deleted image:", imagePath);

        // Save the updated paths to the tile document
        await instance.currentTile.document.setFlag(NAMESPACE, 'imagePaths', imagePaths);

        // Load tile images to update UI
        await loadTileImages(instance, instance.currentTile);
    }
}

export async function deleteAllPaths(instance) {
  instance.imagePaths = [];  // Clear the instance's imagePaths
  console.log("Deleted all image paths");

  // Save the cleared paths to the tile document
  await instance.currentTile.document.setFlag(NAMESPACE, 'imagePaths', []);

  // Update the tile document with a blank texture source
  await instance.currentTile.document.update({'texture.src': null})
    .then(() => ui.notifications.info("Tile reset successfully."))
    .catch(err => console.error("Failed to reset tile:", err));

  // Load tile images to update UI
  await loadTileImages(instance, instance.currentTile);

  instance.render(true); // Update the UI to reflect the changes
}


// Function to get an image by its ID
export function getImageById(instance, imageId) {
    const imagePaths = instance.imagePaths;
    if (!imagePaths) {
        console.error("Image paths are not defined.");
        return null;
    }

    const image = imagePaths.find(img => img.img === imageId);
    if (!image) {
        console.error(`No image found with ID: ${imageId}`);
        return null;
    }
    return image;
}

// TODO Requires toggleFeaturesBasedOnTags
// export async function updateTileImage(tile, imageObj, index) {
//   try {
//     await tile.document.update({ 'texture.src': imageObj.img });
//     await tile.document.setFlag(NAMESPACE, 'imgIndex', index);
//     await applyGlowEffect(tile, index);
//     const imageTags = imageObj.tags || [];
//     await toggleFeaturesBasedOnTags(imageTags);
//   } catch (error) {
//     console.error("Error updating tile image:", error);
//     throw error;
//   }
// }
