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

  static PARTS = {
    body: {
      template: "systems/sdp/templates/dialogs/simple-dialog.hbs"
    }
  };

  static LAYOUT = {
    template: "templates/applications/window.hbs",
    parts: ["body"]
  };

  constructor({ title, content, buttons }) {
    super({
      window: {
  title:
    title ||
    game.i18n.localize("SDP.Dialogs")
}
    });

    this.content = content;
    this.buttons = buttons;
  }

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

  // ✅ FIX CRITIQUE
setPosition(position = {}) {

  // 🔥 si pas encore dans le DOM → on attend
  if (!this.element || !this.element.parentElement) {

    requestAnimationFrame(() => this.setPosition(position));
    return this; // ⚠️ important : ne pas appeler super
  }

  // 🔒 sécurise width
  if (position.width === undefined) {
    position.width = 400;
  }

  return super.setPosition(position);
}
}