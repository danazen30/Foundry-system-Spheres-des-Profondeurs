import { SdpItemSheet } from "./item-sheet.js";

export class SdpSpellSheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/spell-sheet.hbs"
    }
  };

  async _prepareContext() {
    return {
      item: this.document,
      system: this.document.system,

      durationOptions: [
        { value: "round", label: "Round" },
        { value: "minute", label: "Minute" },
        { value: "hour", label: "Hour" },
        { value: "instant", label: "Instant" }
      ]
    };
  }

}