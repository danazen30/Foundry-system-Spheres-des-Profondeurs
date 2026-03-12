import { SdpItemSheet } from "./item-sheet.js";

export class SdpArmorSheet extends SdpItemSheet {

  static get defaultOptions() {

    return foundry.utils.mergeObject(super.defaultOptions, {

      classes: ["sdp", "sheet", "item"],
      width: 420,
      height: 500

    });

  }

  get template() {

    return "systems/sdp/templates/items/armor-sheet.hbs";

  }

}