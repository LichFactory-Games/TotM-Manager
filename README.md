Theater of the mind Manager (TotM Manager) is designed to help you, the GM, manage visual and thematic elements for theater of the mind style play in Foundry VTT.

The module is in its early stages, but it allows you to 

1. Add individual images or directories of images to a tile
2. Preview and switch between images on a tile
3. Select between speaker and scene tiles via tag (and the [Tagger](https://github.com/fantasycalendar/FoundryVTT-Tagger) module)
4. Add glow effects to a tile (via [Token Magic](https://github.com/Feu-Secret/Tokenmagic))

A sample template for use with the TotM Manager is included in a compendium. But you can also create your own tiles and set tags for use with those tiles.

Using the Tagger module, you can tag lights and sounds to run with particular images, so that when you switch to those images the lighting changes, or sounds are played (or both). This can effectively allow you to change the scenery without changing the Foundry scene.

All tags and image data are stored in the metadata of the scene tiles, so nothing is altered in your actual files. To add the module in Foundry just go to the [releases](https://github.com/LichFactory-Games/TotM-Manager/releases) tab and copy the link for the `module.json` into the Foundry "Manifest URL" field in the "Install Module" window.

Here you can see an example of a scene set using three tiles and the TotM Manager.

![](./screenshots/totmm-screenshot.png)

