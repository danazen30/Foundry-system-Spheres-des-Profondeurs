import { SdpItemSheet } from "./item-sheet.js";

export class SdpAbilitySheet extends SdpItemSheet {

  constructor(...args) {

    super(...args);

    this.activeTab = "details";

  }

  static PARTS = {
    sheet: {
      template:
        "systems/sdp/templates/items/ability-sheet.hbs"
    }
  };

  async _prepareContext() {

    const context =
      await super._prepareContext();

    context.system.passive =
      !!context.system.passive;

    context.durationOptions = [
      {
        value: "round",
        label:
          game.i18n.localize(
            "SDP.DurationRound"
          )
      },
      {
        value: "minute",
        label:
          game.i18n.localize(
            "SDP.DurationMinute"
          )
      },
      {
        value: "hour",
        label:
          game.i18n.localize(
            "SDP.DurationHour"
          )
      },
      {
        value: "instant",
        label:
          game.i18n.localize(
            "SDP.DurationInstant"
          )
      }
    ];

    return context;

  }

  _processFormData(event) {

    const form = event.currentTarget;
    const fd = new FormData(form);
    const formData = Object.fromEntries(fd.entries());
    const data = foundry.utils.expandObject(formData);

    if (!data.system) data.system = {};

    // Checkboxes absents du FormData quand décochés
    data.system.passive = !!data.system.passive;

    data.system.aoe ??= {};
    data.system.aoe.value = !!data.system.aoe?.value;

    data.system.concentration ??= {};
    data.system.concentration.value =
      !!data.system.concentration?.value;

    return data;

  }

}
