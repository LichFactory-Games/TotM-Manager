/////////////////////////////
// // Listener Methods  // //
/////////////////////////////

import { addImageToTile, addDirectoryToTile, setActiveImage, updateImageTags, cycleImages, updateActiveImageButton, reorderPaths, deleteImageByPath, deleteAllPaths, performImageSearch } from './images.js';
import { saveTileData, generateTileFields, switchToTileByTag, loadTileData } from './tiles.js';


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

  html.find('.save-paths').click(() => saveTileData(instance, html));

  html.find('#generate-tiles').click(() => {
    const replace = html.find('#replace-tiles').is(':checked');
    const count = parseInt(html.find('#tile-count').val(), 10);
    generateTileFields(instance, html, { replace, count });
  });

  html.find('#save-tiles').click(() => saveTileData(instance, html));

  loadTileData(instance);

  html.find('.stage-buttons-container').on('click', '.tile-button', event => {
    const tileName = event.currentTarget.dataset.tileName;
    switchToTileByTag(instance, tileName);
    instance.render(true);
    updateActiveImageButton(instance);
  });

  html.find('.set-image-button').click(async event => {
    const index = $(event.currentTarget).data('index');
    await setActiveImage(instance, index);
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
