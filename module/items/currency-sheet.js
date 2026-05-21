import { SdpItemSheet } from "./item-sheet.js";

export class SdpCurrencySheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/currency-sheet.hbs"
    }
  };

  async _prepareContext() {

    const context =
      await super._prepareContext();

    context.system =
      this.document.system || {};

    context.system.quantity ||= {
      value: 0
    };

    context.system.value ||= {
      value: 0
    };

    context.system.denomination ||= {
      value: "gold"
    };

    context.system.encumbrance ||= {
      value: 0
    };

    context.denominations = [
      "platinum",
      "gold",
      "silver",
      "copper"
    ];

    return context;

  }

}