const { ApplicationV2 } = foundry.applications.api;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class SimpleDialog extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id: "simple-dialog",
    classes: ["sdp", "dialog"],
    window: {
      title: "Dialog",
      resizable: false
    },
    position: {
      width: 400
    }
  };

constructor({ title, content, buttons }) {
  super({
    window: {
      title: title || "Dialog"
    }
  });

  this.content = content;
  this.buttons = buttons;
}

  static PARTS = {
    body: {
      template: "systems/sdp/templates/dialogs/simple-dialog.hbs"
    }
  };

  async _prepareContext() {
    return {
      content: this.content,
      buttons: this.buttons
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const root = this.element;

    root.querySelectorAll("[data-button]").forEach(btn => {
      btn.addEventListener("click", async (e) => {

        const key = e.currentTarget.dataset.button;
        const action = this.buttons[key];

        if (action?.callback) {
          await action.callback(this);
        }

        this.close();

      });
    });
  }

}