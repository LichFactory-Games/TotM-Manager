// scripts/setup.js
import { NAMESPACE } from './utilities.js';

export async function setupModule() {
    console.log("Theatre of the Mind Manager | Setup module - registering templates");

    // Define all templates that need to be loaded
    const templates = [
        "modules/totm-manager/templates/totmm-window.hbs",
        "modules/totm-manager/templates/partials/header.hbs",
        "modules/totm-manager/templates/partials/stage.hbs", 
        "modules/totm-manager/templates/partials/tiles.hbs",
        "modules/totm-manager/templates/partials/effects.hbs",
        "modules/totm-manager/templates/partials/footer.hbs"
    ];

    try {
        // Load all templates using the v13 API
        await foundry.applications.handlebars.loadTemplates(templates);

        // Register partials for v13 compatibility
        const partialPaths = [
            ["header", "modules/totm-manager/templates/partials/header.hbs"],
            ["stage", "modules/totm-manager/templates/partials/stage.hbs"],
            ["tiles", "modules/totm-manager/templates/partials/tiles.hbs"],
            ["effects", "modules/totm-manager/templates/partials/effects.hbs"],
            ["footer", "modules/totm-manager/templates/partials/footer.hbs"]
        ];

        for (const [name, path] of partialPaths) {
            try {
                const template = await foundry.applications.handlebars.getTemplate(path);
                Handlebars.registerPartial(name, template);
            } catch (error) {
                console.error(`Failed to register partial ${name}:`, error);
            }
        }

        console.log('Templates loaded successfully');
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
