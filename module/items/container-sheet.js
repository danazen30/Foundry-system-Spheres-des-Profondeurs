import { SdpItemSheet } from "./item-sheet.js";

export class SdpContainerSheet extends SdpItemSheet {
  static DEFAULT_OPTIONS = {
    classes: ["sdp", "sheet", "item"],
    position: { width: 500, height: 500 }
  };

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/container-sheet.hbs"
    }
  };

_onRender(context, options) {
  super._onRender(context, options);

  const root = this.element;

  // =========================
  // IMAGE PICKER
  // =========================

  const img = root.querySelector(".container-img img");

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