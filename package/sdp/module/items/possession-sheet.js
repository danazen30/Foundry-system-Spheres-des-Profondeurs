import { SdpItemSheet } from "./item-sheet.js";

export class SdpPossessionSheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template:
        "systems/sdp/templates/items/possession-sheet.hbs"
    }
  };

  async _prepareContext() {

    const context =
      await super._prepareContext();

    return context;

  }

}