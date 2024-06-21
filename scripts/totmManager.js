// scripts/totmManager.js
import { NAMESPACE, logMessage, updateTileButtons, findAndSwitchToTileByTag, activateTile, updateActiveTileButton, populateEffectsDropdown } from './utilities.js';
import { loadTileData, loadTileImages, updateTileFields } from './tiles-utils.js'
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

  // Override the render method to implement the singleton pattern
  static renderSingleton() {
    if (!this._instance) {
      this._instance = new this();
    }

    if (this._instance.element.is(':visible')) {
      this._instance.element.hide();
    } else {
      this._instance.currentTile = canvas.tiles.controlled[0] || this._instance.currentTile; // Ensure current tile is set on reopening
      this._instance.render(true);
    }
  }

  // Override the close method to hide the window instead of closing it
  close(options = {}) {
    console.log("Hiding TotM Manager window");
    this.element.hide();
    // Remove the line that sets the rendered state
    return super.close(options);
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
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

  async _initializeTileManager() {
    logMessage("Initializing Tile Manager...");

    logMessage("Loading tile data...");
    await loadTileData(this);
    logMessage("Tile data loaded:", this.tiles);

    // Retrieve the initial tile tag from settings
    const initialTag = game.settings.get(NAMESPACE, 'initialTileTag');
    logMessage("Initial tile tag retrieved from settings:", initialTag);

    let initialTile = null;

    // Check if the initial tag is not null or empty
    if (initialTag) {
      // Find the tile by tag using Tagger
      initialTile = findAndSwitchToTileByTag(this, initialTag, false);
      logMessage("Tile found with initial tag:", initialTile);
    }

    // Fallback to the first tile with any name flag if no tile found by tag
    if (!initialTag) {
      // Ensure there are tiles on the canvas
      if (canvas.tiles.placeables.length > 0) {

        // Activate the tiles layer
        canvas.tiles.activate();

        // Select the first tile
        let firstTile = canvas.tiles.placeables[0];
        let result = firstTile.control();

        if (result) {
          const tileName = await firstTile.document.getFlag(NAMESPACE, 'tileName'); // Await if getFlag is async
          logMessage(`Selected the first tile with ID: ${firstTile.id} and name: ${tileName}`);
          initialTile = firstTile;
          logMessage(`Fallback: Set current tile to tilename: ${tileName} and ID ${initialTile.id}`);
        } else {
          logMessage("Fallback: No tile found with any name flag.");
        }
      } else {
        logMessage("No tiles found on the canvas.");
      }
    }

    // Check and activate the initial tile
    if (initialTile) {
      logMessage("Activating initial tile:", initialTile);
      activateTile(this, initialTile);
      this.currentTile = initialTile; // Set the current tile
      await loadTileImages(this, initialTile); // Ensure 'initialTile' is passed correctly
      logMessage('*Load tile images for initial tile.');
    } else {
      console.warn("No tile found to set as current tile.");
    }

    // Update buttons & fields
    logMessage("Updating tile buttons...");
    updateTileButtons(this);

    logMessage("Updating tile fields...");
    updateTileFields(this);

    await new Promise(requestAnimationFrame);
    await updateActiveTileButton(this);
    logMessage('*Update active tile button.');

    if (this.currentTile) {
      const imgIndex = await this.currentTile.document.getFlag(NAMESPACE, 'imgIndex');
      if (imgIndex !== undefined && imgIndex >= 0) {
        this.currentImageIndex = imgIndex;
        await updateActiveImageButton(this, imgIndex);
        logMessage('*Update active image button.');
      }
    }

    logMessage("Initialization completed.");
  }

  async _initializeEffectsManager(tile) {

    logMessage("Initializing Effects Manager...");

    // Populate dropdown on render
    await populateEffectsDropdown();

    // Set the target dropdown to the last selected target
    const targetDropdown = document.getElementById('target-dropdown');
    if (this.selectedTarget) {
      targetDropdown.value = this.selectedTarget;
    }

    // Trigger onTargetChange for the initial target value
    const initialTarget = document.getElementById('target-dropdown').value;
    onTargetChange({ target: { value: initialTarget } }, this);

    // Ensure the current tile is set and update effects UI
    if (this.currentTile) {
      const imagePaths = await this.currentTile.document.getFlag(NAMESPACE, 'imagePaths');
      logMessage(`Current image paths for tile ${this.currentTile.id}:`, imagePaths);
      if (!imagePaths) {
        console.warn(`No image paths found for tile ${this.currentTile.id}`);
      }
      updateEffectsUI(this);
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
}
