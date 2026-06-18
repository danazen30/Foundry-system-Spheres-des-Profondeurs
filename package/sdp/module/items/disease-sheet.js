import { SdpItemSheet } from "./item-sheet.js";

export class SdpDiseaseSheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template:
        "systems/sdp/templates/items/disease-sheet.hbs"
    }
  };

  async _prepareContext() {

    return await super._prepareContext();

  }

}