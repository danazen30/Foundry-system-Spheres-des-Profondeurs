import { SdpItemSheet } from "./item-sheet.js";

export class SdpClothingSheet extends SdpItemSheet {
  static DEFAULT_OPTIONS = {
    classes: ["sdp", "sheet", "item"],
    position: { width: 500, height: 500 }
  };

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/clothing-sheet.hbs"
    }
  };

_onRender(context, options) {
  super._onRender(context, options);

  const root = this.element;

  // =========================
  // CREATE EFFECT
  // =========================
  root.querySelectorAll('[data-action="createEffect"]').forEach(el => {
    el.addEventListener("click", async () => {

      await this.item.createEmbeddedDocuments("ActiveEffect", [{
        name: "New Effect",
        icon: "icons/svg/aura.svg",
        changes: [],
        disabled: false
      }]);

    });
  });

  // =========================
  // EDIT EFFECT
  // =========================
  root.querySelectorAll('[data-action="editEffect"]').forEach(el => {
    el.addEventListener("click", (event) => {

      const id = event.currentTarget.dataset.effectId;
      const effect = this.item.effects.get(id);

      if (effect) effect.sheet.render(true);

    });
  });

  // =========================
  // DELETE EFFECT
  // =========================
  root.querySelectorAll('[data-action="deleteEffect"]').forEach(el => {
    el.addEventListener("click", async (event) => {

      const id = event.currentTarget.dataset.effectId;

      await this.item.deleteEmbeddedDocuments("ActiveEffect", [id]);

    });
  });

}

}