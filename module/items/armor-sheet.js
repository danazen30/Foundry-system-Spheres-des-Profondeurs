import { SdpItemSheet } from "./item-sheet.js";

export class SdpArmorSheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/armor-sheet.hbs"
    }
  };

 async _prepareContext() {

  const base = await super._prepareContext(); // 🔥 CRUCIAL

  return {
    ...base
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

  data.system.itemTraits = finalItemTraits;

  return data;
}

}