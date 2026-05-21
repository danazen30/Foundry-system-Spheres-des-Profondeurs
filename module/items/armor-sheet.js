import { SdpItemSheet } from "./item-sheet.js";

export class SdpArmorSheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/armor-sheet.hbs"
    }
  };

  async _prepareContext() {

    const base =
      await super._prepareContext();

    const { ARMOR_TRAITS } =
      CONFIG.SDP;

    const traitsArray =
      this.document.system.armorTraits ?? [];

    const mapTraits = (type) => {

      return Object.entries(ARMOR_TRAITS)

        .filter(([_, v]) =>
          v.type === type
        )

        .map(([key, value]) => {

          const existing =
            traitsArray.find(t => {

              if (!t) return false;

              if (typeof t === "string") {
                return t === key;
              }

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

    return {
      ...base,
      positiveArmorTraits:
        mapTraits("positive"),

      negativeArmorTraits:
        mapTraits("negative")
    };

  }

  _processFormData(event) {

    const form =
      event.currentTarget;

    const fd =
      new FormData(form);

    const formData =
      Object.fromEntries(fd.entries());

    const data =
      foundry.utils.expandObject(formData);

    if (!data.system) {
      data.system = {};
    }

    // =========================
    // ITEM TRAITS
    // =========================

    const itemTraitsObj =
      data.system.itemTraits || {};

    const finalItemTraits = [];

    for (
      const [key, t]
      of Object.entries(itemTraitsObj)
    ) {

      if (!t?.selected) continue;

      finalItemTraits.push({
        key,
        value: t.value ?? ""
      });

    }

    data.system.itemTraits =
      finalItemTraits;

    // =========================
    // ARMOR TRAITS
    // =========================

    const armorTraitsObj =
      data.system.armorTraits || {};

    const finalArmorTraits = [];

    for (
      const [key, t]
      of Object.entries(armorTraitsObj)
    ) {

      if (!t?.selected) continue;

      finalArmorTraits.push({
        key,
        value: t.value ?? ""
      });

    }

    data.system.armorTraits =
      finalArmorTraits;

    // =========================
    // SLOTS FIX
    // =========================

    const slotKeys = [
      "head",
      "chest",
      "armLeft",
      "armRight",
      "legLeft",
      "legRight"
    ];

    data.system.slots =
      data.system.slots || {};

    for (const key of slotKeys) {

      data.system.slots[key] =
        !!data.system.slots[key];

    }

    return data;

  }

}