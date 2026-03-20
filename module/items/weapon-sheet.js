import { SdpItemSheet } from "./item-sheet.js";

export class SdpWeaponSheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/weapon-sheet.hbs"
    }
  };

  async _prepareContext() {
  return {
    item: this.document,
    system: this.document.system,

    categoryOptions: [
      { value: "melee", label: "Melee" },
      { value: "ranged", label: "Ranged" }
    ],

    handednessOptions: [
      { value: "one", label: "One Hand" },
      { value: "two", label: "Two Hands" },
      { value: "special", label: "Special" }
    ]
  };
}
}