// scripts/modifyEffectForm.js

export class ModifyEffectForm extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      title: "Modify Effect",
      template: "modules/totm-manager/templates/modify-effect-window.hbs",
      width: 300,
      height: 300,
      resizable: true,
    });
  }

  getData(options) {
    return {
      // Your data here, e.g., effect data
    };
  }

  async _updateObject(event, formData) {
    // Handle form submission and updating effect objects
    console.log("Modify Effect Form submission data:", formData);
  }

  activateListeners(html) {
    super.activateListeners(html);
    // Additional listeners if needed
  }
}
