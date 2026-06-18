import { SdpItemSheet } from "./item-sheet.js";

export class SdpClothingSheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/clothing-sheet.hbs"
    }
  };

}