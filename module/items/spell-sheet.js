import { SdpItemSheet } from "./item-sheet.js";

function normalizeOvercastEffects(raw) {
  if (Array.isArray(raw)) {
    return foundry.utils.duplicate(raw).map(normalizeOvercastEffectEntry);
  }

  if (raw && typeof raw === "object") {
    return Object.keys(raw)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => raw[key])
      .filter((entry) => entry && typeof entry === "object")
      .map((entry) => normalizeOvercastEffectEntry(foundry.utils.duplicate(entry)));
  }

  return [];
}

function normalizeOvercastEffectEntry(entry = {}) {
  return {
    label: entry.label ?? "",
    start:
      entry.start !== undefined && entry.start !== null && entry.start !== ""
        ? String(entry.start)
        : "0",
    value:
      entry.value !== undefined && entry.value !== null
        ? String(entry.value)
        : "1"
  };
}

export class SdpSpellSheet extends SdpItemSheet {

  constructor(...args) {

    super(...args);

    this.activeTab = "details";

  }

  static PARTS = {
    sheet: {
      template:
        "systems/sdp/templates/items/spell-sheet.hbs"
    }
  };

  async _prepareContext() {

    const context =
      await super._prepareContext();

    context.durationOptions = [
  {
    value: "round",
    label:
      game.i18n.localize(
        "SDP.DurationRound"
      )
  },
  {
    value: "minute",
    label:
      game.i18n.localize(
        "SDP.DurationMinute"
      )
  },
  {
    value: "hour",
    label:
      game.i18n.localize(
        "SDP.DurationHour"
      )
  },
  {
    value: "instant",
    label:
      game.i18n.localize(
        "SDP.DurationInstant"
      )
  }
];

    context.overcastSpecialEffects =
      normalizeOvercastEffects(
        this.document.system.overcastSpecialEffects?.value
      );

    return context;

  }

  /**
   * Foundry expandObject turns array fields into {0:..., 1:...}.
   * Keep overcast special effects as a real array so they stay visible.
   */
  _processFormData(event, form, formData) {

    const data =
      foundry.utils.expandObject(
        formData.object
      );

    data.system ??= {};

    data.system.overcastSpecialEffects ??= {};
    data.system.overcastSpecialEffects.value =
      normalizeOvercastEffects(
        data.system.overcastSpecialEffects.value
      );

    data.system.concentration ??= {};
    data.system.concentration.value =
      !!data.system.concentration?.value;

    data.system.aoe ??= {};
    data.system.aoe.value =
      !!data.system.aoe?.value;

    data.system.lockTargets ??= {};
    data.system.lockTargets.value =
      !!data.system.lockTargets?.value;

    data.system.overcast ??= {};
    data.system.overcast.value =
      !!data.system.overcast?.value;

    data.system.memorized ??= {};
    data.system.memorized.value =
      !!data.system.memorized?.value;

    data.system.duration ??= {};
    data.system.duration.extendable =
      !!data.system.duration?.extendable;

    return data;

  }

  _onRender(context, options) {

    super._onRender(
      context,
      options
    );

    const root =
      this.getRoot();

    // =========================
    // ADD OVERCAST
    // =========================

    const addBtn =
      root.querySelector(
        ".add-overcast-special"
      );

    if (addBtn) {

      addBtn.addEventListener(
        "click",
        async () => {

          const effects =
            normalizeOvercastEffects(
              this.document.system
                .overcastSpecialEffects
                ?.value
            );

          effects.push({
            label:
  game.i18n.localize(
    "SDP.NewEffect"
  ),
            start: "0",
            value: "1"
          });

          await this.document.update({
            "system.overcastSpecialEffects.value":
              effects
          });

        }
      );

    }

    // =========================
    // REMOVE OVERCAST
    // =========================

    root.querySelectorAll(
      ".remove-overcast-special"
    ).forEach(btn => {

      btn.addEventListener(
        "click",
        async (event) => {

          const index =
            Number(
              event.currentTarget
                .closest(
                  ".overcast-special-item"
                )
                .dataset.index
            );

          const effects =
            normalizeOvercastEffects(
              this.document.system
                .overcastSpecialEffects
                ?.value
            );

          effects.splice(index, 1);

          await this.document.update({
            "system.overcastSpecialEffects.value":
              effects
          });

        }
      );

    });

  }

}
