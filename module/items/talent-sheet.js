import { SdpItemSheet } from "./item-sheet.js";

export class SdpTalentSheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/talent-sheet.hbs"
    }
  };

  async _prepareContext() {

    const context = await super._prepareContext();

    // Legacy talents without the field default to shown in roll dialogs
    if (context.system.showInRollDialog === undefined) {
      context.system.showInRollDialog = true;
    } else {
      context.system.showInRollDialog =
        context.system.showInRollDialog === true
        || context.system.showInRollDialog === "true";
    }

    context.system.canAdvance =
      context.system.canAdvance === true
      || context.system.canAdvance === "true";

    return context;

  }

}
