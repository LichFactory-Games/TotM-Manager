export async function setuptotmManager() {
    const matchesTags = tile => {
        try {
            const tags = Tagger.getTags(tile);
            console.log("Tile:", tile, "Tags:", tags);  // Detailed tag logging
            return tags.includes('scene') || tags.some(tag => /^speaker\d+$/.test(tag));
        } catch (error) {
            console.error("Error getting tags for tile:", tile, error);
            return false;  // If error in getting tags, exclude this tile
        }
    };

    // Detailed logging to verify tiles before filtering
    canvas.tiles.placeables.forEach(tile => {
        const tags = Tagger.getTags(tile);
        console.log("Pre-filter Tile:", tile, "Tags:", tags);
    });

    // Filter tiles based on matching tags
    const tiles = canvas.tiles.placeables.filter(matchesTags);
    console.log("Filtered tiles after matching tags:", tiles);

    if (tiles.length === 0) {
        console.warn("No tiles found with specified tags.");
        return;  // Exit if no matching tiles are found
    }
}
