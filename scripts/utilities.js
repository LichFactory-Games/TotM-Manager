//// Utility Methods

// Color Helpers
export function hexToDecimal(hex) {
    if (hex.indexOf('#') === 0) {
        hex = hex.slice(1); // Remove the '#' character
    }
    return parseInt(hex, 16);
}

export function adjustColor(hex, amount) {
    let color = parseInt(hex.slice(1), 16); // Remove '#' and convert to decimal
    let r = Math.max(0, Math.min(255, ((color >> 16) & 0xFF) + amount));
    let g = Math.max(0, Math.min(255, ((color >> 8) & 0xFF) + amount));
    let b = Math.max(0, Math.min(255, (color & 0xFF) + amount));
    return (r << 16) | (g << 8) | b; // Combine back to a single integer
}

// Tiles & Tags
export function findTileByTag(tag) {
    // Implement findTileByTag logic, assuming it's based on the game environment
    return canvas.tiles.placeables.find(tile => Tagger.getTags(tile).includes(tag));
}

export function getFilteredTiles() {
    console.log("TotM Manager: Filtering tiles");
    const tiles = canvas.tiles.placeables.filter(tile => {
        try {
            const tags = Tagger.getTags(tile);
            return tags.includes('scene') || tags.some(tag => /^speaker\d+$/.test(tag));
        } catch (error) {
            console.error("Error getting tags for tile:", tile, error);
            return false;
        }
    });

    if (tiles.length === 0) {
        console.warn("No tiles found with specified tags.");
        return [];
    }
    return tiles;
}
