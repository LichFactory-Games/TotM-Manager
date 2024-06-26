// scripts/setup.js
import { NAMESPACE } from './utilities.js';

export async function setupModule() {
    console.log("Theatre of the Mind Manager | Setup module");

    const templates = [
        "modules/totm-manager/templates/totmm-window.hbs",
        "modules/totm-manager/templates/partials/header.hbs",
        "modules/totm-manager/templates/partials/stage.hbs",
        "modules/totm-manager/templates/partials/tiles.hbs",
        "modules/totm-manager/templates/partials/effects.hbs",
        "modules/totm-manager/templates/partials/footer.hbs"
    ];

    try {
        // Load all templates
        await loadTemplates(templates);

        // Explicitly register partials
        const [header, stage, tiles, effects, footer] = await Promise.all([
            getTemplate("modules/totm-manager/templates/partials/header.hbs"),
            getTemplate("modules/totm-manager/templates/partials/stage.hbs"),
            getTemplate("modules/totm-manager/templates/partials/tiles.hbs"),
            getTemplate("modules/totm-manager/templates/partials/effects.hbs"),
            getTemplate("modules/totm-manager/templates/partials/footer.hbs")
        ]);

        Handlebars.registerPartial('header', header);
        Handlebars.registerPartial('stage', stage);
        Handlebars.registerPartial('tiles', tiles);
        Handlebars.registerPartial('effects', effects);
        Handlebars.registerPartial('footer', footer);

        console.log('Templates loaded successfully.');
    } catch (error) {
        console.error('Error loading templates:', error);
    }
}


export function openTotMManager() {
    if (!window.totmManagerInstance || !window.totmManagerInstance.rendered) {
        window.totmManagerInstance = new TotMForm();
        window.totmManagerInstance.render(true);
    } else {
        window.totmManagerInstance.bringToTop();
    }
}
