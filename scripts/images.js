// scripts/images.js
import { NAMESPACE, updateActiveTileButton, logMessage } from './utilities.js';
import { loadTileImages } from './tiles-utils.js';

export async function addMediaToTile(instance, tile, mediaPath) {
  if (!game.user.isGM) {
    console.log("User is not GM. Skipping addMediaToTile.");
    return;
  }

  if (!tile) {
    console.error("No active tile selected to add media.");
    ui.notifications.error("No active tile selected to add media.");
    return;
  }

  let mediaPaths = await tile.document.getFlag(NAMESPACE, 'imagePaths') || [];
  mediaPaths.push({
    img: mediaPath,  // Keep it generic (img can also refer to video path)
    displayImg: mediaPath.split('/').pop(),
    tags: [],
    type: mediaPath.endsWith('.mp4') || mediaPath.endsWith('.webm') ? 'video' : 'image'  // Track type
  });

  await tile.document.setFlag(NAMESPACE, 'imagePaths', mediaPaths);
  instance.imagePaths = mediaPaths;  // Update the instance's media paths
  console.log("Media paths updated for tile:", mediaPaths);

  instance.render(true);
}

export async function addMediaDirectoryToTile(instance, tile, directoryPath) {
  if (!game.user.isGM) {
    console.log("User is not GM. Skipping addMediaDirectoryToTile.");
    return;
  }
  if (!tile) {
    console.error("No active tile selected to add media from directory.");
    ui.notifications.error("No active tile selected to add media from directory.");
    return;
  }

  const FilePickerClass = foundry.applications?.apps?.FilePicker?.implementation || FilePicker;
  let response = await FilePickerClass.browse("data", directoryPath);
  if (response.target && response.files.length) {
    const newMediaPaths = response.files.filter(file => {
      return file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.webp') ||
        file.endsWith('.mp4') || file.endsWith('.webm');  // Include video file formats
    }).map(path => ({
      img: path,
      displayImg: path.split('/').pop(),
      tags: [],
      type: path.endsWith('.mp4') || path.endsWith('.webm') ? 'video' : 'image'  // Detect type
    }));

    let existingPaths = await tile.document.getFlag(NAMESPACE, 'imagePaths') || [];
    existingPaths = existingPaths.concat(newMediaPaths);

    await tile.document.setFlag(NAMESPACE, 'imagePaths', existingPaths);
    instance.imagePaths = existingPaths;  // Update the instance's media paths
    console.log("Media paths updated for tile:", existingPaths);

    instance.render(true);
  } else {
    ui.notifications.error("No media found in the selected directory.");
  }
}

export async function updateActiveMediaButton(instance, activeIndex) {
  if (!instance.currentTile || !instance.currentTile.document) {
    console.warn("Attempted to update media button with no active tile or missing document.");
    return;
  }

  const mediaPaths = await instance.currentTile.document.getFlag(NAMESPACE, 'imagePaths');
  logMessage("Media paths:", mediaPaths);

  if (!mediaPaths || mediaPaths.length === 0) {
    console.warn("No media paths available for the current tile:", instance.currentTile.id);
    return;
  }

  const mediaIndex = activeIndex !== undefined ? activeIndex : await instance.currentTile.document.getFlag(NAMESPACE, 'imgIndex');
  logMessage("Media index:", mediaIndex);

  if (mediaIndex === undefined || mediaIndex < 0 || mediaIndex >= mediaPaths.length) {
    console.warn(`Media index is out of bounds or undefined: ${mediaIndex}`);
    return;
  }

  const mediaButtonSelector = `.set-media-button[data-index="${mediaIndex}"]`;
  logMessage("Media button selector:", mediaButtonSelector);

  const activeMediaButton = instance.element.find(mediaButtonSelector);
  logMessage("Active media button element:", activeMediaButton);

  instance.element.find('.set-media-button').removeClass('active-button');
  if (activeMediaButton.length) {
    activeMediaButton.addClass('active-button');
    logMessage(`TotM - Active media button found and activated: ${mediaButtonSelector}`);
    logMessage(`TotM - Active media button marked: Index ${mediaIndex}`);
  } else {
    console.warn("No media button found for index:", mediaIndex);
  }

  updateActiveTileButton(instance);
}

export async function reorderPaths(instance, origin, target) {
  if (!game.user.isGM) {
    console.log("User is not GM. Skipping reorderPaths.");
    return;
  }
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
  if (!game.user.isGM) {
    console.log("User is not GM. Skipping deleteImageByPath.");
    return;
  }
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
  if (!game.user.isGM) {
    console.log("User is not GM. Skipping deleteAllPaths.");
    return;
  }
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
