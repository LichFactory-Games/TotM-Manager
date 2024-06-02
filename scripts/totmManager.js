// scripts/totmManager.js
import { assignOrderToTiles } from './utilities.js'
import { generateTileFields, saveTileData, handleSaveAndRender } from './tiles.js';
import { loadTileData, updateStageButtons, switchToTileByTag, loadTileImages, updateTileFields } from './tiles-utils.js'
import { addImageToTile, addDirectoryToTile, setActiveImage, updateImageTags, cycleImages, updateActiveImageButton } from './images.js';
import { activateGeneralListeners, activatePathManagementListeners, activateImageSearchBarListeners, activateImagePreviewListeners, activateEffectEventListeners, onTargetChange } from './listeners.js';
import { populateEffectsDropdown, updateCurrentEffects } from './effects.js';  


export class TotMForm extends FormApplication {
  constructor(...args) {
    super(...args);
    this.currentActiveTag = null; // Initialize active tag property
    this.selectedTarget = 'tile'; // Default to 'tile' or any other desired default
    this.isInitialized = false;  // Flag for header tile button setup
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

  // Optionally, override the close method to reset the singleton instance
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

  getData(options) {
    return {
      // Ensure tiles are sorted by the 'order' property
      tiles: this.tiles ? this.tiles.sort((a, b) => a.order - b.order) : [],
      // Return the current tile index, which should match the 'order' if that's how tiles are identified
      currentTileIndex: this.currentTileIndex || 0,
      // Retrieve the 'imagePaths' flag for the current tile
      paths: this.currentTile ? this.currentTile.document.getFlag('core', 'imagePaths') : [],
      // Retrieve the 'imgIndex' flag for the current tile
      imgIndex: this.currentTile ? this.currentTile.document.getFlag('core', 'imgIndex') : 0
    };
  }

  async _updateObject(event, formData) {
    // Handle form submission and updating objects
    console.log("Form submission data:", formData);
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


  // Ensure the render method properly uses the data
async render(force = false, options = {}) {
    super.render(force, options);
          this._initializeTabs();

        // After rendering, load data and update the UI
      setTimeout(() => this._postRender(), 100);

  }
    // console.log("Rendered MyForm with data:", this.tiles);

      // loadTileData(this);

      // // Populate dropdown on render
      // await populateEffectsDropdown();

      // // Set the target dropdown to the last selected target
      // const targetDropdown = document.getElementById('target-dropdown');
      // if (this.selectedTarget) {
      //     targetDropdown.value = this.selectedTarget;
      // }

      // // Trigger onTargetChange for the initial target value
      // const initialTarget = document.getElementById('target-dropdown').value;
      // onTargetChange({ target: { value: initialTarget } }, this);

      // // Ensure the current tile is set and update current effects
      // if (this.currentTile) {
      //     updateCurrentEffects(this.currentTile); // Update current effects on render
      // } else {
      //     console.warn("No current tile selected.");
      // }

      // // Initialize tiles only once (HACK)
      // // // There is probably a better way to do this...
      // if (!this.isInitialized) {
      //     await initializeTiles(this);
      //     this.isInitialized = true; // Mark as initialized
      // }

// Custom post-render method
  async _postRender() {
    assignOrderToTiles();
    
    console.log("Loading tile data...");
    await loadTileData(this);

    console.log("Updating stage buttons...");
    updateStageButtons(this);

    console.log("Updating tile fields...");
    updateTileFields(this);

    console.log("Rendering completed.");
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
