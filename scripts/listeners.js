/////////////////////////////
// // Listener Methods  // //
/////////////////////////////

import { addImageToTile, addDirectoryToTile, setActiveImage, updateImageTags, cycleImages, updateActiveImageButton, reorderPaths, deleteImageByPath, deleteAllPaths, performImageSearch, getImageById } from './images.js';
import { saveTileData, generateTileFields, handleSaveAndRender, handleDeleteAndSave, deleteTileData } from './tiles.js';
import { loadTileData, loadTileImages, updateTileFields, updateStageButtons, switchToTileByTag  } from './tiles-utils.js'
import { populateTileDropdown, populateImageDropdown, populateEffectsDropdown, applyEffectToTile, applyEffectToImage, removeEffectFromImage, removeEffectFromTile, updateCurrentEffects } from './effects.js';


export function activateGeneralListeners(instance, html) {
  html.find('.add-image').click(() => {
    new FilePicker({
      type: "image",
      current: "",
      callback: path => addImageToTile(instance, instance.currentTile, path)
    }).browse();
  });

  html.find('.add-folder').click(() => {
    new FilePicker({
      type: "folder",
      callback: folderPath => addDirectoryToTile(instance, instance.currentTile, folderPath)
    }).browse();
  });

  html.find('.save-paths').click(() => handleSaveAndRender(instance, html));

  html.find('#save-tiles').click(() => handleSaveAndRender(instance, html));

  html.find('#generate-tiles').click(async () => {
    const replace = html.find('#replace-tiles').is(':checked');
    const count = parseInt(html.find('#tile-count').val(), 10);
    await generateTileFields(instance, html, { replace, count });
  });


  // Event listener for delete button
  html.find('#tile-fields-container').on('click', '.delete-tile', async event => {
    const order = parseInt($(event.currentTarget).closest('.tile-field').data('order'), 10); // Get the order attribute
    console.log(`Deleting tile with order: ${order}`);
    await deleteTileData(instance, order, html);
    await handleSaveAndRender(instance, html);  // Ensure the state is saved and re-rendered correctly
  });

  html.find('.stage-buttons-container').on('click', '.tile-button', async event => {
    const tileId = event.currentTarget.dataset.tileId;
    console.log(`Switching to tile with ID: ${tileId}`);
    const tileName = event.currentTarget.dataset.tileName;
    switchToTileByTag(instance, tileName);
    updateActiveImageButton(instance);
  });

  html.find('.set-image-button').click(async event => {
    const index = $(event.currentTarget).data('index');
    await setActiveImage(instance, index);
    handleSaveAndRender(instance, html);
    instance.render(true);
    updateActiveImageButton(instance);
  });

  html.find('.tag-field').on('input', event => {
    const index = $(event.currentTarget).data('index');
    updateImageTags(instance, index, $(event.currentTarget).val());
  });

  html.find('.prev-image').click(async () => {
    await cycleImages(instance, instance.currentTile, 'prev');
    updateActiveImageButton(instance);
  });

  html.find('.next-image').click(async () => {
    await cycleImages(instance, instance.currentTile, 'next');
    updateActiveImageButton(instance);
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
        left: 'auto',
        right: '100%' // Align to the left of the hovered item
      });
    } else {
      // Enough space on the right, place the image on the right
      img.css({
        display: 'block',
        width: `${previewImageSize}px`,
        height: 'auto',
        left: '100%', // Align to the right of the hovered item
        right: 'auto'
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

  document.getElementById('add-effect-button').addEventListener('click', () => addEffect(instance));
  document.getElementById('remove-effect-button').addEventListener('click', () => removeEffect(instance));
  document.getElementById('update-effect-button').addEventListener('click', updateEffect);

  // Example: Set current tile when a tile is selected
  document.getElementById('tile-dropdown').addEventListener('change', async (event) => {
    const tileId = event.target.value;
    const tile = canvas.tiles.get(tileId);
    if (tile) {
      instance.currentTile = tile;
      await loadTileImages(instance, tile);
      updateCurrentEffects(tile); // Update the current effects list when a tile is selected
    } else {
      console.error("No tile found with the selected ID.");
    }
  });
}

export function onTargetChange(event, instance) {
  const target = event.target.value;
  instance.selectedTarget = target; // Store the selected target in the instance

  console.log(`Target changed to: ${target}`);
  console.log(`Current tile:`, instance.currentTile);
  console.log(`Current image paths:`, instance.imagePaths);

  if (target === 'tile') {
    document.getElementById('tile-selection').style.display = 'block';
    document.getElementById('image-selection').style.display = 'none';
    // Populate tile dropdown
    const tiles = canvas.tiles.placeables; // Assuming you have access to canvas tiles
    console.log(`Tiles available:`, tiles);
    populateTileDropdown(tiles, instance.currentTile?.id);
  } else if (target === 'image') {
    document.getElementById('tile-selection').style.display = 'none';
    document.getElementById('image-selection').style.display = 'block';
    // Ensure a tile is selected and imagePaths are populated
    if (!instance.currentTile) {
      console.error("No tile selected. Please select a tile first.");
      ui.notifications.warn("No tile selected. Please select a tile first.");
      return;
    }
    if (instance.imagePaths && instance.imagePaths.length > 0) {
      console.log("Image paths found, populating image dropdown.");
      populateImageDropdown(instance);
    } else {
      console.error("Image paths are not populated or empty.");
      ui.notifications.warn("No images found for the selected tile. Please add images first.");
    }
  }
}

async function addEffect(instance) {
  const target = document.getElementById('target-dropdown').value;
  const effect = document.getElementById('effect-dropdown').value;
  console.log(`Adding effect: ${effect} to target: ${target}`);

  if (target === 'tile') {
    const tileId = document.getElementById('tile-dropdown').value;
    console.log(`Tile ID selected: ${tileId}`);
    const tile = canvas.tiles.get(tileId);
    if (tile) {
      console.log(`Applying effect to tile:`, tile);
      await applyEffectToTile(tile, effect); // Function to apply effect to the tile
    } else {
      console.error("No tile found to apply effect.");
    }
  } else if (target === 'image') {
    const imageId = document.getElementById('image-dropdown').value;
    console.log(`Image ID selected: ${imageId}`);
    const image = getImageById(instance, imageId); // Get the image by ID
    console.log(`Image found:`, image);
    if (image && instance.currentTile) {
      console.log(`Applying effect to image:`, image);
      await applyEffectToImage(instance, instance.currentTile, image, effect); // Function to apply effect to the image
    } else {
      console.error("No image found to apply effect or no tile selected.");
    }
  }
}

async function removeEffect(instance) {
  const target = document.getElementById('target-dropdown').value;
  const effect = document.getElementById('effect-dropdown').value;
  console.log(`Removing effect: ${effect} from target: ${target}`);

  if (target === 'tile') {
    const tileId = document.getElementById('tile-dropdown').value;
    console.log(`Tile ID selected: ${tileId}`);
    const tile = canvas.tiles.get(tileId);
    if (tile) {
      console.log(`Removing effect from tile:`, tile);
      await removeEffectFromTile(tile, effect); // Function to remove effect from the tile
    } else {
      console.error("No tile found to remove effect.");
    }
  } else if (target === 'image') {
    const imageId = document.getElementById('image-dropdown').value;
    console.log(`Image ID selected: ${imageId}`);
    const image = getImageById(instance, imageId); // Get the image by ID
    console.log(`Image found:`, image);
    if (image && instance.currentTile) {
      console.log(`Removing effect from image:`, image);
      await removeEffectFromImage(instance, instance.currentTile, image, effect); // Function to remove effect from the image
    } else {
      console.error("No image found to remove effect or no tile selected.");
    }
  }
}

function updateEffect() {
  // Functionality to update the effect
}

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

const debouncedHandleSaveAndRender = debounce(handleSaveAndRender, 300);
