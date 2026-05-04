import { SdpItemSheet } from "./item-sheet.js";

export class SdpCurrencySheet extends SdpItemSheet {

  static DEFAULT_OPTIONS = {
    classes: ["sdp", "sheet", "item"],
    position: { width: 400, height: 300 }
  };

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/currency-sheet.hbs"
    }
  };

  async _prepareContext() {

    const context = await super._prepareContext();

    // 🔥 SAFE
    context.system = this.document.system || {};

    context.system.quantity = context.system.quantity || { value: 0 };
    context.system.value = context.system.value || { value: 0 };
    context.system.denomination = context.system.denomination || { value: "gold" };
    context.system.encumbrance = context.system.encumbrance || { value: 0 };

    context.denominations = [
      "platinum",
      "gold",
      "silver",
      "copper"
    ];

    return context;
  }
}