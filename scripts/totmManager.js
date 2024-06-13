// scripts/totmManager.js
import { NAMESPACE, logMessage, updateTileButtons, findAndSwitchToTileByTag, activateTile } from './utilities.js';
import { loadTileData, loadTileImages, updateTileFields } from './tiles-utils.js'
import { activateGeneralListeners, activatePathManagementListeners, activateImageSearchBarListeners, activateImagePreviewListeners, activateEffectEventListeners } from './listeners.js';
import { populateEffectsDropdown, updateEffectsUI, onTargetChange } from './effects.js';


export class TotMForm extends FormApplication {
  constructor(...args) {
    super(...args);
    this.currentActiveTag = null; // Initialize active tag property
    this.selectedTarget = 'tile'; // Default to 'tile' or any other desired default
    this.isInitialized = false;  // Flag for header tile button setup
    this.tileManagerInitialized = false; // Flag to prevent re-initialization
    this.tiles = [];  // Initialize tiles array
  }

  //// Make a singleton instance so only one totm window can be open at a time
  // Add a static property to hold the singleton instance
  static _instance = null;

  // Override the render method to implement the singleton pattern
  static renderSingleton() {
    if (!this._instance) {
      this._instance = new this();
    }
    this._instance.render(true);
  }

  // Override the close method to reset the singleton instance
  close(options) {
    this.constructor._instance = null;
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
    const tile = options.tile;
    // Check if this is the first time rendering
    if (!this.rendered && !this.tileManagerInitialized) {
      logMessage("First-time render: Initializing tile manager.");
      // Initialize tile manager
      this.tileManagerInitialized = true; // Set the flag to prevent re-initialization
      await this._initializeTileManager(); // Ensure this completes before proceeding
    }
    // Call the parent class's render method
    await super.render(force, options);
    // Initialize tabs
    logMessage("Initializing tabs");
    this._initializeTabs();
    // Initialize effects manager after a short delay
    setTimeout(() => {
      this._initializeEffectsManager();
    }, 100);
  }

  async _initializeTileManager() {
    logMessage("Initializing Tile Manager...");
    logMessage("Loading tile data...");
    await loadTileData(this);
    logMessage("Tile data loaded:", this.tiles);
    // Retrieve the initial tile tag from settings
    const initialTag = game.settings.get(NAMESPACE, 'initialTileTag');
    logMessage("Initial tile tag retrieved from settings:", initialTag);
    // Find the tile by tag using Tagger
    let initialTile = findAndSwitchToTileByTag(this, initialTag, false);
    logMessage("Tile found with initial tag:", initialTile);
    // If no tile is found with the specific tag, fallback to the first tile
    if (!initialTile && this.tiles.length > 0) {
      initialTile = this.tiles[0];
      logMessage(`Fallback: Set current tile to first tile with ID ${initialTile.id}`);
    }
    // Check and activate the initial tile
    if (initialTile) {
      logMessage("Activating initial tile:", initialTile);
      activateTile(this, initialTile);
      await loadTileImages(this, initialTile); // Ensure 'initialTile' is passed correctly
    } else {
      console.warn("No tile found to set as current tile.");
    }
    logMessage("Updating tile buttons...");
    updateTileButtons(this);
    logMessage("Updating tile fields...");
    updateTileFields(this);
    logMessage("Initialization completed.");
  }

  async _initializeEffectsManager() {

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
      updateEffectsUI(this.currentTile);
    } else {
      console.warn("No current tile selected.");
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
