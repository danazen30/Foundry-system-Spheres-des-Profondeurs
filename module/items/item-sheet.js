import { ITEM_TRAITS } from "../system/config.js";

const { ItemSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class SdpItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  constructor(...args) {

  super(...args);

  this.activeTab = "details";

}

static DEFAULT_OPTIONS = {
 classes: ["sdp", "sheet", "item"],
position: { width: 450, height: 450 },
window: { resizable: true },
form: { submitOnChange: true }
};

static LAYOUT = {
 template: "templates/applications/sheet.hbs",
 parts: ["sheet"]
 };

async _prepareContext() {

  const traitsArray = this.document.system.itemTraits ?? [];

const mapTraits = (type) => {
  return Object.entries(ITEM_TRAITS)
    .filter(([_, v]) => v.type === type)
    .map(([key, value]) => {

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
};

const positiveItemTraits = mapTraits("positive");
const negativeItemTraits = mapTraits("negative");

  return {
  item: this.document,
  system: this.document.system,
  positiveItemTraits,
  negativeItemTraits,
  activeTab: this.activeTab
};

}

_onRender(context, options) {

  super._onRender(context, options);

  const root = this.element;

  // =========================
  // IMAGE PICKER
  // =========================

  const img =
    root.querySelector(".item-header-image img");

  if (!img) return;

  img.addEventListener("click", () => {

    new FilePicker({

      type: "image",

      current: this.document.img,

      callback: async (path) => {

        await this.document.update({
          img: path
        });

      }

    }).render(true);

  });

  // =========================
// TABS
// =========================

root.querySelectorAll("[data-tab]").forEach(tab => {

  if (tab.dataset.tab === this.activeTab) {
    tab.classList.add("active");
  }

  tab.addEventListener("click", () => {

    this.activeTab = tab.dataset.tab;

    this.render();

  });

});

}

}
