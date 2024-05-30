// scripts/totmManager.js
import { generateTileFields, loadTileData, saveTileData, updateStageButtons, switchToTileByTag, loadTileImages, initializeTiles } from './tiles.js';
import { addImageToTile, addDirectoryToTile, setActiveImage, updateImageTags, cycleImages, updateActiveImageButton } from './images.js';
import { activateGeneralListeners, activatePathManagementListeners, activateImageSearchBarListeners, activateImagePreviewListeners, activateEffectEventListeners, onTargetChange } from './listeners.js';
import { populateEffectsDropdown, updateCurrentEffects } from './effects.js'; // Import the function


export class TotMForm extends FormApplication {
    constructor(...args) {
        super(...args);
        this.currentActiveTag = null; // Initialize active tag property
        this.selectedTarget = 'tile'; // Default to 'tile' or any other desired default
        this.isInitialized = false;  // Flag for header tile button setup

    }

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

    getData() {
        return {
            tiles: this.tiles || [],
            currentTileIndex: this.currentTileIndex || 0,
            paths: this.currentTile ? this.currentTile.document.getFlag('core', 'imagePaths') : [],
            imgIndex: this.currentTile ? this.currentTile.document.getFlag('core', 'imgIndex') : 0
        };
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

    async _render(force, options = {}) {
        await super._render(force, options);
        this._initializeTabs();

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

        // Ensure the current tile is set and update current effects
        if (this.currentTile) {
            updateCurrentEffects(this.currentTile); // Update current effects on render
        } else {
            console.warn("No current tile selected.");
        }

        // Initialize tiles only once (HACK)
        // There is probably a better way to do this...
        if (!this.isInitialized) {
            await initializeTiles(this);
            this.isInitialized = true; // Mark as initialized
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

    //FIXME -- this doesn't seem to be firing correctly
    async _onChangeTab(event, tabName) {
        console.log("Tab changed to:", tabName); // Add this log
        if (tabName === "stage") {
            loadTileImages(this, this.currentTile);
        } else if (tabName === "tiles") {
            loadTileData(this);
        } else if (tabName === "Effects") {
            console.log("Effects tab selected, populating dropdown...");
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

    setActiveTile(tileName) {
        const tile = this.tiles.find(t => t.name === tileName);
        if (tile) {
            this.currentTile = tile;
            loadTileImages(this, tile);
            this.render(true);
        } else {
            console.error(`No tile found with the name: ${tileName}`);
        }
    }
}


