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
    label:
      game.i18n.localize(
        "SDP.CharacteristicMeleeAbility"
      )
  },

  {
    value: "rangedAbility",
    label:
      game.i18n.localize(
        "SDP.CharacteristicRangedAbility"
      )
  },

  {
    value: "strength",
    label:
      game.i18n.localize(
        "SDP.CharacteristicStrength"
      )
  },

  {
    value: "toughness",
    label:
      game.i18n.localize(
        "SDP.CharacteristicToughness"
      )
  },

  {
    value: "initiative",
    label:
      game.i18n.localize(
        "SDP.CharacteristicInitiative"
      )
  },

  {
    value: "agility",
    label:
      game.i18n.localize(
        "SDP.CharacteristicAgility"
      )
  },

  {
    value: "dexterity",
    label:
      game.i18n.localize(
        "SDP.CharacteristicDexterity"
      )
  },

  {
    value: "intelligence",
    label:
      game.i18n.localize(
        "SDP.CharacteristicIntelligence"
      )
  },

  {
    value: "willpower",
    label:
      game.i18n.localize(
        "SDP.CharacteristicWillpower"
      )
  },

  {
    value: "charisma",
    label:
      game.i18n.localize(
        "SDP.CharacteristicCharisma"
      )
  }

];

    return context;

  }

  async _onChangeForm(formConfig, event) {

  const element = event.target;

  if (element?.name === "system.advanced") {

    await this.document.update({
      "system.advanced":
        element.value === "true"
    });

    return;
  }

  return super._onChangeForm(
    formConfig,
    event
  );

}

}