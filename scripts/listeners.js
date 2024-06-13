/////////////////////////////
// // Listener Methods  // //
/////////////////////////////

import { NAMESPACE, activateTile, findAndSwitchToTileByTag, updateActiveTileButton } from './utilities.js';
import { addImageToTile, addImageDirectoryToTile, updateImageTags, updateActiveImageButton, reorderPaths, deleteImageByPath, deleteAllPaths } from './images.js';
import { generateTileFields, handleSaveAndRender, deleteTileData } from './tiles.js';
import { loadTileImages } from './tiles-utils.js'
import { updateEffectsUI, onTargetChange } from './effects.js';
import { ModifyEffectForm } from './modifyEffectForm.js';
import { performImageSearch, activateImage, cycleImages } from './stage.js';


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
      callback: folderPath => addImageDirectoryToTile(instance, instance.currentTile, folderPath)
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

  // Update Active Tile
  html.find('.stage-buttons-container').on('click', '.tile-button', async event => {
    const tileName = event.currentTarget.dataset.tileName;
    console.log(`Clicked tile button with Name: ${tileName}`);

    await findAndSwitchToTileByTag(instance, tileName);
    console.log(`Switched to tile: ${tileName}`);

    if (instance.currentTile) {
      await loadTileImages(instance, instance.currentTile);
      console.log(`Loaded images for tile: ${tileName}`);

      // Call updateActiveTileButton after rendering
      setTimeout(() => {
        updateActiveTileButton(instance);
        console.log(`Updated active tile button for tile: ${tileName}`);
      }, 100);
    } else {
      console.warn(`No tile found with the tileName: ${tileName}`);
    }
  });

  // html.find('.stage-buttons-container').on('click', '.tile-button', async event => {
  //   const tileName = event.currentTarget.dataset.tileName;
  //   console.log(`Switching to tile with Name: ${tileName}`);
  //   await findAndSwitchToTileByTag(instance, tileName);
  //   await loadTileImages(instance, instance.currentTile);

  //   // Call updateActiveTileButton after rendering
  //   setTimeout(() => updateActiveTileButton(instance), 100);
  // });

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

    // Check if the index is within bounds
    if (index >= 0 && index < imagePaths.length) {
      await activateImage(instance, imagePaths[index], index);
      console.log(`Active image set to index ${index}`);
    } else {
      console.warn(`Index ${index} out of bounds for image paths. Image paths length: ${imagePaths.length}`);
      return;
    }

    // Get the current tile data
    const tileData = {
      name: instance.currentTile.document.getFlag(NAMESPACE, 'tileName'),
      opacity: instance.currentTile.document.getFlag(NAMESPACE, 'opacity'),
      tint: instance.currentTile.document.getFlag(NAMESPACE, 'tint'),
      order: instance.currentTile.document.getFlag(NAMESPACE, 'order')
    };

    // Update the active image button once everything is done
    updateActiveImageButton(instance);
    setTimeout(() => updateActiveTileButton(instance), 100);

    await handleSaveAndRender(instance, tileData);
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

  document.getElementById('add-effect-button').addEventListener('click', () => {
    const target = document.getElementById('target-dropdown').value;
    const effect = document.getElementById('effect-dropdown').value;
    new ModifyEffectForm({ target, effect, instance }).render(true);
  });

  // // Ensure the 'modify-effect-button' exists before attaching the listener
  // const modifyEffectButton = document.getElementById('modify-effect-button');
  // if (modifyEffectButton) {
  //   modifyEffectButton.addEventListener('click', (ev) => {
  //     ev.preventDefault();
  //     const target = document.getElementById('target-dropdown').value;
  //     const effect = document.getElementById('effect-dropdown').value;
  //     new ModifyEffectForm({ target, effect, instance }).render(true);
  //   });
  // } else {
  //   console.warn("modify-effect-button not found");
  // }

  // Example: Set current tile when a tile is selected
  document.getElementById('tile-dropdown').addEventListener('change', async (event) => {
    const tileId = event.target.value;
    const tile = canvas.tiles.get(tileId);
    if (tile) {
      instance.currentTile = tile;
      await loadTileImages(instance, tile);
      updateEffectsUI(tile); // Update the current effects list when a tile is selected
    } else {
      console.error("No tile found with the selected ID.");
    }
  });

  // Event listener for switching to effects tab
  document.querySelector('.tabs').addEventListener('click', (event) => {
    if (event.target.dataset.tab === 'effects') {
      if (instance.currentTile) {
        updateEffectsUI(instance.currentTile);

      }
    }
  });
}
