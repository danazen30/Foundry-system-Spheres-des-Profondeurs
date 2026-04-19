import { SdpItemSheet } from "./item-sheet.js";
import { WEAPON_TRAITS } from "../system/config.js";

export class SdpWeaponSheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/weapon-sheet.hbs"
    }
  };

  async _prepareContext() {

  const base = await super._prepareContext(); // 🔥 CRUCIAL

  return {
    ...base, // 🔥 garde itemTraits

    categoryOptions: [
      { value: "melee", label: "Melee" },
      { value: "ranged", label: "Ranged" }
    ],

    handednessOptions: [
      { value: "one", label: "One Hand" },
      { value: "two", label: "Two Hands" },
      { value: "special", label: "Special" }
    ],

    positiveTraits: Object.entries(WEAPON_TRAITS)
      .filter(([_, v]) => v.type === "positive")
      .map(([key, value]) => {
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
      }),

    negativeTraits: Object.entries(WEAPON_TRAITS)
      .filter(([_, v]) => v.type === "negative")
      .map(([key, value]) => {
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
      }),
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

// =========================
// FIX AMMO NULL
// =========================

if (data.system.currentAmmo === "") {
  data.system.currentAmmo = null;
}

  // =========================
// FIX CHECKBOXES (CRUCIAL)
// =========================

data.system.consumesAmmo = !!data.system.consumesAmmo;
data.system.forceReload = !!data.system.forceReload;
data.system.equipped = !!data.system.equipped;
data.system.offhand = !!data.system.offhand;
data.system.isDefenseWeapon = !!data.system.isDefenseWeapon;

// =========================
// ITEM TRAITS (🔥 AJOUT)
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