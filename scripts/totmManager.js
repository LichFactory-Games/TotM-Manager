// This module allows the manipulation of images
// lights and other attachments to a particular tile (when clicked)
// Import necessary Foundry modules if required
// (if using ES6 imports, otherwise just reference them directly in your code)

// Define moduleId globally if not already defined
console.log("Load totmManager.js");
const moduleId = 'totm-manager';

// Import functions
import { hexToDecimal, adjustColor, findTileByTag} from './utilities.js'
import { applyGlowEffect, removeGlowEffect, removeAllGlowEffects } from './glowEffects.js';


export class totmManager extends Application {
    constructor(tiles, options = {}) {
        super(options);
        console.log("Initializing totmManager with tiles:", tiles);
        this.imagePaths = [];
        this.tiles = tiles;   // Ensure this.tiles is always an array
        console.log("totmManager initialized with tiles:", this.tiles);
        this.currentActiveTag = ''; // Initialize with an empty string
        this.escapePressed = false; // Flag to track escape key press

        // Bind the method to ensure 'this' refers to the class instance
        this.cycleImages = this.cycleImages.bind(this);
        this.currentTile = null;
        // Initialize mapping for frames to image tiles
        this.tagMapping = {
            'speaker1': 'speakerFrame1',
            'speaker2': 'speakerFrame2',
            'scene'   : 'sceneFrame'
        };
        this.currentTileIndex = this.findFirstSceneTileIndex();
        this.currentImageIndex = 0; // Initialize with the first image index

        if (this.currentTileIndex !== -1) {
            this.currentTile = this.tiles[this.currentTileIndex];
            this.activateTile(this.currentTile);  // Make sure activateTile is called
            this.loadTileImages(this.currentTile);
        } else {
            console.error("No scene tile found or incorrect tiles data.");
        }
    }

    // Static Method
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: "TotM Manager",
            id: moduleId,
            template: "modules/totm-manager/templates/totmm-window-template.hbs", // Ensure this path is correct
            resizable: true,
            width: 500,
            closeOnSubmit: false
        });
    }

    // Methods using applyGlowEffect, removeGlowEffect, removeAllGlowEffects
    async applyGlowEffect(tile, imageIndex) {
        await applyGlowEffect(tile, imageIndex, this.imagePaths, this.tagMapping);
    }

    async removeGlowEffect(tile) {
        await removeGlowEffect(tile, this.tagMapping);
    }

    async removeAllGlowEffects() {
        await removeAllGlowEffects(this.tagMapping);
    }


    // Tile Initialization
    findFirstSceneTileIndex() {
        if (!this.tiles || !Array.isArray(this.tiles)) {
            console.error("No tiles array provided or tiles is not an array.");
            return -1; // Safely exit if tiles is not an array
        }
        // Loop through the tiles to find the first one with 'scene' tag
        for (let i = 0; i < this.tiles.length; i++) {
            let tile = this.tiles[i];
            if (this.tileHasSceneTag(tile)) {
                return i; // Return the index of the first tile with 'scene' tag
            }
        }
        return -1; // Return -1 if no tile with 'scene' tag is found
    }

    tileHasSceneTag(tile) {
        // Check if the tile has the 'scene' tag
        const tags = Tagger.getTags(tile);
        return tags.includes('scene');
    }

    //// Lifecycle Methods
    async initialize() {
        console.log("Initializing totmManager with tiles:", this.tiles.length);
        if (!this.tiles.length || this.currentTileIndex === -1) {
            ui.notifications.warn("No tiles found with specified tags.");
            return;
        }
        // Activate the first scene tile
        this.activateTile(this.tiles[this.currentTileIndex]);
        setTimeout(() => this.updateActiveImageButton(), 10);
        this.updateActiveImageButton();  // Update image buttons right after initialization
    }

    loadTileImages(tile) {
        if (!tile) {
            console.error("No tile provided or tile is undefined.");
            return;
        }

        if (!tile.document) {
            console.error("Tile does not have a document property:", tile);
            return;
        }

        // Fetch the image paths stored in the tile's flags
        let loadedPaths = tile.document.getFlag('core', 'imagePaths') || [];

        // Prepare the image paths for display
        this.imagePaths = loadedPaths.map(path => {
            let displayPath; // This will hold the filename for display purposes
            if (typeof path === 'string') {  // Handle legacy or incorrectly saved paths
                displayPath = path.split('/').pop(); // Extract filename from the full path
                return { img: path, displayImg: displayPath, tags: [] };
            } else {
                displayPath = path.img.split('/').pop(); // Ensure to handle object structured paths
                return { ...path, displayImg: displayPath };
            }
        });
        console.log("Loaded image paths for tile:", this.imagePaths);

        // Call the render method to update the UI with loaded images
        this.render(true);
        // Initial call to update the button state
        setTimeout(() => this.updateActiveImageButton(), 10);  // Delay the update call to ensure DOM has updated
    }

    render(force = false, options = {}) {
        const html = this.element;  // Assuming this.element is your component's root HTML element
        const list = html.find("#image-path-list");
        list.empty();  // Clear existing content

        // Only display paths if a tile is active
        if (!this.currentTile) {
            this.imagePaths = []; // Clear the imagePaths array
            console.log("No tile selected, cleared image paths display.");
            return super.render(force, {
                ...options,
                data: this.getData()
            });
            return;
        }

        // Adding UI elements for cycling through images and navigating tiles
        // Iterate through each path and generate list items with preview on hover
        this.imagePaths.forEach((path, index) => {
            if (!path.img || typeof path.img !== 'string') {
                console.error("Invalid path object encountered:", path);
                return; // Skip if no valid image path is found
            }

            const displayImg = path.displayImg || path.img.split('/').pop();
            const tagsString = Array.isArray(path.tags) ? path.tags.join(', ') : '';
            const previewImageSrc = path.img; // URL to the image for preview

            // Construct the list item HTML string with image preview functionality
            // TODO: fix preview it alternates side depending on context
            const listItem = `
                <li class="form-field" draggable="true" data-index="${index}" style="display: flex; align-items: center; cursor: grab; margin-bottom: 10px;">
                <span class="handle" style="cursor: move; margin-right: 5px;">&#9776;</span>
                <span class="path-field" style="flex-grow: 1; min-width: 175px; max-width: 350px; margin-right: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 10px; border: 1px solid var(--color-border-light-tertiary); border-radius: 3px; display: inline-block; line-height: 25px; height: 25px; align-items: center;"
            onmouseover="showPreview(this, '${path.img}')" onmouseout="hidePreview()">
                ${displayImg}
            </span>
        <img id="preview-${index}" src="${path.img}" style="display: none; position: absolute; right: 100%; width: auto; max-width: 300px; height: auto;" class="preview-image">
            <input type="text" id="tags-input-${index}" name="tags${index}" value="${tagsString}" placeholder="Enter tags, comma-separated" class="tag-field" style="flex-grow: 1; min-width: 100px; max-width: none; margin-right: 10px; padding: 0 10px; height: 25px; line-height: 25px; display: inline-block; border: 1px solid var(--color-border-light-tertiary); border-radius: 3px;">
            <button type="button" class="delete-path" data-index="${index}" style="display: flex; align-items: center; justify-content: center; width: 25px; height: 25px; font-size: 18px; padding: 5; margin-right: 5px; border: 1px solid var(--color-border-light-tertiary); border-radius: 3px;">−</button>
            <button type="button" class="set-image-button" data-index="${index}" style="display: flex; align-items: center; justify-content: center; width: 25px; height: 25px; font-size: 18px; padding: 5; border: 1px solid var(--color-border-light-tertiary); border-radius: 3px; margin-right: 5px;">*</button>
            <input type="color" class="color-picker" id="color-picker-${index}" value="${path.color || '#000000'}" style="display: flex; min-width: 25px; height: 25px; padding: 5; border: 1px solid var(--color-border-light-tertiary); border-radius: 3px;">
        </li>`;

            list.append(listItem);

        });

        // Update the UI element for the current active tile and image
        console.log("Rendering: ", this.imagePaths.map(path => path.img));

        setTimeout(() => {
            this.updateActiveTileButton();
            this.updateActiveImageButton();
        }, 10);

        // Attach event listeners for new navigation controls
        this.activateImageNavigationListeners(html);
        return super.render(force, {
            ...options,
            data: this.getData()
        });
    }

    activatePathManagementListeners(html) {

        // Attach event listeners directly to dynamically created elements within the list
        const list = html.find("#image-path-list");

        // Delegation for dynamically added delete and set image buttons
        list.on("click", ".delete-path", event => {
            const index = $(event.target).closest('li').data('index');
            this.imagePaths.splice(index, 1);
            $(event.target).closest('li').remove();
            this.render(true); // Redraw the UI after deletion
        });

        // Drag and drop handling for reordering
        list.on("dragstart", "li", event => {
            event.originalEvent.dataTransfer.setData("text/plain", $(event.target).closest('li').data('index'));
        });

        list.on("dragover", event => {
            event.preventDefault(); // Necessary to allow the drop
        });

        list.on("drop", event => {
            event.preventDefault();
            const origin = parseInt(event.originalEvent.dataTransfer.getData("text/plain"), 10);
            const target = $(event.target).closest('li').data('index');
            this.reorderPaths(origin, target);
            this.render(true); // Update the display after reordering
        });

        html.find('.set-image-button').on("click", event => {
            const index = $(event.currentTarget).data('index');
            if (typeof index === 'number') {
                this.setImageByIndex(index);
                this.updateActiveImageButton();
            } else {
                console.error("Invalid index type:", index);
            }
        });
        html.find('.delete-all-paths').click(() => this.deleteAllPaths());
        html.find('.add-path').click(() => this.triggerFilePicker(html));
        html.find('.new-directory').click(() => this.addNewDirectory(html));
        html.find('.save-paths').click(() => {
            this.imagePaths.forEach((path, index) => {
                let tagsInput = html.find(`#tags-input-${index}`);
                if (tagsInput.length > 0) {
                    let tagsValue = tagsInput.val();
                    path.tags = tagsValue ? tagsValue.split(',').map(tag => tag.trim()) : [];
                }
            });
            this.savePaths();
        });

        html.find('.color-picker').change(async event => {
            const index = $(event.currentTarget).closest('li').data('index');
            const newColor = $(event.currentTarget).val();

            if (this.imagePaths[index] && /^#[0-9A-F]{6}$/i.test(newColor)) {
                this.imagePaths[index].color = newColor;
                console.log(`Color updated for image at index ${index}: ${newColor}`);
                this.applyGlowEffect(this.tiles[this.currentTileIndex], newColor);
            } else {
                console.error("Invalid color picked:", newColor);
            }
        });

    }

    activateImageNavigationListeners(html) {
        // Cycle images
        html.find('.prev-image').click(() => {
            this.cycleImages(this.currentTile, 'prev');
        });
        html.find('.next-image').click(() => {
            this.cycleImages(this.currentTile, 'next');
        });

        // Navigate by tile tag and update UI
        html.find('.btnScene').click(() => {
            this.switchToTileByTag('scene');
            this.updateActiveTileButton(); // Ensure UI updates to reflect active tile
        });
        html.find('.btnSpeaker1').click(() => {
            this.switchToTileByTag('speaker1');
            this.updateActiveTileButton();
        });
        html.find('.btnSpeaker2').click(() => {
            this.switchToTileByTag('speaker2');
            this.updateActiveTileButton();
        });
    }

    glowFilterListeners(html) {
        // Listener for deleting glow filters from a specific tile
        html.find(".delete-filter").click(event => {
            event.preventDefault();
            const gTile= this.currentTile; // Implement this method based on your UI
            if (gTile) {
                this.removeGlowEffect(gTile);
                console.log("Attempting to delete filter from tile:", gTile);
            }
        });

        // Listener for deleting glow filters from all tiles
        html.find(".delete-all-filters").click(event => {
            event.preventDefault();
            this.removeAllGlowEffects();
            console.log("Deleting all glow filters");
        });
    }

    imageSearchBarListeners(html) {
        // Attach search event listener
        html.find('#image-search-bar').on('input', event => {
            const query = event.target.value;
            console.log('Input event detected, query:', query); // Debugging log
            this.escapePressed = false; // Reset escape flag on new input
            this.performImageSearch(query);
        });

        // Attach keydown event listener to handle Esc and Enter keys
        html.find('#image-search-bar').on('keydown', event => {
            if (event.key === 'Escape') {
                event.stopPropagation(); // Prevent the default behavior of closing the window
                if (this.escapePressed) {
                    this.close(); // Close the window on second escape press
                } else {
                    event.target.value = '';
                    this.escapePressed = false; // Reset escape flag
                    this.performImageSearch(''); // Clear the search results
                    this.render(false, {}); // Re-render the window without closing it
                    event.target.blur(); // Unfocus the search bar
                }
            } else if (event.key === 'Enter') {
                if (!event.target.value.trim()) {
                    event.preventDefault();
                    this.performImageSearch(''); // Clear the search results if Enter is pressed on an empty search bar
                } else {
                    const firstMatch = this.imagePaths.find(image =>
                        image.displayImg.toLowerCase().includes(event.target.value.toLowerCase()) ||
                            image.tags.some(tag => tag.toLowerCase().includes(event.target.value.toLowerCase()))
                    );
                    if (firstMatch) {
                        this.activateImage(firstMatch, this.imagePaths.indexOf(firstMatch));
                    }
                }
            }
        });
    }


    //// Activate listeners
    activateListeners(html) {
        super.activateListeners(html);

        // Listen for active button
        setTimeout(() => {
            this.updateActiveTileButton();
            this.updateActiveImageButton();
        }, 10);


        // Listen for image preview
        const imagePathList = html.find("#image-path-list");

        imagePathList.on("mouseover", ".path-field", (event) => {
            const img = $(event.currentTarget).next('img');
            const previewImageSize = game.settings.get('totm-manager', 'previewImageSize'); // Get the user-defined preview image size
            img.css({
                display: 'block',
                width: `${previewImageSize}px`,
                height: 'auto'
            });
        });

        imagePathList.on("mouseout", ".path-field", (event) => {
            const img = $(event.currentTarget).next('img');
            img.hide();
        });

        // Attach event listeners for managing image and tile navigation
        this.activateImageNavigationListeners(html); // Include navigation listeners

        // Attach event listeners for search of images
        this.imageSearchBarListeners(html);

        // Handling the adding of paths and directories
        this.activatePathManagementListeners(html);

        // Handle Glow Filters
        this.glowFilterListeners(html);
    }

    //// Core Functionality

    async cycleImages(tile, direction) {
        const imagePaths = await tile.document.getFlag('core', 'imagePaths') || [];

        if (imagePaths.length === 0) {
            ui.notifications.warn("No images to cycle. Use Alt-Click to add images.");
            return;
        }

        let currentIndex = await tile.document.getFlag('core', 'imgIndex') || 0;
        console.log("Current index before change:", currentIndex);

        // Calculate new index based on the direction of the cycling
        currentIndex = direction === 'next' ?
            (currentIndex + 1) % imagePaths.length :
            (currentIndex - 1 + imagePaths.length) % imagePaths.length;
        console.log("New index after change:", currentIndex);

        // Fetch the current image based on the new index
        const currentImage = imagePaths[currentIndex];

        try {
            // Update the texture source and the image index in the document flags
            await tile.document.update({'texture.src': currentImage.img});
            await tile.document.setFlag('core', 'imgIndex', currentIndex);

            // Apply glow effect each time an image is cycled
            await this.applyGlowEffect(tile, currentIndex);

            // Fetch tags for the current image and toggle features based on these tags
            const imageTags = currentImage.tags || [];
            await this.toggleFeaturesBasedOnTags(imageTags);
            console.log("Cycled to new image at index:", currentIndex, "Path:", currentImage.img);

            // Update the current image index and ensure UI reflects the new active image
            this.currentImageIndex = currentIndex; // Update current image index
            // this.updateActiveImageButton(); // Update active button
            this.render(); // Re-render to update the UI
            setTimeout(() => this.updateActiveImageButton(), 10);  // Delay the update call to ensure DOM has updated

        } catch (error) {
            console.error("Failed to cycle images:", error);
            ui.notifications.error("Error cycling images. See console for details.");
        }
    }

    calculateNewIndex(length, currentIndex, direction) {
        if (direction === 'next') {
            return (currentIndex + 1) % length;
        } else if (direction === 'prev') {
            return (currentIndex - 1 + length) % length;
        }
        return currentIndex; // default return current index if direction is somehow incorrect
    }


    changeTile(direction) {
        // Check the number of tiles available
        const numTiles = this.tiles.length;
        if (numTiles === 0) {
            ui.notifications.warn("No tiles available to navigate.");
            return; // Early exit if no tiles are available
        }

        // Update the current tile index based on the direction
        this.currentTileIndex = (this.currentTileIndex + direction + numTiles) % numTiles;

        // Retrieve the newly selected tile
        const newTile = this.tiles[this.currentTileIndex];

        // Optional: Perform any operations needed when changing tiles
        // For example, you might want to load or display tile-specific information
        this.loadTileImages(newTile); // Assuming this method refreshes the UI based on the new tile's data

        // Log for debugging purposes
        console.log(`Switched to tile at index ${this.currentTileIndex}:`, newTile);

        // Optional: Update any UI elements or perform additional operations
        // This might involve updating a display to show the new tile's details, etc.
        this.render(true); // Re-render the UI if necessary
    }

    // Method to find a tile by tag
    findTileByTag(tag) {
        const tiles = canvas.tiles.placeables;
        return tiles.find(t => Tagger.hasTags(t, [tag], { caseInsensitive: true }));
    }

    switchToTileByTag(tag) {
        const tiles = canvas.tiles.placeables;
        console.log(`Checking for tiles with tag: ${tag}`);

        const tileWithTag = tiles.find(t => Tagger.hasTags(t, tag, { caseInsensitive: true, matchExactly: true }));

        if (tileWithTag) {
            console.log("Found tile with tag:", tag);
            this.currentActiveTag = tag; // Update the current active tag
            this.activateTile(tileWithTag);
            this.updateActiveTileButton(); // Update button states
            this.render();
        } else {
            console.log("No tile found with the specified tag:", tag);
            ui.notifications.error(`No tile found with tag: ${tag}`);
        }
    }

    // Search for image by query
    performImageSearch(query) {
        const lowerCaseQuery = query.toLowerCase();
        const results = this.imagePaths.filter(image =>
            image.displayImg.toLowerCase().includes(lowerCaseQuery) ||
                image.tags.some(tag => tag.toLowerCase().includes(lowerCaseQuery))
        );
        console.log('Search results:', results); // Debugging log
        this.displaySearchResults(results);
    }

    // Display search results
    displaySearchResults(results) {
        const imageSize = game.settings.get('totm-manager', 'imageSize'); // Get the user-defined image size
        const resultsContainer = document.getElementById('search-results');
        resultsContainer.innerHTML = ''; // Clear previous results

        results.forEach((image, index) => {
            const imageElement = document.createElement('img');
            imageElement.src = image.img;
            imageElement.alt = image.displayImg;
            imageElement.style.width = `${imageSize}px`; // Set the desired width based on user setting
            imageElement.style.height = 'auto'; // Maintain aspect ratio
            imageElement.style.cursor = 'pointer'; // Change cursor to indicate clickability
            imageElement.addEventListener('click', () => this.activateImage(image, index));
            resultsContainer.appendChild(imageElement);
        });
    }

    // Activate searched image
    activateImage(image, index) {
        if (!this.currentTile) {
            console.error("No currently active tile.");
            ui.notifications.error("Error setting image. No tile is currently active.");
            return;
        }

        this.currentTile.document.update({ 'texture.src': image.img })
            .then(() => {
                this.currentTile.document.setFlag('core', 'imgIndex', index);
                this.applyGlowEffect(this.currentTile, index); // Apply glow effect or other effects as needed
                ui.notifications.info(`Image ${image.displayImg} activated.`);
            })
            .catch(error => {
                console.error("Error activating image:", error);
                ui.notifications.error("Failed to activate image.");
            });
    }

    // Focus searcfield
    focusSearchField() {
        setTimeout(() => {
            const searchField = this.element.find('#image-search-bar')[0];
            if (searchField) searchField.focus();
        }, 0);
    }

    // Activate specific tile image
    activateTile(tile) {
        if (!tile) {
            this.currentTile = null;
            this.currentActiveTag = ''; // Reset active tag
            console.log("No tile is currently active.");
            this.render(true);
            return;
        }

        try {
            canvas.tiles.releaseAll();
            tile.control({ releaseOthers: true });
            console.log(`Activated tile with ID: ${tile.id}`);

            this.currentTile = tile;
            this.loadTileImages(tile);

            // Set the current active tag
            const tags = Tagger.getTags(tile);

            // Assuming 'scene', 'speaker1', and 'speaker2' are the only tags used
            if (tags.includes('scene')) {
                this.currentActiveTag = 'scene';
            } else if (tags.includes('speaker1')) {
                this.currentActiveTag = 'speaker1';
            } else if (tags.includes('speaker2')) {
                this.currentActiveTag = 'speaker2';
            } else {
                this.currentActiveTag = ''; // No relevant tag found
            }
            console.log("Current active tag set to:", this.currentActiveTag);

            this.render(true);  // Re-render to update UI with new image paths and button colors

            // Detach previous and re-attach event handlers to ensure they apply to the new tile
            $('.prev-image').off('click').click(() => this.cycleImages(tile, 'prev'));
            $('.next-image').off('click').click(() => this.cycleImages(tile, 'next'));
            console.log("Image cycling event listeners re-attached for the current tile.");
        } catch (error) {
            console.error("Error controlling tile:", error);
            ui.notifications.error("Failed to activate tile.");
        }
    }

    async setImageByIndex(index) {
        if (!this.validateIndex(index)) return; // Validation step
        const selectedImage = this.imagePaths[index];

        if (!this.currentTile) {
            console.error("No currently active tile.");
            ui.notifications.error("Error setting image. No tile is currently active.");
            return;
        }

        try {
            await this.updateTileImage(selectedImage, index);
            this.updateActiveImageButton();  // Updating the button immediately after the image is set

        } catch (error) {
            console.error("Failed to set image by index:", error);
            ui.notifications.error("Error setting image. See console for details.");
        }
    }

    // Validates the index and logs appropriate errors
    validateIndex(index) {
        if (index < 0 || index >= this.imagePaths.length) {
            console.error("Index out of bounds when trying to set image by index:", index);
            ui.notifications.error("Index out of bounds");
            return false;
        }
        return true;
    }

    // Updates the tile image and applies effects
    async updateTileImage(imageObj, index) {
        try {
            await this.currentTile.document.update({'texture.src': imageObj.img});
            await this.currentTile.document.setFlag('core', 'imgIndex', index);
            await this.applyGlowEffect(this.currentTile, index);
            // Use imageObj which contains the necessary tag data
            const imageTags = imageObj.tags || [];
            await this.toggleFeaturesBasedOnTags(imageTags);
            console.log("Image set to index:", index, "Image:", imageObj.img);
        } catch (error) {
            console.error("Error updating tile image:", error);
            throw error; // Rethrow or handle error as needed
        }
    }


    // Show active button for image & tile

    updateActiveTileButton() {
        // Ensure a current tile and its document are available
        if (!this.currentTile || !this.currentTile.document) {
            console.warn("No currently active tile or missing document property.");
            return; // Exit the function to prevent further errors
        }

        // Remove the active class from all control buttons
        $('.btnSpeaker1, .btnSpeaker2, .btnScene').removeClass('active-button');

        // Dynamically add the active class based on the current active tag
        if (this.currentActiveTag) {
            const normalizedTag = this.currentActiveTag.charAt(0).toUpperCase() + this.currentActiveTag.slice(1);
            const selector = `.btn${normalizedTag}`;
            $(selector).addClass('active-button');
            console.log(`Active class added to ${selector}`);
        }

        // Manage the active state of image buttons related to the current tile
        const imageIndex = this.currentTile.document.getFlag('core', 'imgIndex') || 0;
        const imageButtonSelector = `.set-image-button[data-index="${imageIndex}"]`;
        this.activeImageButton = this.element.find(imageButtonSelector);
        if (this.activeImageButton.length) {
            this.activeImageButton.addClass('active-button');
            console.log(`Active image button updated: ${imageButtonSelector}`);
        } else {
            console.error("Image button not found:", imageButtonSelector);
        }
    }

    updateActiveImageButton() {
        if (!this.currentTile || !this.currentTile.document) {
            console.warn("Attempted to update image button with no active tile or missing document.");
            return;
        }

        const imagePaths = this.currentTile.document.getFlag('core', 'imagePaths');
        if (!imagePaths || imagePaths.length === 0) {
            console.error("No image paths available for the current tile:", this.currentTile.id);
            return; // Early exit if no images are available to handle
        }

        const imageIndex = this.currentTile.document.getFlag('core', 'imgIndex');
        if (imageIndex === undefined || imageIndex < 0 || imageIndex >= imagePaths.length) {
            console.warn(`Image index is out of bounds or undefined: ${imageIndex}`);
            return; // Exit if the index is out of valid range
        }

        const imageButtonSelector = `.set-image-button[data-index="${imageIndex}"]`;
        const activeImageButton = this.element.find(imageButtonSelector);

        this.element.find('.set-image-button').removeClass('active-button');
        if (activeImageButton.length) {
            activeImageButton.addClass('active-button');
            console.log(`Active image button found and activated: ${imageButtonSelector}`);
            console.log(`Active image button marked: Index ${imageIndex}`);
        } else {
            console.warn("No image button found for index:", imageIndex);
        }
    }

    // Activate Features for Tiles
    async toggleFeaturesBasedOnTags(imageTags) {
        const playlists = game.playlists.contents;
        const scene = game.scenes.active;

        // Process each light in the scene
        // Exit the function if the 'sceneLighting' tag is not in the image tags
        if (!imageTags.includes('sceneLighting')) {
            return; // Do nothing as the image does not contain the 'sceneLighting' tag
        }

        // Process each light in the scene
        for (let light of scene.lights.contents) {
            const lightTags = await Tagger.getTags(light);

            // Only process lights that also have the 'sceneLighting' tag
            if (lightTags.includes('sceneLighting')) {
                // Determine if the light should be on
                // A light should be on if there is any matching tag between the image tags and the light tags,
                // excluding the 'sceneLighting' tag itself.
                const lightShouldBeOn = imageTags.some(tag => tag !== 'sceneLighting' && lightTags.includes(tag));

                // Update the light visibility
                // Turn the light on if there's a match, off if not.
                await light.update({ hidden: !lightShouldBeOn });
            }
        }

        // Handle Sounds in Playlists TODO: fix sounds playing on other images
        for (let playlist of playlists) {
            for (let tag of imageTags) {
                if (tag.startsWith("play-")) {
                    const playlistId = tag.substring(5); // Extract the ID part after 'play-'
                    if (playlistId === playlist.id) {
                        console.log("Checking playlist:", playlist.name);
                        try {
                            // Stop any currently playing sound
                            const currentlyPlayingSound = playlist.sounds.find(s => s.playing);
                            if (currentlyPlayingSound) {
                                await playlist.stopSound(currentlyPlayingSound);
                                console.log("Stopped sound in playlist:", playlist.name);
                            }

                            // Play the first available sound
                            const soundToPlay = playlist.sounds.find(s => !s.playing);
                            if (soundToPlay) {
                                await playlist.playSound(soundToPlay);
                                console.log("Playing sound in playlist:", playlist.name);
                            }
                        } catch (error) {
                            console.error("Error controlling sound in playlist:", playlist.name, error);
                        }
                    }
                }
            }
        }

        // Execute Macros
        for (let macro of game.macros.contents) {
            for (let tag of imageTags) {
                if (tag.startsWith("macro-")) {
                    const macroId = tag.substring(6); // Extract the ID part after 'macro-'
                    if (macroId === macro.id) {
                        macro.execute();
                    }
                }
            }
        }
    }


    getData() {
        const paths = this.imagePaths.map(path => ({
            img: path.img,  // Full path to the image
            displayImg: path.displayImg,  // The filename extracted for display
            tags: Array.isArray(path.tags) ? path.tags.join(', ') : '',
            color: path.color || '#000000'  // Default color or the one from the path
        }));

        return {
            paths: paths,
            isEmpty: paths.length === 0
        };
    }

    //// Event Handling Methods

    reorderPaths(origin, target) {
        if (origin === undefined || target === undefined) return;
        const item = this.imagePaths.splice(origin, 1)[0];
        this.imagePaths.splice(target, 0, item);
        this.render();
    }

    triggerFilePicker(html) {
        new FilePicker({
            type: "image",
            current: "",
            callback: path => {
                this.addPath(html, path); // Directly add the path after it's selected
                this.render(true); // Re-render after adding the path
            }
        }).browse();
    }

    addNewDirectory(html) {
        let filePicker = new FilePicker({
            type: "folder",
            callback: async (folderPath) => {
                try {
                    let response = await FilePicker.browse("data", folderPath);
                    if (response.target && response.files.length) {
                        let newImagePaths = response.files.filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.webp'));
                        // Transform new paths to match your data structure
                        let newPathsObjects = newImagePaths.map(path => ({
                            img: path,
                            displayImg: path.split('/').pop(), // Extract filename for display
                            tags: [] }));
                        let currentPaths = await this.currentTile.document.getFlag('core', 'imagePaths') || [];

                        // Combine and remove duplicates
                        let combinedPaths = [...currentPaths, ...newPathsObjects];
                        let uniquePaths = combinedPaths.reduce((acc, current) => {
                            if (!acc.some(item => item.img === current.img)) {
                                acc.push(current);
                            }
                            return acc;
                        }, []);

                        await this.currentTile.document.setFlag('core', 'imagePaths', uniquePaths);
                        console.log("Saved image paths:", uniquePaths);
                        ui.notifications.info("Image paths have been saved to the tile!");

                        this.imagePaths = uniquePaths; // Update local state
                        this.render(true); // Call render to update the UI
                    } else {
                        ui.notifications.error("No images found in the selected directory.");
                    }
                } catch (error) {
                    console.error("Error loading directory content:", error);
                    ui.notifications.error("Failed to load directory content.");
                }
            },
            title: "Select a Directory"
        });
        filePicker.browse();
    }

    addPath(html, path, color = '') {  // Allow passing a color, default to empty string
        if (!path || typeof path !== 'string') {
            console.error("Invalid path provided");
            return;
        }

        const newPath = {
            img: path,
            displayImg: path.split('/').pop(), // Extract the filename for display
            tags: [],
            color: color // Set color if provided, otherwise it will be an empty string
        };

        this.imagePaths.push(newPath);
        this.render(true); // Update state and re-render UI
    }

    // Call this function when needing to save changes or after modifying paths

    convertTagsAndSave(inputString) {
        // Split the input string by commas and trim spaces
        let tagsArray = inputString ? inputString.split(',').map(tag => tag.trim()) : [];
        this.imagePaths.forEach(path => {
            path.tags = tagsArray;
        });
        this.savePaths();
    }

    // Function to save paths with tags and colors as an array
    async savePaths() {
        if (!this.currentTile || !this.currentTile.document) {
            console.error("No active tile or its document is undefined, cannot save paths.");
            ui.notifications.error("Error accessing tile data.");
            return;
        }

        // Prepare paths for saving, ensuring that existing color settings are not overwritten unintentionally
        const existingPaths = await this.currentTile.document.getFlag('core', 'imagePaths') || [];
        const pathsToSave = this.imagePaths.map((path, index) => {
            return {
                img: path.img,
                displayImg: path.displayImg,
                tags: path.tags,
                color: path.color || existingPaths[index]?.color // Preserve existing color if new one isn't set
            };
        });

        try {
            await this.currentTile.document.setFlag('core', 'imagePaths', pathsToSave);

            // Ensure the current image index is within the new array bounds
            const currentImgIndex = await this.currentTile.document.getFlag('core', 'imgIndex') || 0;
            if (currentImgIndex >= pathsToSave.length) {
                const newIndex = pathsToSave.length > 0 ? pathsToSave.length - 1 : 0;
                await this.currentTile.document.setFlag('core', 'imgIndex', newIndex);
            } else {
                await this.currentTile.document.setFlag('core', 'imgIndex', currentImgIndex);
            }

            ui.notifications.info("Image paths, tags, and colors saved successfully.");
        } catch (err) {
            console.error("Failed to save image paths and tags:", err);
            ui.notifications.error("Failed to save image paths and tags.");
        }
    }

    // Delete one image
    deletePath(event) {
        const index = $(event.currentTarget).data('index');
        this.imagePaths.splice(index, 1);
        this.render(false);
    }

    // Delete all images
    deleteAllPaths() {
        this.imagePaths = []; // Clear the imagePaths array
        this.savePaths(); // Save the empty array to the tile flag

        // Update the tile document with a blank texture source
        this.currentTile.document.update({'texture.src': null})
            .then(() => ui.notifications.info("Tile reset successfully."))
            .catch(err => console.error("Failed to reset tile:", err));
        this.render(); // Update the UI to reflect the changes
    }
}
