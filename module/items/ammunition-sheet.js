import { SdpItemSheet } from "./item-sheet.js";
import { WEAPON_TRAITS } from "../system/config.js";

export class SdpAmmunitionSheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/ammunition-sheet.hbs"
    }
  };

  async _prepareContext() {
    return {
      item: this.document,
      system: this.document.system,

      traits: Object.entries(WEAPON_TRAITS).map(([key, value]) => ({
      key,
      label: value.label,
      description: value.description,
      checked: this.document.system.traits?.includes(key)
    }))
    };

  }

async _updateObject(event, formData) {

  const data = foundry.utils.expandObject(formData);

  // 🔥 FIX IMAGE → on la garde
  if (formData.img) {
    data.img = formData.img;
  }

  if (data.system.traits && !Array.isArray(data.system.traits)) {
    data.system.traits = [data.system.traits];
  }

  return super._updateObject(event, data);
}

_onRender(context, options) {
  super._onRender(context, options);

  const html = this.element;

  // =========================
  // IMAGE PICKER
  // =========================

  const img = html.querySelector(".ammo-img img");

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