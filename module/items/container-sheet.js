import { SdpItemSheet } from "./item-sheet.js";

export class SdpContainerSheet extends SdpItemSheet {
  static DEFAULT_OPTIONS = {
    classes: ["sdp", "sheet", "item"],
    position: { width: 500, height: 500 }
  };

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/container-sheet.hbs"
    }
  };
}