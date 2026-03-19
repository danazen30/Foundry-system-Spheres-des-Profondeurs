import { SdpRoll } from "../rolls/roll.js";
import { SdpAttack } from "../combat/attack.js";
import { SDP } from "../system/config.js";

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class SdpActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
static tag = "form";
static formAssociated = true;
static DEFAULT_OPTIONS = {
  classes: ["sdp", "sheet", "actor"],

  position: {
    width: 800,
    height: 900
  },

  window: {
    frame: true,
    positioned: true,
    resizable: true,
    minimizable: true
  },

form: {
  handler: "onSubmit",
  submitOnChange: true
}
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

  // 🔥 FIX ICI
  _onRender(context, options) {
    super._onRender(context, options);

    const root = this.element;

    // ===== ATTRIBUTES =====
    root.querySelectorAll('[data-action="rollAttribute"]').forEach(el => {
      el.onclick = (e) => {
        const attr = e.currentTarget.dataset.attr;
        const value = this.document.system.attributes[attr].value;

        SdpRoll.basicTest(this.document, value, `Attribute Test (${attr})`);
      };
    });

    // ===== SKILLS =====
    root.querySelectorAll('[data-action="rollSkill"]').forEach(el => {
      el.onclick = (e) => {
        const itemId = e.currentTarget.dataset.itemId;
        const skill = this.document.items.get(itemId);

        SdpRoll.basicTest(this.document, skill.system.value, `Skill Test (${skill.name})`);
      };
    });

    // ===== ATTACK =====
    root.querySelectorAll('[data-action="weaponAttack"]').forEach(el => {
      el.onclick = (e) => {
        e.preventDefault();

        const itemId = e.currentTarget.dataset.itemId;
        const weapon = this.document.items.get(itemId);

        const attackValue = this.document.system.derived.attack.value;

        SdpAttack.attackTest(this.document, weapon, attackValue);
      };
    });

    // ===== CHECKBOXES =====
    root.querySelectorAll('[data-action="toggleWeaponEquip"]').forEach(el => {
      el.onclick = (e) => {
        const item = this.document.items.get(e.currentTarget.dataset.itemId);
        item.update({ "system.equipped": !item.system.equipped });
      };
    });

    root.querySelectorAll('[data-action="toggleOffhand"]').forEach(el => {
      el.onclick = (e) => {
        const item = this.document.items.get(e.currentTarget.dataset.itemId);
        item.update({ "system.offhand": !item.system.offhand });
      };
    });

    root.querySelectorAll('[data-action="toggleArmor"]').forEach(el => {
      el.onclick = (e) => {
        const item = this.document.items.get(e.currentTarget.dataset.itemId);
        item.update({ "system.worn.value": !item.system.worn.value });
      };
    });

  }

// =====================
// SAVE FORM
// =====================

async _updateObject(event, formData) {
  return this.document.update(formData);
}
render(force = false, options = {}) {

  // Si déjà rendue → on force un rerender propre
  if (this.rendered) {
    return super.render(true, { ...options, focus: true });
  }

  return super.render(force, options);
}

async onSubmit(event, form, formData) {
  await this.document.update(formData.object);
}

get id() {
  return `sdp-actor-sheet-${this.document.id}`;
}
}