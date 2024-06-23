# Theater of the Mind Manager (TotM Manager)

TotM Manager is designed to help you, the GM, manage visual and thematic elements for theater of the mind style play in Foundry VTT.

The module allows you to:

1. Add individual images or directories of images to a tile
2. Preview and switch between images on a tile
3. Select between tiles via tags (and the [Tagger](https://github.com/fantasycalendar/FoundryVTT-Tagger) module)
4. Add effects to a tile (via [Token Magic](https://github.com/Feu-Secret/Tokenmagic))

A sample template for use with the TotM Manager is included in a compendium. If you like, you may import the TotM Template from the compendium for your own use. It comes with three tiles, and three "frames" for those image tiles, pretagged and ready for use. But you can also just create your own configuration of tiles and set tags for use with those tiles.

You can also tag lights and sounds to run with particular images, so that when you switch to those images the lighting changes, or sounds are played, or macros run (or all three). All this effectively allow you to change the scenery without changing the Foundry scene.

All tags and image data are stored in the metadata of the scene tiles, so nothing is altered in your actual files. To add the module in Foundry just go to the [releases](https://github.com/LichFactory-Games/TotM-Manager/releases) tab and copy the link for the `module.json` into the Foundry "Manifest URL" field in the "Install Module" window.

As mentioned above, the module has three dependencies for proper functioning -- Tagger, Token Magic, and libWrapper. 

Here you can see an example of a scene set using three tiles and the TotM Manager.

<img src="../image-assets/totmm-overview.gif?raw=true" alt="TotM Overview" width="800">

## How To Use TotM Manager

The manager is designed to work with tagged tiles you create. Tile names that you make in TotMM have to match tiles that have been tagged by Tagger. In the case of the template provided, there are three tiles. 'Speaker1' and 'speaker2' are on the left and 'scene' is to their right, taking up most of the rest of the canvas. There are also "frame" tiles (the images are included in the module compendium). Here is a video showing a simple setup case.

<img src="../image-assets/totmm-creating-tiles.gif?raw=true" alt="TotM Creating Tiles" width="800">

There are three tabs. The 'stage' tab is where you can add, cycle through, and delete images from tiles. You may also hide or reveal a tile from this tab. The 'tiles' tab is where you add or delete tiles from the manager (though not from the canvas itself). You can also control the opacity or tint of a tile from here. Finally, the 'effects' tab allows you to add or delete effects from a tile. You may select from any of the effects provided by token magic. You can also modify the effects before you apply them by directly changing the json data. You can see some examples of adding images and effects below.

<img src="../image-assets/totmm-adding-images.gif?raw=true" alt="TotM Adding Images" width="800">
<img src="../image-assets/totmm-add-effects.gif?raw=true" alt="TotM Add Effects" width="800">

In the center of the stage tab's window is the image list itself. Images may be reordered by dragging and dropping. Each image may be previewed by hovering over its name field. If the user would like to link a particular light setup or anything else that can be tagged, the next field allows a list of tags. 

<img src="../image-assets/totmm-tags.webp?raw=true" alt="Tag Example" width="800">

For example, let's say you have two images, A and B. You want image A to have pulsing red lighting, while image B should be placid with normal white light. You can accomplish this by setting up the pulsing red lighting for A and the normal white lighting for B (positioned however you want). You then tag all the lights with the tag "totmLight" and use a specific tag, such as "pulse" for A's lights, and another tag, such as "normal", for B's lights. In the tag fields for the images in the TotM Manager window you would put "totmLight" and the respective tags for A and B. Then, when activating each image only lights matching the tags in that image's tag field will light. You can do something similar for sounds or anything else that takes a tag. 

TotM Manager can also attach specific playlists or macros to images so long as you have their respective IDs. In the image tags field you can add playlists by using the tag 'play-ID' and call a macro using the tag 'macro-ID'. This allows you to, for example, have images where the lights do a flicker effect while a thunder playlist plays. 

**Note that the scene must be active for lights and related effects to trigger by image.**

Be sure to **save any changes** you make to an image by pressing the 'Save' button!

## Search

If you have a tile with a lot of images you may find searching by image name or tag helpful. There is a search bar immediately above the image list that you can use to navigate images. It will give you a preview of all candidates. Press `Enter` to activate the first image in the list. You may also click on any image returned in the search to activate it. 

## Settings 

Settings right now are limited to keybindings (Ctrl-T for the window; Ctrl-F for search), initial tile name, and image preview size. 

## Feature Roadmap

The following features are ones I would consider adding at some point. 

- [x] Allow fine-grained control over color filter settings 
- [x] Allow for other tile setups and more than two speakers or one scene
- [x] Search function for images by name or tag. Helpful in cases where many images are connected with a tile. 
- [ ] Video file support.
- [x] Support for more TokenMagic FX filters than glow (and possibly adding FXMaster support in addition to Token Magic). 
- [ ] Ability to target and edit a text drawing for labeling of the scene/NPCs.
- [ ] Finer controls for mass adding or deleting images (e.g. ability to select "Avatar" images from a Tokenizer folder and exclude all "Token" images).
- [ ] Remove as many hard-coded variable names as possible & make them user definable
  - [X] Make keybinding for opening manager configurable.
  - [x] Allow different tags than 'scene', 'speaker1', 'speaker2', etc. 
  - [X] Allow preview image size to be user determined
  - [X] Add user accessible keybindings 

## Thanks

Special thanks to [Monk's Active Tile Triggers](https://github.com/ironmonk88/monks-active-tiles) and [this youtube video](https://www.youtube.com/watch?v=Uq1y7l7DcoU) by Axium for giving me the original idea to run theater of the mind in Foundry by manipulating tiles.
