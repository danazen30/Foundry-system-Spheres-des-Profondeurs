import { SdpItemSheet } from "./item-sheet.js";

export class SdpSpellSheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/spell-sheet.hbs"
    }
  };

  async _prepareContext() {
    return {
      item: this.document,
      system: this.document.system,

      durationOptions: [
        { value: "round", label: "Round" },
        { value: "minute", label: "Minute" },
        { value: "hour", label: "Hour" },
        { value: "instant", label: "Instant" }
      ]
    };
  }

  // 🔥 V2 STYLE
_onRender(context, options) {
  super._onRender(context, options);

  const html = this.element;

  // =========================
  // ADD
  // =========================

  const btn = html.querySelector(".add-overcast-special");

  if (btn) {
    btn.addEventListener("click", async ev => {

      console.log("CLICK ADD OVERCAST"); // 🔥 DEBUG

      let effects = this.document.system.overcastSpecialEffects?.value;

if (!Array.isArray(effects)) {
  effects = Object.values(effects || {});
}

effects = foundry.utils.duplicate(effects);

      effects.push({
  label: "New Effect",
  value: "WP"
});

      await this.document.update({
        "system.overcastSpecialEffects.value": effects
      });

    });
  }

  // =========================
  // REMOVE
  // =========================

  html.querySelectorAll(".remove-overcast-special").forEach(btn => {

    btn.addEventListener("click", async ev => {

      const index = Number(
        ev.currentTarget.closest(".overcast-special-item").dataset.index
      );

      let effects = this.document.system.overcastSpecialEffects?.value;

if (!Array.isArray(effects)) effects = [];

effects = foundry.utils.duplicate(effects);

      effects.splice(index, 1);

      await this.document.update({
        "system.overcastSpecialEffects.value": effects
      });

    });

  });

  // =========================
// IMAGE PICKER
// =========================

const img = html.querySelector(".spell-img img");

if (img) {
  img.addEventListener("click", () => {

    new FilePicker({
      type: "image",
      current: this.document.img,
      callback: async (path) => {
        await this.document.update({ img: path });
      }
    }).render(true);

  });
}

}

}