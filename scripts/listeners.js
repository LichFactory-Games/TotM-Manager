/////////////////////////////
// // Listener Methods  // //
/////////////////////////////

import { NAMESPACE, logMessage, activateTile, findAndSwitchToTileByTag, updateActiveTileButton } from './utilities.js';
import { addImageToTile, addImageDirectoryToTile, updateActiveImageButton, reorderPaths, deleteImageByPath, deleteAllPaths } from './images.js';
import { generateTileFields, handleSaveAndRender, handleDeleteAndSave, collectAndSaveImageData } from './tiles.js';
import { loadTileImages, toggleTileVisibility, openTileConfigForControlledTile } from './tiles-utils.js'
import { updateEffectsUI, onTargetChange, removeEffect } from './effects.js';
import { ModifyEffectForm } from './modifyEffectForm.js';
import { performImageSearch, activateImage, cycleImages } from './stage.js';


export function activateGeneralListeners(instance, html) {
  // Add image to tile
  html.find('.add-image').click(() => {
    new FilePicker({
      type: "image",
      current: "",
      callback: path => addImageToTile(instance, instance.currentTile, path)
    }).browse();
  });

  // Add image folder to tile
  html.find('.add-folder').click(() => {
    new FilePicker({
      type: "folder",
      callback: folderPath => addImageDirectoryToTile(instance, instance.currentTile, folderPath)
    }).browse();
  });

  // Save all tile image data
  html.find('.save-paths').click(async () =>   {
    logMessage("Saving images for tile...");
    // Ensure the current tile is defined
    if (!instance.currentTile || !instance.currentTile.document) {
      console.warn("No current tile is selected or missing document property.");
      return;
    }

    // Retrieve the image paths from the tile flags
    // Note that without providing the instance saving won't function properly
    const imagePaths = await instance.currentTile.document.getFlag(NAMESPACE, 'imagePaths') || [];

    // Log the retrieved image paths
    console.log('Retrieved image paths:', imagePaths);

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

  // Event listener for delete button
  html.find('#tile-fields-container').on('click', '.delete-tile', async event => {
    const order = parseInt($(event.currentTarget).closest('.tile-field').data('order'), 10); // Get the order attribute
    console.log(`Deleting tile with order: ${order}`);
    await handleDeleteAndSave(instance, order, html)

  });

  // Update Active Tile
  html.find('.stage-buttons-container').on('click', '.tile-button', async event => {
    const tileName = event.currentTarget.dataset.tileName;
    console.log(`Clicked tile button with Name: ${tileName}`);

    await findAndSwitchToTileByTag(instance, tileName);
    console.log(`Switched to tile: ${tileName}`);

    if (instance.currentTile) {
      await loadTileImages(instance, instance.currentTile);
      console.log(`Loaded images for tile: ${tileName}`);

      // Ensure the DOM is updated before proceeding
      await new Promise(resolve => requestAnimationFrame(resolve));

      await updateActiveTileButton(instance);
    } else {
      console.warn(`No tile found with the tileName: ${tileName}`);
    }
  });

  // Activate image
  html.find('.set-image-button').click(async event => {
    const index = $(event.currentTarget).data('index');
    console.log(`Switching to image index: ${index}`);

    // Ensure the current tile is defined
    if (!instance.currentTile || !instance.currentTile.document) {
      console.warn("No current tile is selected or missing document property.");
      return;
    }

    // Retrieve the image paths from the tile flags
    const imagePaths = await instance.currentTile.document.getFlag(NAMESPACE, 'imagePaths') || [];

    // Log the retrieved image paths
    console.log('Retrieved image paths:', imagePaths);

    await collectAndSaveImageData(instance, html);

    // Check if the index is within bounds
    if (index >= 0 && index < imagePaths.length) {
      await activateImage(instance, imagePaths[index], index);
      console.log(`Active image set to index ${index}`);
    } else {
      console.warn(`Index ${index} out of bounds for image paths. Image paths length: ${imagePaths.length}`);
      return;
    }

    await new Promise(requestAnimationFrame);
    await updateActiveImageButton(instance, index); // Pass the index here
    await updateActiveTileButton(instance);
  });

  // Cycle image buttons
  html.find('.prev-image').click(async () => {
    await collectAndSaveImageData(instance, html);
    await cycleImages(instance, instance.currentTile, 'prev');
    await new Promise(requestAnimationFrame);
    const currentIndex = await instance.currentTile.document.getFlag(NAMESPACE, 'imgIndex');
    await updateActiveImageButton(instance, currentIndex); // Pass the currentIndex here
    await updateActiveTileButton(instance);
  });

  html.find('.next-image').click(async () => {
    await collectAndSaveImageData(instance, html);
    await cycleImages(instance, instance.currentTile, 'next');
    await new Promise(requestAnimationFrame);
    const currentIndex = await instance.currentTile.document.getFlag(NAMESPACE, 'imgIndex');
    await updateActiveImageButton(instance, currentIndex); // Pass the currentIndex here
    await updateActiveTileButton(instance);
  });

  html.find('.hide-reveal-tile').click(async () => {
    const tileDropdown = document.getElementById('tile-dropdown');
    if (tileDropdown) {
      const selectedTileId = tileDropdown.value;
      if (selectedTileId) {
        await toggleTileVisibility(selectedTileId);
        // await new Promise(requestAnimationFrame);
        // await updateActiveImageButton(instance, currentIndex);
        // await updateActiveTileButton(instance);
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
    const img = $(event.currentTarget).next('img');
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

    // Determine if the image should appear on the right or left
    if (spaceOnRight < previewImageSize || (totmWindowOffset.left + totmWindowWidth + previewImageSize > viewportWidth)) {
      // Not enough space on the right, place the image on the left
      img.css({
        display: 'block',
        width: `${previewImageSize}px`,
        height: 'auto',
        top: '0', // Align to the top of the viewport
        left: 'auto', // Align to the left of the viewport
        right: '100%'
      });
    } else {
      // Enough space on the right, place the image on the right
      img.css({
        display: 'block',
        width: `${previewImageSize}px`,
        height: 'auto',
        top: '0', // Align to the top of the viewport
        left: '100%',
        right: 'auto' // Align to the right of the viewport

      });
    }
  });

  imagePathList.on("mouseout", ".path-field", event => {
    const img = $(event.currentTarget).next('img');
    img.hide();
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
        updateEffectsUI(tile, instance);
      } else {
        console.error("No tile found with the selected ID.");
      }
    }
  });

  // Event listener for switching to effects tab
  document.querySelector('.tabs').addEventListener('click', (event) => {
    if (event.target.dataset.tab === 'effects') {
      if (instance.currentTile) {
        updateEffectsUI(tile, instance);
      }
    }
  });

  // Event listener for the remove effect button
  document.getElementById('current-effects-container').addEventListener('click', function(event) {
    if (event.target.closest('.effect-item')) {
      const removeButton = event.target.closest('.remove-effect-button');
      const effectItem = removeButton.closest('.effect-item');

      let targetType;
      const targetIcon = effectItem.querySelector('.effect-target-type i');

      if (targetIcon.classList.contains('fa-cubes')) {
        targetType = 'tile';
      } else if (targetIcon.classList.contains('fa-image')) {
        targetType = 'image';
      } else if (targetIcon.classList.contains('fa-arrows-rotate')) { // This is for transitions
        targetType = 'transitions';
      } else {
        console.error("Unknown target type for effect removal.");
        return;
      }

      const effectName = effectItem.querySelector('.effect-name').textContent;

      // Call the removeEffect function with the correct context
      removeEffect(instance, targetType, effectName);
      updateEffectsUI(instance);

    }
  });
}
