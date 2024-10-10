// scripts/totmManager.js
import { NAMESPACE, logMessage, getElementByIdOrWarn, updateTileButtons, findAndSwitchToTileByTag, activateTile, updateActiveTileButton, populateEffectsDropdown } from './utilities.js';
import { loadTileData, loadTileImages, updateTileFields, openTileConfigForControlledTile } from './tiles-utils.js'
import { activateGeneralListeners, activatePathManagementListeners, activateImageSearchBarListeners, activateImagePreviewListeners, activateEffectEventListeners } from './listeners.js';
import { updateActiveImageButton } from './images.js'
import { updateEffectsUI, onTargetChange } from './effects.js';


export class TotMForm extends FormApplication {
  constructor(...args) {
    super(...args);
    this.currentActiveTag = null; // Initialize active tag property
    this.selectedTarget = 'tile'; // Default to 'tile' or any other desired default
    this.tileManagerInitialized = false; // Flag to prevent re-initialization
    this.tiles = [];  // Initialize tiles array
    this.currentTile = canvas.tiles.controlled[0] || null // Track current tile
    this.currentImageIndex = null // Track current image (if any)
  }

  //// Make a singleton instance so only one totm window can be open at a time
  // Add a static property to hold the singleton instance
  static _instance = null;

  static getInstance() {
    if (!this._instance) {
      this._instance = new this();
    }
    return this._instance;
  }

  static renderSingleton() {
    console.log("TotM Manager: renderSingleton called");
    const instance = this.getInstance();

    // Toggle window
    if (instance._state === Application.RENDER_STATES.RENDERED) {
      console.log("TotM Manager: Closing window");
      instance.close();
    } else {
      console.log("TotM Manager: Opening window");
      instance.updateCurrentTile();
      instance.refreshManagerData();
      instance.render(true);
    }
  }

  updateCurrentTile() {
    if (!canvas.ready) {
      console.warn("Canvas is not ready. Deferring tile update.");
      return;
    }

    // Check if there is a controlled tile or fallback to the first available tile
    const tile = canvas.tiles.controlled[0] || canvas.tiles.placeables[0] || null;

    // Ensure the tile is selected and controlled
    if (tile && !tile.controlled) {
      tile.control();  // Control (select) the tile programmatically
      console.log("TotM Manager: Forcing control of tile", tile.id);
    }

    this.currentTile = tile;
    console.log("TotM Manager: Current tile set to", this.currentTile?.id || "None");
  }


  // updateCurrentTile() {
  //   if (!canvas.ready) {
  //     console.warn("Canvas is not ready. Deferring tile update.");
  //     return;
  //   }

  //   this.currentTile = canvas.tiles.controlled[0] || this.currentTile;
  //   // this.currentTile = canvas.tiles.controlled[0] || canvas.tiles.placeables[0] || null;
  //   console.log("TotM Manager: Current tile set to", this.currentTile?.id || "None");
  // }

  async close(options={}) {
    console.log("TotM Manager: Closing window");
    await super.close(options);
    // Don't set _instance to null, just update the state
    this._state = Application.RENDER_STATES.CLOSED;
    return this;
  }

  async render(force=false, options={}) {
    console.log("TotM Manager: Rendering window");
    if (this._state === Application.RENDER_STATES.CLOSED) {
      this._state = Application.RENDER_STATES.RENDERING;
    }

    return super.render(force, options);
  }


  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "TotM Manager",
      template: "modules/totm-manager/templates/totmm-window.hbs",
      width: 400,
      height: 450,
      resizable: true,
      tabs: [{ navSelector: ".tabs", contentSelector: ".content", initial: "stage" }]
    });
  }

  getData() {
    return {
      // Ensure tiles are sorted by the 'order' property
      tiles: this.tiles ? this.tiles.sort((a, b) => a.order - b.order) : [],
      // Return the current tile index, which should match the 'order' if that's how tiles are identified
      currentTileIndex: this.currentTileIndex || 0,
      // Retrieve the 'imagePaths' flag for the current tile
      paths: this.currentTile ? this.currentTile.document.getFlag(NAMESPACE, 'imagePaths') : [],
      // Retrieve the 'imgIndex' flag for the current tile
      imgIndex: this.currentTile ? this.currentTile.document.getFlag(NAMESPACE, 'imgIndex') : 0
    };
  }

  async _updateObject(formData) {
    // Handle form submission and updating objects
    logMessage("Form submission data:", formData);
  }

  activateListeners(html) {
    super.activateListeners(html);
    this._initializeTabs();

    activateGeneralListeners(this, html);
    activatePathManagementListeners(this, html);
    activateImageSearchBarListeners(this, html);
    activateImagePreviewListeners(this, html);
    activateEffectEventListeners(this);
    // Add event listener for the refresh button
    html.find('#refresh-manager').click(() => {
      this.refreshManagerData(); // Make sure `instance` is correctly referenced
    });
  }

  async render(force = false, options = {}) {
    // Call the parent class's render method
    await super.render(force, options);

    // Initialize tabs
    // Delay initialization until DOM is ready
    logMessage("Initializing tabs");
    await new Promise(requestAnimationFrame);
    this._initializeTabs();

    // Check if this is the first time rendering
    if (!this.rendered && !this.tileManagerInitialized) {
      logMessage("First-time render: Initializing tile manager.");
      // Initialize tile manager
      // Set the flag to prevent re-initialization
      this.tileManagerInitialized = true;
      await new Promise(requestAnimationFrame);
      await this._initializeTileManager();
    }

    // Initialize effects manager
    await new Promise(requestAnimationFrame);
    await this._initializeEffectsManager();

    // Update active buttons
    await this._updateButtons();
  }

  async _loadTileData() {
    logMessage("Loading tile data...");

    if (!canvas.tiles || canvas.tiles.placeables.length === 0) {
      this.clearTileUI();  // Clear the UI if no tiles are found
      logMessage("No tiles found on the canvas. Skipping tile data loading.");
      return false;
    }

    await loadTileData(this);
    logMessage("Tile data loaded:", this.tiles);

    const initialTag = game.settings.get(NAMESPACE, 'initialTileTag');
    logMessage("Initial tile tag retrieved from settings:", initialTag);

    let initialTile = null;
    if (initialTag) {
      initialTile = findAndSwitchToTileByTag(this, initialTag, false);
      logMessage("Tile found with initial tag:", initialTile);
    }

    if (!initialTile && canvas.tiles.placeables.length > 0) {
      initialTile = canvas.tiles.placeables[0];
      const tileName = await initialTile.document.getFlag(NAMESPACE, 'tileName');
      logMessage(`Fallback: Set current tile to tilename: ${tileName} and ID ${initialTile.id}`);
    }

    if (initialTile) {
      this.currentTile = initialTile;
      await loadTileImages(this, initialTile);
      logMessage('Loaded tile images for initial tile.');

      const imgIndex = await this.currentTile.document.getFlag(NAMESPACE, 'imgIndex');
      if (imgIndex !== undefined && imgIndex >= 0) {
        this.currentImageIndex = imgIndex;
      }
    } else {
      console.warn("No tile found to set as current tile.");
    }

    logMessage("Tile data loading completed.");
    return true;
  }

  async _initializeTileManager() {
    logMessage("Initializing Tile Manager...");

    // Delegate the tile data loading to _loadTileData
    const tileDataLoaded = await this._loadTileData();
    if (!tileDataLoaded) {
      logMessage("Tile data not loaded. Skipping further tile manager initialization.");
      return;
    }

    // Ensure the current tile is set after loading tile data
    if (this.currentTile) {
      logMessage("Activating current tile:", this.currentTile);
      activateTile(this, this.currentTile); // Activate the current tile
      await loadTileImages(this, this.currentTile); // Load images for the current tile
      logMessage('*Load tile images for current tile.');
    } else {
      console.warn("No tile found to activate.");
    }

    // Update buttons & fields
    logMessage("Updating tile buttons...");
    updateTileButtons(this);

    logMessage("Updating tile fields...");
    updateTileFields(this);

    await new Promise(requestAnimationFrame);
    await updateActiveTileButton(this);
    logMessage('*Update active tile button.');

    // Update the active image button if an image index is available
    if (this.currentTile) {
      const imgIndex = await this.currentTile.document.getFlag(NAMESPACE, 'imgIndex');
      if (imgIndex !== undefined && imgIndex >= 0) {
        this.currentImageIndex = imgIndex;
        await updateActiveImageButton(this, imgIndex);
        logMessage('*Update active image button.');
      }
    }

    logMessage("Tile initialization completed.");
  }

  async _initializeEffectsManager(tile) {

    logMessage("Initializing Effects Manager...");

    // Populate dropdown on render
    await populateEffectsDropdown();

    // Delay the initialization until the next animation frame to ensure the DOM is ready
    await new Promise(requestAnimationFrame);

    // Set the target dropdown to the last selected target
    const targetDropdown = getElementByIdOrWarn('target-dropdown');
    if (targetDropdown) {
      if (this.selectedTarget) {
        targetDropdown.value = this.selectedTarget;
      }
    }

    // Trigger onTargetChange for the initial target value
    const initialTarget = targetDropdown ? targetDropdown.value : null;
    if (initialTarget) {
      onTargetChange({ target: { value: initialTarget } }, this);
    }

    // Ensure the current tile is set and update effects UI
    if (this.currentTile) {
      const imagePaths = await this.currentTile.document.getFlag(NAMESPACE, 'imagePaths');
      logMessage(`Current image paths for tile ${this.currentTile.id}:`, imagePaths);
      if (!imagePaths) {
        console.warn(`No image paths found for tile ${this.currentTile.id}`);
      }
      updateEffectsUI(this, this.currentTile);
    } else {
      console.warn("No current tile selected.");
    }
    logMessage("Effects Initialization completed.")
  }

  async _updateButtons() {
    // Update the active tile button
    await updateActiveTileButton(this);
    // Update the active image button
    if (this.currentTile) {
      const imgIndex = await this.currentTile.document.getFlag(NAMESPACE, 'imgIndex');
      if (imgIndex !== undefined && imgIndex >= 0) {
        this.currentImageIndex = imgIndex;
        await updateActiveImageButton(this, imgIndex);
      }
    }
  }

  _initializeTabs() {
    if (!this._tabs) {
      this._tabs = new Tabs({
        navSelector: ".tabs",
        contentSelector: ".content",
        initial: "stage",
        callback: this._onChangeTab.bind(this)
      });
      this._tabs.bind(this.element[0]);
    }
  }

  _showTab(tabName) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => {
      content.style.display = content.getAttribute('data-tab') === tabName ? 'block' : 'none';
    });

    // Ensure the current tile is selected when switching tabs
    if (tabName === 'tiles') {
      this.updateCurrentTile();
    }

    this.selectedTarget = tabName;
    this._highlightActiveTab(tabName);
  }

  _highlightActiveTab(tabName) {
    const tabButtons = document.querySelectorAll('.tabs .item');
    tabButtons.forEach(button => {
      if (button.getAttribute('data-tab') === tabName) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  // Refresh manager for scene changes
  async refreshManagerData() {
    logMessage("Refreshing Theatre of the Mind Manager data...");

    // Ensure the current tile is selected when the scene is refreshed
    this.updateCurrentTile();

    // Delay initialization until DOM is ready
    logMessage("Loading Manager Data.");
    await new Promise(requestAnimationFrame);
    await this._loadTileData()

    logMessage("Theatre of the Mind Manager data refresh complete.");
  }

  async clearTileUI() {
    logMessage("Clearing relevant tile-related UI elements...");

    // Reset current tile to ensure no lingering tile from previous scenes
    this.currentTile = null;
    this.currentImageIndex = null; // Also clear image index if necessary

    // Clear tile fields in the 'Tiles' tab
    const tileFieldsContainer = document.querySelector('#tile-fields-container');
    if (tileFieldsContainer) {
      tileFieldsContainer.innerHTML = '';  // Clear the tile fields container
    }

    // Clear the image path list in the 'Stage' tab
    const imagePathList = document.querySelector('#image-path-list');
    if (imagePathList) {
      imagePathList.innerHTML = '';  // Clear the image paths list
    }

    // Clear the stage buttons on **all tabs** (not just the active tab)
    const stageButtonsContainers = document.querySelectorAll('.totm-manager.stage-buttons-container');
    stageButtonsContainers.forEach(container => {
      container.innerHTML = '';  // Clear the buttons on each tab
    });

    // Clear the search bar input in the 'Stage' tab
    const imageSearchBar = document.querySelector('#image-search-bar');
    if (imageSearchBar) {
      imageSearchBar.value = '';  // Clear the search bar input
    }

    // Clear the search results in the 'Stage' tab
    const searchResults = document.querySelector('#search-results');
    if (searchResults) {
      searchResults.innerHTML = '';  // Clear search results
    }

    // Clear the delete image dropdown in the 'Effects' tab
    const deleteImageDropdown = document.querySelector('#delete-image-dropdown');
    if (deleteImageDropdown) {
      deleteImageDropdown.innerHTML = '';  // Clear all options in the delete image drop-down
    }

    // Clear the tile dropdown for visibility in the 'Effects' tab
    const tileDropdown = document.querySelector('#tile-dropdown');
    if (tileDropdown) {
      tileDropdown.innerHTML = '';  // Clear all options in the tile drop-down
    }

    // Clear the delete image preview in the 'Effects' tab
    const deleteImagePreview = document.querySelector('#delete-image-preview');
    if (deleteImagePreview) {
      deleteImagePreview.src = '';  // Clear the image source of the delete preview
      deleteImagePreview.style.display = 'none';  // Hide the image preview
    }

    // Clear the effect dropdown in the 'Effects' tab
    const effectDropdown = document.querySelector('#effect-dropdown');
    if (effectDropdown) {
      effectDropdown.innerHTML = '';  // Clear the options for effect selection
    }

    // Clear the current effects container in the 'Effects' tab
    const currentEffectsContainer = document.querySelector('#current-effects-container');
    if (currentEffectsContainer) {
      currentEffectsContainer.innerHTML = '';  // Clear any current effects listed
    }

    logMessage("Relevant UI cleared in #totm-manager.");
  }


}
