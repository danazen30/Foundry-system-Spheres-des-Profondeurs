import { SdpItemSheet } from "./item-sheet.js";

export class SdpAmmunitionSheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/ammunition-sheet.hbs"
    }
  };

  async _prepareContext() {
    return {
      item: this.document,
      system: this.document.system
    };
  }

}