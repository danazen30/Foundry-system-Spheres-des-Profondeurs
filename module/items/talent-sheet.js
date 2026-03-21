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

    root.addEventListener("click", (event) => {

      const button = event.target.closest("[data-action]");
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();

      const action = button.dataset.action;

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

  }

  async _createEffect() {

    await this.document.createEmbeddedDocuments("ActiveEffect", [{
      name: "New Effect",
      icon: "icons/svg/aura.svg",
      changes: []
    }]);

    this.render();
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