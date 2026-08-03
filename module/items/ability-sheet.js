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

}
