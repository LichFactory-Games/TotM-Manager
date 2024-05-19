// Method to apply glow effects
import { hexToDecimal, adjustColor, findTileByTag} from './utilities.js'

export async function applyGlowEffect(tile, imageIndex, imagePaths, tagMapping) {
    const imagePath = imagePaths[imageIndex];
    if (!imagePath.color) {
        console.warn("No color set for image at index", imageIndex, "; skipping glow effects.");
        return;
    }

    const tags = Tagger.getTags(tile);
    if (!tags.length) {
        console.error("No tags found for the provided tile");
        return;
    }

    const activeTileTag = tags[0];
    const frameTag = tagMapping[activeTileTag];
    if (!frameTag) {
        console.error(`No frame tag found for tag ${activeTileTag}`);
        return;
    }

    const frameTile = findTileByTag(frameTag);
    if (!frameTile) {
        console.error(`No tile found with the tag ${frameTag}`);
        return;
    }

    let baseColorHex = imagePath.color; // Use the color defined in imagePath
    let baseColor = hexToDecimal(baseColorHex); // Convert base color to decimal
    let lighterColor = adjustColor(baseColorHex, 40); // Increase RGB values by 40
    let darkerColor = adjustColor(baseColorHex, -40); // Decrease RGB values by 40

    let params = [{
        filterType: "glow",
        filterId: "totmGlow",
        outerStrength: 5,
        innerStrength: 0,
        color: baseColor,
        quality: 0.5,
        padding: 1,
        animated: {
            color: {
                active: true,
                loopDuration: 4000,
                animType: "colorOscillation",
                val1: lighterColor,
                val2: darkerColor
            }
        }
    }];

    if (game.modules.get('tokenmagic')?.active) {
        await TokenMagic.deleteFilters(frameTile);
        await TokenMagic.addFilters(frameTile, params);
        console.log("Glow effect applied to tile", frameTile.id);
    } else {
        console.warn("TokenMagic module is not active; skipping glow effects.");
    }
}

// Remove filter from tile
export async function removeGlowEffect(tile, tagMapping) {
    // Simplify tag retrieval and direct access to frame tile
    const frameTag = tagMapping[Tagger.getTags(tile)[0]];
    if (!frameTag) {
        console.error("No frame tag found or no tags present on the tile");
        ui.notifications.error("No corresponding frame tile found.");
        return;
    }

    const frameTile = findTileByTag(frameTag);
    if (!frameTile) {
        console.error("No tile found with the frame tag:", frameTag);
        ui.notifications.error(`No tile found with tag: ${frameTag}`);
        return;
    }

    try {
        await TokenMagic.deleteFilters(frameTile, "totmGlow");
        console.log(`Glow effect removed from tile ${frameTile.id}`);
    } catch (error) {
        console.error("Failed to delete glow effect:", error);
    }
}

// Remove filter from all tiles
export async function removeAllGlowEffects(tagMapping) {
    const tags = ['speakerFrame1', 'speakerFrame2', 'sceneFrame'];
    await Promise.all(tags.map(async (tag) => {
        const tile = findTileByTag(tag);
        if (tile) {
            if (game.modules.get('tokenmagic')?.active) {
                try {
                    await TokenMagic.deleteFilters(tile, "totmGlow");
                } catch (error) {
                    console.error("Failed to delete filter from tile:", error);
                }
            }
        } else {
            console.log(`No tile found with the tag: ${tag}`);
        }
    }));
}
