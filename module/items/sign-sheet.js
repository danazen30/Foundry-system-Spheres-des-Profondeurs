const { ItemSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class SdpSignSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["sdp", "sheet", "item"],
    position: { width: 400, height: 500 }
  };

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/sign-sheet.hbs"
    }
  };

  static LAYOUT = {
    template: "templates/applications/sheet.hbs",
    parts: ["sheet"]
  };

  async _prepareContext() {
    return {
      item: this.document,
      system: this.document.system
    };
  }

_onRender(context, options) {
  super._onRender(context, options);

  const root = this.element;

  // =========================
  // DEBUG
  // =========================
  console.log("SIGN SHEET RENDERED");

// =========================
  // AUTO SAVE INPUT / TEXTAREA
  // =========================

  root.querySelectorAll("input, textarea").forEach(el => {
    el.addEventListener("change", async (event) => {

      const input = event.currentTarget;
      const path = input.name;
      let value = input.value;

      // number safety
      if (input.type === "number") {
        value = Number(value);
      }

      await this.item.update({
        [path]: value
      });

    });
  });


  // =========================
  // INPUT UPDATE (SAFE V2)
  // =========================

  root.querySelectorAll("input").forEach(input => {
    input.addEventListener("change", async (event) => {

      const inputEl = event.currentTarget;

      await this.document.update({
        [inputEl.name]: inputEl.value
      });

    });
  });

  // =========================
  // ADD LEVEL (FIX)
  // =========================

  const addBtn = root.querySelector(".add-level");

  console.log("ADD BTN:", addBtn); // 🔥 IMPORTANT

  if (addBtn) {
    addBtn.addEventListener("click", async () => {

      console.log("CLICK ADD LEVEL"); // 🔥 IMPORTANT

      const levels = foundry.utils.deepClone(this.document.system.levels || {});

      const newLevel = Object.keys(levels).length + 1;

      levels[newLevel] = {
        hp: "1d4",
        damageBonus: "",
        inspirationDice: ""
      };

      await this.document.update({
        "system.levels": levels
      });

    });
  }

  // =========================
  // DELETE LEVEL
  // =========================

  root.querySelectorAll(".delete-level").forEach(btn => {

    btn.addEventListener("click", async (ev) => {

      const level = ev.currentTarget.closest(".level-block").dataset.level;

      const levels = foundry.utils.deepClone(this.document.system.levels);

      delete levels[level];

      await this.document.update({
        "system.levels": levels
      });

    });

  });

}

}

