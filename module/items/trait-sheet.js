import { SdpItemSheet } from "./item-sheet.js";

export class SdpTraitSheet extends SdpItemSheet {

  constructor(...args) {

    super(...args);

    this.activeTab = "description";

  }

  static DEFAULT_OPTIONS = {
    classes: ["sdp", "sheet", "item"],
    position: {
      width: 500,
      height: 600
    }
  };

  static PARTS = {
    main: {
      template:
        "systems/sdp/templates/items/trait-sheet.hbs"
    }
  };

}