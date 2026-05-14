import { SdpActorSheet } from "./actor-sheet.js";

export class SdpCreatureSheet extends SdpActorSheet {

  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,

    classes: [
      "sdp",
      "sheet",
      "actor",
      "creature"
    ],

    position: {
      width: 750,
      height: 800
    }
  };

  static PARTS = {
  sheet: {
    template:
      "systems/sdp/templates/actors/creature-sheet.hbs"
  }
};

}