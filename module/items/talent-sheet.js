export class SdpTalentSheet extends ItemSheet {

  static get defaultOptions() {

    return foundry.utils.mergeObject(super.defaultOptions, {

      classes: ["sdp", "sheet", "item"],
      template: "systems/sdp/templates/items/talent-sheet.hbs",
      width: 500,
      height: 400

    });

  }

  getData() {

    const context = super.getData();

    context.system = this.item.system;

    return context;

  }

  activateListeners(html) {

    super.activateListeners(html);

    html.find(".effect-control").click(this._onEffectControl.bind(this));

  }

  async _onEffectControl(event) {

    event.preventDefault();

    const button = event.currentTarget;
    const li = button.closest(".effect");
    const effect = li ? this.item.effects.get(li.dataset.effectId) : null;

    switch (button.dataset.action) {

      case "create":
        return this.item.createEmbeddedDocuments("ActiveEffect", [{
        name: "New Effect"
        }]);

      case "edit":
        return effect.sheet.render(true);

      case "delete":
        return effect.delete();

    }

  }

}