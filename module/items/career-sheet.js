import { SdpItemSheet } from "./item-sheet.js";
import {
  formatLocalizedKeyList,
  formatLocalizedTrappings,
  localizeCareerGroupRef,
  localizeItemRef,
  localizeStanding
} from "../system/item-localization.js";

export class SdpCareerSheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/career-sheet.hbs"
    }
  };

  async _prepareContext() {

    const context =
      await super._prepareContext();

    const system = context.system ?? {};

    context.display = {
      careerGroup: localizeCareerGroupRef(system.careerGroup),
      standing: localizeStanding(system.standing),
      characteristics: formatLocalizedKeyList(
        system.characteristics,
        { characteristic: true }
      ),
      skills: formatLocalizedKeyList(
        system.skills,
        { type: "skill" }
      ),
      talents: formatLocalizedKeyList(
        system.talents,
        { type: "talent" }
      ),
      workSkill: localizeItemRef(
        "skill",
        system.workSkill
      ),
      trappings: formatLocalizedTrappings(system.trappings)
    };

    return context;

  }

}
