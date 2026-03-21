import { SdpRoll } from "../rolls/roll.js";
import { SdpAttack } from "../combat/attack.js";
import { SDP } from "../system/config.js";

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class SdpActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["sdp", "sheet", "actor"],
    position: { width: 800, height: 900 },
    window: { resizable: true },
    form: { submitOnChange: true }
  };

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/actors/character-sheet.hbs"
    }
  };

  static LAYOUT = {
    template: "templates/applications/sheet.hbs",
    parts: ["sheet"]
  };



  async _prepareContext() {
    return {
      actor: this.document,
      system: this.document.system,
      config: SDP
    };
  }


  get id() {
    return `sdp-actor-sheet-${this.document.id}`;
  }
_onRender(context, options) {
  super._onRender(context, options);

  const root = this.element;

  // ===== ATTRIBUTES =====
  root.querySelectorAll('[data-action="rollAttribute"]').forEach(el => {
    el.addEventListener("click", (event) => {
      const attr = event.currentTarget.dataset.attr;
      const value = this.document.system.attributes[attr].value;

      SdpRoll.basicTest(this.document, value);
    });
  });

  // ===== SKILLS =====
  root.querySelectorAll('[data-action="rollSkill"]').forEach(el => {
    el.addEventListener("click", (event) => {
      const skill = this.document.items.get(event.currentTarget.dataset.itemId);

      SdpRoll.basicTest(this.document, skill.system.value);
    });
  });

  // ===== ATTACK =====
  root.querySelectorAll('[data-action="weaponAttack"]').forEach(el => {
    el.addEventListener("click", (event) => {
      const weapon = this.document.items.get(event.currentTarget.dataset.itemId);
      const attackValue = this.document.system.derived.attack.value;

      SdpAttack.attackTest(this.document, weapon, attackValue);
    });
  });

  // ===== CHECKBOXES =====
  root.querySelectorAll('[data-action="toggleWeaponEquip"]').forEach(el => {
    el.addEventListener("click", (event) => {
      const item = this.document.items.get(event.currentTarget.dataset.itemId);
      item.update({ "system.equipped": !item.system.equipped });
    });
  });

  root.querySelectorAll('[data-action="toggleOffhand"]').forEach(el => {
    el.addEventListener("click", (event) => {
      const item = this.document.items.get(event.currentTarget.dataset.itemId);
      item.update({ "system.offhand": !item.system.offhand });
    });
  });

  root.querySelectorAll('[data-action="toggleArmor"]').forEach(el => {
    el.addEventListener("click", (event) => {
      const item = this.document.items.get(event.currentTarget.dataset.itemId);
      item.update({ "system.worn.value": !item.system.worn.value });
    });
  });

  // ===== SKILL ADV =====
root.querySelectorAll('[data-action="updateSkillAdv"]').forEach(el => {
  el.addEventListener("change", (event) => {

    const input = event.currentTarget;
    const item = this.document.items.get(input.dataset.itemId);

    item.update({
      "system.advances": Number(input.value)
    });

  });
});


// ===== CONDITIONS (MANUELLES PROPRE) =====
root.querySelectorAll('.condition-input').forEach(el => {

  el.addEventListener("change", async (event) => {

    const input = event.currentTarget;
    const key = input.dataset.key;
    const value = Number(input.value) || 0;

    await this.document.update({
      [`system.conditions.${key}`]: value,
      [`system.conditionOverride.${key}`]: value
    });

  });

});

// ===== ATTRIBUTE MODIFIER (MANUEL + EFFECTS) =====
root.querySelectorAll('.attr-modifier-input').forEach(el => {

  el.addEventListener("change", async (event) => {

    const input = event.currentTarget;
    const key = input.dataset.key;
    const value = Number(input.value) || 0;

    await this.document.update({
      [`system.attributes.${key}.modifier`]: value
    });

  });

});

// ===== FIX CONDITION DISPLAY (FINAL) =====
for (const key in this.document.system.conditions) {

  const input = root.querySelector(
    `.condition-input[data-key="${key}"]`
  );

  if (!input) continue;

  const override = this.document.system.conditionOverride?.[key];
  const base = this.document.system.conditions[key] ?? 0;

  // 🔥 PRIORITÉ : override > base
  input.value = override !== undefined ? override : base;
}
}


}