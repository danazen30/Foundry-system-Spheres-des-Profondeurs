import { SdpItemSheet } from "./item-sheet.js";
import {
  getCharacteristicOptions,
  getLocalizedSignLevelDescription
} from "../system/item-localization.js";

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

    const system = context.system ?? {};
    const signKey = system.key?.trim?.() ?? "";

    context.characteristicOptions =
      getCharacteristicOptions();

    const levels =
      foundry.utils.deepClone(system.levels ?? {});

    for (const [level, data] of Object.entries(levels)) {

      data.localizedDescription =
        getLocalizedSignLevelDescription(
          signKey,
          level
        );

    }

    context.system.levels = levels;

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

          hp: "",

          damageBonus: "",

          inspirationDice: ""

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
              .closest(".sign-level-card")
              ?.dataset.level;

          if (!level) return;

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
