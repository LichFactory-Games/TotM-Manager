import { applyTokenMagicEffect, updateEffects, updateCurrentEffects, removeTokenMagicEffect, addEffect, removeEffect } from './effects.js';
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

    const targetType = this.data.target;
    const instance = this.data.instance;
    const effectName = this.data.effect;
    const tileId = document.getElementById('tile-dropdown').value;

    if (targetType === 'tile' || targetType === 'image') {
      const imageId = targetType === 'image' ? document.getElementById('image-dropdown').value : null;
      await addEffect(instance, targetType, effectName, effectParams, tileId, imageId);

      // Update current effects list
      const tile = canvas.tiles.get(tileId);
      updateCurrentEffects(tile);
    } else {
      console.error("Invalid target type.");
    }

    this.close();
  } catch (error) {
    console.error("Error parsing or applying effect parameters:", error);
  }
}


}
