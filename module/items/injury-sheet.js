import { SdpItemSheet } from "./item-sheet.js";

export class SdpInjurySheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template:
        "systems/sdp/templates/items/injury-sheet.hbs"
    }
  };

  async _prepareContext() {

    return await super._prepareContext();

  }

}