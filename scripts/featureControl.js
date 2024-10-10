import { NAMESPACE, logMessage } from './utilities.js';

export async function controlFeaturesBasedOnTags(tile, currentIndex) {
  const playlists = game.playlists.contents;
  const scene = game.scenes.active;

  // Fetch the current image based on the new index
  const imagePaths = await tile.document.getFlag(NAMESPACE, 'imagePaths') || [];
  const currentImage = imagePaths[currentIndex];

  // Fetch tags for the current image and toggle features based on these tags
  const imageTags = currentImage.tags || [];
  logMessage("Cycled to new image at index:", currentIndex, "Path:", currentImage.img);
  logMessage("Image tags:", imageTags);

  // Process each light in the scene
  if (imageTags.includes('totmLight')) {
    if (game.user.isGM) {
      for (let light of scene.lights.contents) {
        const lightTags = await Tagger.getTags(light);
        logMessage("Tagger light tags are: ", lightTags);

        if (lightTags.includes('totmLight')) {
          const lightShouldBeOn = imageTags.some(tag => tag !== 'totmLight' && lightTags.includes(tag));
          await light.update({ hidden: !lightShouldBeOn });
        }
      }
    } else {
      console.log("Non-GM user; skipping light updates.");
    }
  }

  // Handle Sounds in Playlists
  for (let playlist of playlists) {
    for (let tag of imageTags) {
      if (tag.startsWith("play-")) {
        const playlistId = tag.substring(5);  // Extract the ID part after 'play-'
        if (playlistId === playlist.id) {
          logMessage("Checking playlist:", playlist.name);
          try {
            // Check if the user has permission to control the playlist
            if (playlist.canUserModify(game.user, "update")) {
              const currentlyPlayingSound = playlist.sounds.find(s => s.playing);
              if (currentlyPlayingSound) {
                await playlist.stopSound(currentlyPlayingSound);
                logMessage("Stopped sound in playlist:", playlist.name);
              }

              const soundToPlay = playlist.sounds.find(s => !s.playing);
              if (soundToPlay) {
                await playlist.playSound(soundToPlay);
                logMessage("Playing sound in playlist:", playlist.name);
              }
            } else {
              console.log(`User ${game.user.name} lacks permission to control playlist ${playlist.name}`);
            }
          } catch (error) {
            console.error("Error controlling sound in playlist:", playlist.name, error);
          }
        }
      }
    }
  }

  // Execute Macros
  for (let macro of game.macros.contents) {
    for (let tag of imageTags) {
      if (tag.startsWith("macro-")) {
        const macroId = tag.substring(6);  // Extract the ID part after 'macro-'
        if (macroId === macro.id) {
          // Check if the user has permission to execute the macro
          if (macro.canExecute(game.user)) {
            macro.execute();
          } else {
            console.log(`User ${game.user.name} lacks permission to execute macro ${macro.name}`);
          }
        }
      }
    }
  }
}
