import { SdpActorSheet } from "./actor-sheet.js";
import { ensureDefaultCurrencies } from "../chat/actor-handler.js";

const VEHICLE_ARMOR_TRAIT_KEYS = [
  "padded",
  "dense",
  "layered"
];

const VEHICLE_ARMOR_TRAIT_META = {
  padded: {
    label: "SDP.ArmorTraitPadded",
    hint: "SDP.VehicleArmorTraitPaddedHint"
  },
  dense: {
    label: "SDP.ArmorTraitDense",
    hint: "SDP.VehicleArmorTraitDenseHint"
  },
  layered: {
    label: "SDP.ArmorTraitLayered",
    hint: "SDP.VehicleArmorTraitLayeredHint"
  }
};

export class SdpVehicleSheet extends SdpActorSheet {

  constructor(...args) {
    super(...args);
    this.activeTab = "inventory";
  }

  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,

    classes: [
      "sdp",
      "sheet",
      "actor",
      "vehicle"
    ],

    position: {
      width: 600,
      height: 700
    }
  };

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/actors/vehicle-sheet.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.isVehicle = true;

    if (!game.user.isGM && this.activeTab === "info") {
      this.activeTab = "inventory";
    }

    context.activeTab = this.activeTab;

    const description =
      this.document.system.description?.value ?? "";

    context.editors = {
      ...(context.editors ?? {}),
      description: await foundry.applications.ux.TextEditor.enrichHTML(
        description,
        { async: true }
      )
    };

    const traits = this.document.system.armorTraits ?? {};
    context.vehicleArmorTraits = VEHICLE_ARMOR_TRAIT_KEYS.map((key) => ({
      key,
      label: VEHICLE_ARMOR_TRAIT_META[key].label,
      hint: VEHICLE_ARMOR_TRAIT_META[key].hint,
      selected: traits[key] === true
    }));

    return context;
  }

  async _onFirstRender(context, options) {
    await super._onFirstRender?.(context, options);
    const created = await ensureDefaultCurrencies(this.actor);
    if (created) await this.render(false);
  }

  async _onRender(context, options) {
    await super._onRender?.(context, options);
    this._bindVehicleArmorTraitInputs();
  }

  _bindVehicleArmorTraitInputs() {
    const root = this.element;
    if (!root || !game.user.isGM) return;

    root
      .querySelectorAll("[data-vehicle-armor-trait]")
      .forEach((input) => {
        if (input.dataset.bound === "1") return;
        input.dataset.bound = "1";

        input.addEventListener("click", (event) => {
          event.stopPropagation();
        });

        input.addEventListener("change", async (event) => {
          event.stopPropagation();
          const key = event.currentTarget.dataset.vehicleArmorTrait;
          if (!VEHICLE_ARMOR_TRAIT_KEYS.includes(key)) return;

          const next = {
            padded: this.actor.system.armorTraits?.padded === true,
            dense: this.actor.system.armorTraits?.dense === true,
            layered: this.actor.system.armorTraits?.layered === true,
            [key]: !!event.currentTarget.checked
          };

          await this.actor.update({
            "system.armorTraits": next
          });
        });
      });
  }

}
