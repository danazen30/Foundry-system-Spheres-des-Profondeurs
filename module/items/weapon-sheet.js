import { SdpItemSheet } from "./item-sheet.js";
import { WEAPON_TRAITS } from "../system/config.js";

export class SdpWeaponSheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/weapon-sheet.hbs"
    }
  };

  async _prepareContext() {
    console.log("RENDER WEAPON SHEET"); // 👈 TEST 1
  return {
    item: this.document,
    system: this.document.system,

    categoryOptions: [
      { value: "melee", label: "Melee" },
      { value: "ranged", label: "Ranged" }
    ],

    handednessOptions: [
      { value: "one", label: "One Hand" },
      { value: "two", label: "Two Hands" },
      { value: "special", label: "Special" }
    ],

traits: Object.entries(WEAPON_TRAITS).map(([key, value]) => {

  const traitsArray = this.document.system.traits ?? [];

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

})

  };
}

_processFormData(event) {

  // 🔥 récupérer le vrai form
  const form = event.currentTarget;

  // 🔥 récupérer les données correctement
  const fd = new FormData(form);
  const formData = Object.fromEntries(fd.entries());

  const data = foundry.utils.expandObject(formData);

  // 🔥 sécuriser
  if (!data.system) data.system = {};

  const traitsObj = data.system.traits || {};

  const finalTraits = [];

  for (const [key, t] of Object.entries(traitsObj)) {

    if (!t?.selected) continue;

    finalTraits.push({
      key,
      value: t.value ?? ""
    });
  }

  data.system.traits = finalTraits;
console.log("FINAL TRAITS", finalTraits);
  return data;
}

}