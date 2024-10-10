import { adjustColor, decimalToHex, hexToDecimal } from './utilities.js';
import { updateEffectsUI, addEffect  } from './effects.js';


export class ModifyEffectForm extends FormApplication {
    constructor(data, options) {
        super(data, options);
        this.data = data;
        this.effectParams = TokenMagic.getPreset(this.data.effect) || {};
        console.log("Effect Parameters:", this.effectParams); // Log the parameters to debug
    }

    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        title: "Modify Effect",
        template: "modules/totm-manager/templates/modify-effect-window.hbs",
        width: 350,
        height: 500,
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

    const colorPicker = html.find('input[type="color"]')[0];
    const numericalColorInput = html.find('input[name="numericalColor"]');
    const animatedColorVal1Input = html.find('input[name="animatedColorVal1"]');
    const animatedColorVal2Input = html.find('input[name="animatedColorVal2"]');

    // Initialize the color picker with the current color
    if (this.effectParams.color) {
      const initialColor = decimalToHex(this.effectParams.color);
      colorPicker.value = initialColor;
    } else {
      colorPicker.value = '#ffffff'; // Default to white if no color is set
    }

    // Add event listener for color picker change
    colorPicker.addEventListener('change', (ev) => {
      const color = ev.target.value; // Get the hex color value as a string
      const numericalColor = hexToDecimal(color); // Convert hex string to decimal number
      const lighterColor = adjustColor(color, 40);
      const darkerColor =  adjustColor(color, -40);

      // Update the fields with the numerical color
      numericalColorInput.val(numericalColor);
      animatedColorVal1Input.val(lighterColor);
      animatedColorVal2Input.val(darkerColor);

      console.log("Color selected:", numericalColor);
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

  initializeColorPicker(colorPicker, initialColor) {
    colorPicker.value = initialColor;
    // Optionally, trigger the change event to update the JSON structure initially
    const event = new Event('change');
    colorPicker.dispatchEvent(event);
  }

  async _updateObject(event, formData) {
    if (!game.user.isGM) {
      console.log("User is not GM. Skipping _updateObject.");
      return;
    }
    console.log("Form submission data:", formData);

    try {
      // Parse effect parameters from the form data
      const effectParams = JSON.parse(formData.effectParams);
      console.log("Parsed effect parameters:", effectParams);

      const targetType = this.data.target;
      const instance = this.data.instance;
      const effectName = this.data.effect;
      const tileId = document.getElementById('tile-dropdown').value;

      if (targetType === 'tile' || targetType === 'image' || targetType === 'transitions') {
        const imageId = targetType === 'image' ? document.getElementById('image-dropdown').value : null;
        await addEffect(instance, targetType, effectName, effectParams, tileId, imageId);

        // Update current effects list
        const tile = canvas.tiles.get(tileId);
        await updateEffectsUI(instance, tile); // Ensure this is awaited
        instance.render(true);
      } else {
        console.error("Invalid target type.");
      }

      this.close();
    } catch (error) {
      console.error("Error parsing or applying effect parameters:", error);
    }
  }
}
