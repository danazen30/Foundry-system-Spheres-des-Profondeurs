import { SdpItemSheet } from "./item-sheet.js";

export class SdpSkillSheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/skill-sheet.hbs"
    }
  };

  async _prepareContext() {
    return {
      item: this.document,
      system: this.document.system,

      characteristicOptions: [
        { value: "meleeAbility", label: "Melee Ability" },
        { value: "rangedAbility", label: "Ranged Ability" },
        { value: "strength", label: "Strength" },
        { value: "toughness", label: "Toughness" },
        { value: "initiative", label: "Initiative" },
        { value: "agility", label: "Agility" },
        { value: "dexterity", label: "Dexterity" },
        { value: "intelligence", label: "Intelligence" },
        { value: "willpower", label: "Willpower" },
        { value: "charisma", label: "Charisma" }
      ]
    };
  }

}