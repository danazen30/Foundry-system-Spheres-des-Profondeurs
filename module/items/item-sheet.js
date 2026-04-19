import { ITEM_TRAITS } from "../system/config.js";

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

  const itemTraits = Object.entries(ITEM_TRAITS).map(([key, value]) => {

    const traitsArray = this.document.system.itemTraits ?? [];

    const existing = traitsArray.find(t => {
      if (!t) return false;
      if (typeof t === "string") return t === key;
      return t.key === key;
    });

    return {
      key,
      label: value.label,
      description: value.description,
      hasValue: value.hasValue,
      checked: !!existing,
      value: existing?.value || ""
    };
  });

  return {
    item: this.document,
    system: this.document.system,
    itemTraits // 🔥 IMPORTANT
  };

}

}
