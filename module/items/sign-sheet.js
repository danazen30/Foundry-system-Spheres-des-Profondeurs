import { SdpItemSheet } from "./item-sheet.js";

export class SdpSignSheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template:
        "systems/sdp/templates/items/sign-sheet.hbs"
    }
  };

  async _prepareContext() {

    const context =
      await super._prepareContext();

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
    // ADD LEVEL
    // =========================

    root.querySelector(
      ".add-level"
    )?.addEventListener(
      "click",
      async () => {

        const levels =
          foundry.utils.deepClone(
            this.document.system.levels || {}
          );

        const newLevel =
          Object.keys(levels).length + 1;

        levels[newLevel] = {

          hp: "1d4",

          damageBonus: "",

          inspirationDice: "",

          description: ""

        };

        await this.document.update({
          "system.levels": levels
        });

      }
    );

    // =========================
    // DELETE LEVEL
    // =========================

    root.querySelectorAll(
      ".delete-level"
    ).forEach(btn => {

      btn.addEventListener(
        "click",
        async (event) => {

          const level =
            event.currentTarget
              .closest(".level-block")
              .dataset.level;

          const levels =
            foundry.utils.deepClone(
              this.document.system.levels || {}
            );

          delete levels[level];

          await this.document.update({
            "system.levels": levels
          });

        }
      );

    });

  }

}