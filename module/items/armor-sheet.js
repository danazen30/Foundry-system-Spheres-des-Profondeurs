import { SdpItemSheet } from "./item-sheet.js";

export class SdpArmorSheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/armor-sheet.hbs"
    }
  };

  async _prepareContext() {
    return {
      item: this.document,
      system: this.document.system
    };
  }

}