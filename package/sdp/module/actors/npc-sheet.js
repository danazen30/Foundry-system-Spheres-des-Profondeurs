import { SdpActorSheet } from "./actor-sheet.js";

export class SdpNpcSheet extends SdpActorSheet {

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/actors/npc-sheet.hbs"
    }
  };

  async _prepareContext() {

    const context = await super._prepareContext();

    // =========================
    // NPC FLAGS
    // =========================

    context.isNPC = true;

    return context;
  }

}