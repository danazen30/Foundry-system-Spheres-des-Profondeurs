import { SdpItemSheet } from "./item-sheet.js";

export class SdpSpellSheet extends SdpItemSheet {

  constructor(...args) {

    super(...args);

    this.activeTab = "details";

  }

  static PARTS = {
    sheet: {
      template:
        "systems/sdp/templates/items/spell-sheet.hbs"
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

  _onRender(context, options) {

    super._onRender(
      context,
      options
    );

    const root =
      this.getRoot();

    // =========================
    // ADD OVERCAST
    // =========================

    const addBtn =
      root.querySelector(
        ".add-overcast-special"
      );

    if (addBtn) {

      addBtn.addEventListener(
        "click",
        async () => {

          let effects =
            this.document.system
              .overcastSpecialEffects
              ?.value;

          if (!Array.isArray(effects)) {

            effects =
              Object.values(
                effects || {}
              );

          }

          effects =
            foundry.utils.duplicate(
              effects
            );

          effects.push({
            label:
  game.i18n.localize(
    "SDP.NewEffect"
  ),
            value: "WP"
          });

          await this.document.update({
            "system.overcastSpecialEffects.value":
              effects
          });

        }
      );

    }

    // =========================
    // REMOVE OVERCAST
    // =========================

    root.querySelectorAll(
      ".remove-overcast-special"
    ).forEach(btn => {

      btn.addEventListener(
        "click",
        async (event) => {

          const index =
            Number(
              event.currentTarget
                .closest(
                  ".overcast-special-item"
                )
                .dataset.index
            );

          let effects =
            this.document.system
              .overcastSpecialEffects
              ?.value;

          if (!Array.isArray(effects)) {
            effects = [];
          }

          effects =
            foundry.utils.duplicate(
              effects
            );

          effects.splice(index, 1);

          await this.document.update({
            "system.overcastSpecialEffects.value":
              effects
          });

        }
      );

    });

  }

}