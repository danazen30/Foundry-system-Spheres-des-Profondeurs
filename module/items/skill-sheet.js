import { SdpItemSheet } from "./item-sheet.js";

export class SdpSkillSheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template:
        "systems/sdp/templates/items/skill-sheet.hbs"
    }
  };

  async _prepareContext() {

    const context =
      await super._prepareContext();

    context.system.advanced =
      context.system.advanced === true ||
      context.system.advanced === "true";

    context.characteristicOptions = [

      {
        value: "meleeAbility",
        label: "Melee Ability"
      },

      {
        value: "rangedAbility",
        label: "Ranged Ability"
      },

      {
        value: "strength",
        label: "Strength"
      },

      {
        value: "toughness",
        label: "Toughness"
      },

      {
        value: "initiative",
        label: "Initiative"
      },

      {
        value: "agility",
        label: "Agility"
      },

      {
        value: "dexterity",
        label: "Dexterity"
      },

      {
        value: "intelligence",
        label: "Intelligence"
      },

      {
        value: "willpower",
        label: "Willpower"
      },

      {
        value: "charisma",
        label: "Charisma"
      }

    ];

    return context;

  }

}