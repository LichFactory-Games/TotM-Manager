/////////////////////////////
// // Listener Methods  // //
/////////////////////////////

import { NAMESPACE, logMessage, activateTile, findAndSwitchToTileByTag, updateActiveTileButton } from './utilities.js';
import { addMediaToTile, addMediaDirectoryToTile, updateActiveMediaButton, reorderPaths, deleteImageByPath, deleteAllPaths } from './images.js';
import { generateTileFields, handleSaveAndRender, handleDeleteAndSave, collectAndSaveImageData } from './tiles.js';
import { loadTileImages, toggleTileVisibility, openTileConfigForControlledTile } from './tiles-utils.js'
import { updateEffectsUI, onTargetChange, removeEffect } from './effects.js';
import { ModifyEffectForm } from './modifyEffectForm.js';
import { performImageSearch, activateImage, cycleImages } from './stage.js';

export function activateGeneralListeners(instance, html) {
  // Add media (image or video) to tile
  html.find('.add-image').click(() => {
    const FilePickerClass = foundry.applications?.apps?.FilePicker?.implementation || FilePicker;
    new FilePickerClass({
      type: "any",  // Allow both images and videos
      current: "",
      callback: path => addMediaToTile(instance, instance.currentTile, path)
    }).browse();
  });

  // Add media folder to tile
  html.find('.add-folder').click(() => {
    const FilePickerClass = foundry.applications?.apps?.FilePicker?.implementation || FilePicker;
    new FilePickerClass({
      type: "folder",
      callback: folderPath => addMediaDirectoryToTile(instance, instance.currentTile, folderPath)
    }).browse();
  });

  // Save all tile media data
  html.find('.save-paths').click(async () => {
    logMessage("Saving media for tile...");
    if (!instance.currentTile || !instance.currentTile.document) {
      console.warn("No current tile is selected or missing document property.");
      return;
    }

    const mediaPaths = await instance.currentTile.document.getFlag(NAMESPACE, 'imagePaths') || [];
    console.log('Retrieved media paths:', mediaPaths);

    await collectAndSaveImageData(instance, html);
    handleSaveAndRender(instance, html);
  });

  // Save all tile data
  html.find('#save-tiles').click(async () => {
    logMessage("Saving data for tile...");
    try {
      handleSaveAndRender(instance, html);
    } catch (error) {
      ui.notifications.error("Failed to save tile data. Please try again.");
      console.error("Error saving tile data:", error);
    }
  });

  // Generate tiles
  html.find('#generate-tiles').click(async () => {
    const replace = html.find('#replace-tiles').is(':checked');
    const count = parseInt(html.find('#tile-count').val(), 10);
    await generateTileFields(instance, html, { replace, count });
  });

  // Open active tile window
  html.find('#open-tile-config').click(() => {
    openTileConfigForControlledTile();
  });

  // Delete tile event listener
  html.find('#tile-fields-container').on('click', '.delete-tile', async event => {
    const order = parseInt($(event.currentTarget).closest('.tile-field').data('order'), 10);
    console.log(`Deleting tile with order: ${order}`);
    await handleDeleteAndSave(instance, order, html);
  });

  // Update active tile
  html.find('.stage-buttons-container').on('click', '.tile-button', async event => {
    const tileName = event.currentTarget.dataset.tileName;
    console.log(`Clicked tile button with Name: ${tileName}`);

    await findAndSwitchToTileByTag(instance, tileName);
    if (instance.currentTile) {
      await loadTileImages(instance, instance.currentTile);
      await new Promise(resolve => requestAnimationFrame(resolve));
      await updateActiveTileButton(instance);
    } else {
      console.warn(`No tile found with the tileName: ${tileName}`);
    }
  });

  // Activate media
  html.find('.set-media-button').click(async event => {
    const index = $(event.currentTarget).data('index');
    if (!instance.currentTile || !instance.currentTile.document) {
      console.warn("No current tile is selected or missing document property.");
      return;
    }

    const mediaPaths = await instance.currentTile.document.getFlag(NAMESPACE, 'imagePaths') || [];
    await collectAndSaveImageData(instance, html);

    if (index >= 0 && index < mediaPaths.length) {
      await activateImage(instance, mediaPaths[index], index);
    } else {
      console.warn(`Index ${index} out of bounds for media paths.`);
      return;
    }

    await new Promise(requestAnimationFrame);
    await updateActiveMediaButton(instance, index);
    await updateActiveTileButton(instance);
  });

  // Cycle media buttons
  html.find('.prev-image').click(async () => {
    await collectAndSaveImageData(instance, html);
    await cycleImages(instance, instance.currentTile, 'prev');
    const currentIndex = await instance.currentTile.document.getFlag(NAMESPACE, 'imgIndex');
    await updateActiveMediaButton(instance, currentIndex);
    await updateActiveTileButton(instance);
  });

  html.find('.next-image').click(async () => {
    await collectAndSaveImageData(instance, html);
    await cycleImages(instance, instance.currentTile, 'next');
    const currentIndex = await instance.currentTile.document.getFlag(NAMESPACE, 'imgIndex');
    await updateActiveMediaButton(instance, currentIndex);
    await updateActiveTileButton(instance);
  });

  // Hide/reveal tile
  html.find('.hide-reveal-tile').click(async () => {
    const tileDropdown = document.getElementById('tile-dropdown');
    if (tileDropdown) {
      const selectedTileId = tileDropdown.value;
      if (selectedTileId) {
        await toggleTileVisibility(selectedTileId);
      } else {
        console.warn("No tile selected for visibility toggle.");
      }
    } else {
      console.warn("Tile dropdown not found.");
    }
  });
}

export function activatePathManagementListeners(instance, html) {
  const list = html.find("#image-path-list");

  console.log("Activating path management listeners");

  list.on("dragstart", "li.form-field", event => {
    const index = $(event.target).closest('li').data('index');
    console.log("Drag start index:", index);
    event.originalEvent.dataTransfer.setData("text/plain", index);
  });

  list.on("dragover", "li.form-field", event => {
    event.preventDefault(); // Necessary to allow the drop
    $(event.currentTarget).addClass("drag-over");
    console.log("Drag over");
  });

  list.on("dragleave", "li.form-field", event => {
    event.preventDefault();
    $(event.currentTarget).removeClass("drag-over");
    console.log("Drag leave");
  });

  list.on("drop", "li.form-field", async event => {
    event.preventDefault();
    const origin = parseInt(event.originalEvent.dataTransfer.getData("text/plain"), 10);
    const target = $(event.target).closest('li').data('index');
    console.log("Drop origin:", origin, "target:", target);
    if (origin !== target) {
      await reorderPaths(instance, origin, target); // Ensure correct variables are passed
      instance.render(true); // Update the display after reordering
    }
  });

  html.find('#delete-image-dropdown').on('change', event => {
    const imagePath = event.target.value;
    const preview = html.find('#delete-image-preview');
    if (imagePath) {
      preview.attr('src', imagePath).show();
    } else {
      preview.hide();
    }
  });

  html.find('.delete-image').click(() => {
    const selectedImage = html.find('#delete-image-dropdown').val();
    if (selectedImage) {
      deleteImageByPath(instance, selectedImage);
      instance.render(true); // Re-render to reflect changes
    }
  });

  html.find('.delete-all-paths').click(() => {
    deleteAllPaths(instance);
    instance.render(true); // Re-render to reflect changes
  });
}

export function activateImageSearchBarListeners(instance, html) {
  html.find('#image-search-bar').on('input', event => {
    const query = event.target.value;
    console.log('TotM - Input event detected, query:', query);
    instance.escapePressed = false;
    performImageSearch(instance, query);
  });

  html.find('#image-search-bar').on('keydown', event => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      if (instance.escapePressed) {
        instance.close();
      } else {
        event.target.value = '';
        instance.escapePressed = false;
        performImageSearch(instance, '');
        instance.render(false, {});
        event.target.blur();
      }
    } else if (event.key === 'Enter') {
      if (!event.target.value.trim()) {
        event.preventDefault();
        performImageSearch(instance, '');
      } else {
        const firstMatch = instance.imagePaths.find(image =>
          image.displayImg.toLowerCase().includes(event.target.value.toLowerCase()) ||
            image.tags.some(tag => tag.toLowerCase().includes(event.target.value.toLowerCase()))
        );
        if (firstMatch) {
          activateImage(instance, firstMatch, instance.imagePaths.indexOf(firstMatch));
        }
      }
    }
  });
}

export function activateImagePreviewListeners(instance, html) {
  const imagePathList = html.find("#image-path-list");

  imagePathList.on("mouseover", ".path-field", event => {
    const filePath = $(event.currentTarget).data('img'); // Get the file path from the data attribute
    const previewImageSize = game.settings.get('totm-manager', 'previewImageSize'); // Get the user-defined preview image size

    // Get the position of the hovered item and the width of the viewport
    const itemOffset = $(event.currentTarget).offset();
    const itemWidth = $(event.currentTarget).outerWidth();
    const viewportWidth = $(window).width();
    const totmWindow = instance.element; // Use the instance's element to select the window

    if (!totmWindow.length) {
      console.error('TOTM window not found');
      return;
    }

    // Get the offset of the totm window relative to the viewport
    const totmWindowOffset = totmWindow.offset();
    const totmWindowWidth = totmWindow.outerWidth();

    // Calculate the required space for the preview image to appear on the right
    const spaceOnRight = viewportWidth - (itemOffset.left + itemWidth);

    // Determine if the preview should appear on the right or left
    let previewElement;

    if (filePath.endsWith('.mp4') || filePath.endsWith('.webm')) {
      // Create a video element for video files
      previewElement = $('<video controls autoplay muted></video>') // Autoplay and mute by default
        .attr('src', filePath)
        .css({
          display: 'block',
          width: `${previewImageSize}px`,
          height: 'auto',
          position: 'absolute', // Position it absolutely
          top: '0', // Align to the top of the viewport
          left: spaceOnRight < previewImageSize || (totmWindowOffset.left + totmWindowWidth + previewImageSize > viewportWidth)
            ? 'auto' // If there's not enough space on the right, align it to the left
            : '100%', // Otherwise, align it to the right
          right: spaceOnRight < previewImageSize || (totmWindowOffset.left + totmWindowWidth + previewImageSize > viewportWidth)
            ? '100%' // Align to the left
            : 'auto' // Align to the right
        });
    } else {
      // Otherwise, create an image element for other image types
      previewElement = $('<img />').attr('src', filePath)
        .css({
          display: 'block',
          width: `${previewImageSize}px`,
          height: 'auto',
          position: 'absolute', // Position it absolutely
          top: '0', // Align to the top of the viewport
          left: spaceOnRight < previewImageSize || (totmWindowOffset.left + totmWindowWidth + previewImageSize > viewportWidth)
            ? 'auto' // If there's not enough space on the right, align it to the left
            : '100%', // Otherwise, align it to the right
          right: spaceOnRight < previewImageSize || (totmWindowOffset.left + totmWindowWidth + previewImageSize > viewportWidth)
            ? '100%' // Align to the left
            : 'auto' // Align to the right
        });
    }

    // Append the preview element after the current path field
    $(event.currentTarget).after(previewElement);
  });

  imagePathList.on("mouseout", ".path-field", event => {
    // Remove the preview when the mouse moves out
    $(event.currentTarget).next('img, video').remove(); // Remove the next image or video
  });
}

export function activateEffectEventListeners(instance) {
  document.getElementById('target-dropdown').addEventListener('change', (event) => onTargetChange(event, instance));

  document.getElementById('add-effect-button').addEventListener('click', () => {
    const target = document.getElementById('target-dropdown').value;
    const effect = document.getElementById('effect-dropdown').value;
    new ModifyEffectForm({ target, effect, instance }).render(true);
  });

  // Set current tile when a tile is selected
  document.getElementById('tile-selection').addEventListener('change', async (event) => {
    // Check if the clicked element is within the 'tile-selection' container and is a 'tile-dropdown'
    if (event.target.closest('#tile-selection') && event.target.matches('#tile-dropdown')) {
      const tileId = event.target.value;
      const tile = canvas.tiles.get(tileId);
      if (tile) {
        instance.currentTile = tile;
        await loadTileImages(instance, tile);
        // Update the current effects list when a tile is selected
        updateEffectsUI(instance, tile);
      } else {
        console.error("No tile found with the selected ID.");
      }
    }
  });

  // Event listener for the remove effect button
  document.getElementById('current-effects-container').addEventListener('click', function(event) {
    const removeButton = event.target.closest('.remove-effect-button');
    if (removeButton) {
      const effectItem = removeButton.closest('.effect-item');
      if (!effectItem) {
        console.error("Effect item not found.");
        return;
      }

      // Determine the target type (tile, image, transitions)
      let targetType;
      const targetIcon = effectItem.querySelector('.effect-target-type i');

      if (targetIcon.classList.contains('fa-cubes')) {
        targetType = 'tile';
      } else if (targetIcon.classList.contains('fa-image')) {
        targetType = 'image';
      } else if (targetIcon.classList.contains('fa-arrows-rotate')) {
        targetType = 'transitions';
      } else {
        console.error("Unknown target type for effect removal.");
        return;
      }

      // Retrieve the effect name and ensure tileId is present
      const effectName = effectItem.querySelector('.effect-name').textContent;

      const tileId = instance.currentTile?.id || effectItem.getAttribute('data-tile-id');
      const tile = canvas.tiles.get(tileId);

      if (!tile) {
        console.error("No active tile found.");
        return;
      }

      // Call the removeEffect function
      removeEffect(instance, targetType, effectName).then(() => {
        // Update the effects UI and re-render
        updateEffectsUI(instance, tile);
        instance.render(true);
      }).catch((error) => {
        console.error("Failed to remove effect:", error);
      });
    }
  });
}
