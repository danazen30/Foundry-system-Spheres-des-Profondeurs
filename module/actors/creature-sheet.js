import { SdpActorSheet } from "./actor-sheet.js";
import {
  getLocalizedCreatureDescription,
  resolveActorKey,
  syncCreatureLocalizedName
} from "../system/item-localization.js";

export class SdpCreatureSheet extends SdpActorSheet {

  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,

    classes: [
      "sdp",
      "sheet",
      "actor",
      "creature"
    ],

    position: {
      width: 750,
      height: 800
    }
  };

  static PARTS = {
    sheet: {
      template:
        "systems/sdp/templates/actors/creature-sheet.hbs"
    }
  };

  async _prepareContext() {
    const context = await super._prepareContext();
    const key = resolveActorKey(this.document);
    const bestiaryText =
      getLocalizedCreatureDescription(key, "");

    context.creatureKey = key;
    context.creatureBestiaryText = bestiaryText;
    context.hasCreatureBestiary = Boolean(bestiaryText);

    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    await syncCreatureLocalizedName(this.document);
  }

}
