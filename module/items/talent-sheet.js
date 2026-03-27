import { SdpItemSheet } from "./item-sheet.js";

export class SdpTalentSheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/talent-sheet.hbs"
    }
  };

  async _prepareContext() {
    return {
      item: this.document,
      system: this.document.system,
      effects: this.document.effects
    };
  }

_onRender(context, options) {
  super._onRender(context, options);

  const root = this.element;

  root.querySelectorAll("[data-action]").forEach(el => {

    el.addEventListener("click", (event) => {

      const action = el.dataset.action;

      switch (action) {

        case "create-effect":
          this._createEffect();
          break;

        case "edit-effect":
          this._editEffect(event);
          break;

        case "delete-effect":
          this._deleteEffect(event);
          break;
      }

    });

  });

}

async _createEffect() {
 console.log("CREATE EFFECT TRIGGERED");
  await this.document.createEmbeddedDocuments("ActiveEffect", [{
    name: "New Effect",
    icon: "icons/svg/aura.svg",
    changes: [] // 🔥 VIDE
  }]);
}

  async _editEffect(event) {
    const li = event.target.closest(".effect");
    if (!li) return;

    const effect = this.document.effects.get(li.dataset.effectId);

    if (effect) effect.sheet.render(true);
  }

  async _deleteEffect(event) {
    const li = event.target.closest(".effect");
    if (!li) return;

    const effect = this.document.effects.get(li.dataset.effectId);

    if (effect) await effect.delete();
  }

}