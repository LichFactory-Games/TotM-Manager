import { applyTokenMagicEffect, updateEffects, updateCurrentEffects, removeTokenMagicEffect } from './effects.js';
import { getImageById } from './images.js';

export class ModifyEffectForm extends FormApplication {
    constructor(data, options) {
        super(data, options);
        this.data = data;
        this.effectParams = TokenMagic.getPreset(this.data.effect) || {};
        console.log("Effect Parameters:", this.effectParams); // Log the parameters to debug
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: "Modify Effect",
            template: "modules/totm-manager/templates/modify-effect-window.hbs",
            width: 400,
            height: 600,
            resizable: true,
        });
    }

    getData(options) {
        // Prepare data for the template
        const effectParams = this.effectParams;

        console.log("Data passed to template:", { effectParams: effectParams }); // Log the data to debug

        return {
            effectParams: JSON.stringify(effectParams, null, 2) // Pretty-print JSON for display
        };
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Add event listener for color picker change
        html.find('input[type="color"]').change(ev => {
            const color = ev.target.value;
            const numericalColor = parseInt(color.slice(1), 16);
            html.find('input[name="numericalColor"]').val(numericalColor);
        });

        // Add event listener for form submission
        html.find('form').submit(ev => {
            ev.preventDefault();
            const formData = new FormData(ev.target);
            const effectParams = JSON.parse(formData.get('effectParams'));
            effectParams.color = parseInt(formData.get('numericalColor'));
            this._updateObject(ev, { effectParams: JSON.stringify(effectParams) });
        });
    }

    async _updateObject(event, formData) {
        console.log("Form submission data:", formData);

        try {
            const effectParams = JSON.parse(formData.effectParams);
            console.log("Parsed effect parameters:", effectParams);

            const target = this.data.target;
            const instance = this.data.instance;

            if (target === 'tile') {
                const tileId = document.getElementById('tile-dropdown').value;
                const tile = canvas.tiles.get(tileId);
                if (tile) {
                    await applyTokenMagicEffect(tile, effectParams);

                    // Add effect to tile's flag
                    await updateEffects(tile, effectParams, true);

                    // Update current effects list
                    updateCurrentEffects(tile);
                } else {
                    console.error("No tile found to apply effect.");
                }
            } else if (target === 'image') {
                const imageId = document.getElementById('image-dropdown').value;
                const image = getImageById(instance, imageId);
                if (image && instance.currentTile) {
                    await applyTokenMagicEffect(image, effectParams, false);

                    // Add effect to image's flag
                    await updateEffects(image, effectParams, true, false);

                    // Update current effects list
                    updateCurrentEffects(instance.currentTile);
                } else {
                    console.error("No image found to apply effect or no tile selected.");
                }
            }

            this.close();
        } catch (error) {
            console.error("Error parsing or applying effect parameters:", error);
        }
    }
}
