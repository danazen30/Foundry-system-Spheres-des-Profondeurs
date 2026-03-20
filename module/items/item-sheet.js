const { ItemSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class SdpItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["sdp", "sheet", "item"],
    position: { width: 400, height: 400 },
    window: { resizable: true },
    form: { submitOnChange: true }
  };

  static LAYOUT = {
    template: "templates/applications/sheet.hbs",
    parts: ["sheet"]
  };

  async _prepareContext() {
    return {
      item: this.document,
      system: this.document.system
    };
  }

}