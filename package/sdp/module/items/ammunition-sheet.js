import { SdpItemSheet } from "./item-sheet.js";
import { WEAPON_TRAITS } from "../system/config.js";
import {
  getWeaponGroupSelectOptions
} from "../system/weapon-group-utils.js";

export class SdpAmmunitionSheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/ammunition-sheet.hbs"
    }
  };

  async _prepareContext() {

    const base =
      await super._prepareContext();

    const system = this.document.system ?? {};

    const traitsArray =
      this.document.system.traits ?? [];

    const mapTraits = (type) => {

      return Object.entries(WEAPON_TRAITS)

        .filter(([_, value]) =>
          value.type === type
        )

        .map(([key, value]) => ({

          key,
          label: value.label,
          description: value.description,
          hasValue: value.hasValue,

          checked:
            traitsArray.some(t => {

              if (!t) return false;

              if (typeof t === "string") {
                return t === key;
              }

              return t.key === key;

            }),

          value:
            traitsArray.find(t =>
              typeof t === "object"
              && t.key === key
            )?.value || ""

        }));

    };

    return {
      ...base,

      weaponGroupOptions:
        getWeaponGroupSelectOptions({
          currentValue: system.weaponGroup
        }),

      positiveTraits:
        mapTraits("positive"),

      negativeTraits:
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
    // WEAPON TRAITS
    // =========================

    const traitsObj =
      data.system.traits || {};

    const finalTraits = [];

    for (
      const [key, t]
      of Object.entries(traitsObj)
    ) {

      if (!t?.selected) continue;

      finalTraits.push({
        key,
        value: t.value ?? ""
      });

    }

    data.system.traits =
      finalTraits;

    return data;

  }

}