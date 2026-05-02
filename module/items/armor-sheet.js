import { SdpItemSheet } from "./item-sheet.js";

export class SdpArmorSheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/armor-sheet.hbs"
    }
  };

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

    // =========================
  // IMAGE PICKER
  // =========================

  const img = root.querySelector(".armor-img img");

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

async _createEffect() {
  await this.document.createEmbeddedDocuments("ActiveEffect", [{
    name: "New Effect",
    icon: "icons/svg/aura.svg",
    changes: [],
    flags: {
      sdp: {
        armorEffect: true
      }
    }
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

async _prepareContext() {

  const base = await super._prepareContext();

  const { ARMOR_TRAITS } = CONFIG.SDP; // 🔥 IMPORTANT

  const traitsArray = this.document.system.armorTraits ?? [];

  const mapTraits = (type) => {
  return Object.entries(ARMOR_TRAITS)
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

const positiveArmorTraits = mapTraits("positive");
const negativeArmorTraits = mapTraits("negative");

  return {
  ...base,
  positiveArmorTraits,
  negativeArmorTraits,
  effects: this.document.effects
};

}

_processFormData(event) {

  const form = event.currentTarget;
  const fd = new FormData(form);
  const formData = Object.fromEntries(fd.entries());

  const data = foundry.utils.expandObject(formData);

  if (!data.system) data.system = {};

  // =========================
  // ITEM TRAITS
  // =========================

  const itemTraitsObj = data.system.itemTraits || {};
  const finalItemTraits = [];

  for (const [key, t] of Object.entries(itemTraitsObj)) {

    if (!t?.selected) continue;

    finalItemTraits.push({
      key,
      value: t.value ?? ""
    });
  }

  // =========================
// SLOTS FIX (IMPORTANT)
// =========================

const slotKeys = ["head", "chest", "armLeft", "armRight", "legLeft", "legRight"];

data.system.slots = data.system.slots || {};

for (let key of slotKeys) {
  data.system.slots[key] = !!data.system.slots[key];
}

    // =========================
// ARMOR TRAITS
// =========================

const armorTraitsObj = data.system.armorTraits || {};
const finalArmorTraits = [];

for (const [key, t] of Object.entries(armorTraitsObj)) {

  if (!t?.selected) continue;

  finalArmorTraits.push({
    key,
    value: t.value ?? ""
  });
}

data.system.armorTraits = finalArmorTraits;

  data.system.itemTraits = finalItemTraits;

  return data;
}

}