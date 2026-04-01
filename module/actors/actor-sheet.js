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
    const attributes = SDP.ATTRIBUTE_ORDER.map(key => {
  return {
    key,
    ...this.document.system.attributes[key]
  };
});

const skillMap = Object.fromEntries(
  this.document.items
    .filter(i => i.type === "skill")
    .map(i => [i.name, i.system])
);

const currentCareer = this.document.items.find(
    i => i.type === "career" && i.system.current
  );

return {
  actor: this.document,
  system: this.document.system,
  config: SDP,
  attributes,
  currentCareer,
  skillMap,
  user: game.user
};
  }

  async _applyCareer(career) {

  const actor = this.document;

  // =========================
  // SET CURRENT
  // =========================

  for (const c of actor.items.filter(i => i.type === "career")) {
    await c.update({ "system.current": false });
  }

  await career.update({ "system.current": true });

  // =========================
  // UPDATE DETAILS
  // =========================

  await actor.update({
    "system.details.career.value": career.name,
    "system.details.careerGroup.value": career.system.careerGroup || "",
    "system.details.standing.value": career.system.standing || ""
  });

  // =========================
  // AUTO ADD SKILLS
  // =========================

  let skills = career.system.skills || [];

if (typeof skills === "string") {
  skills = skills.split(",").map(s => s.trim());
}

if (!Array.isArray(skills)) {
  skills = [];
}

  for (const skillName of skills) {

    const exists = actor.items.find(i =>
      i.type === "skill" && i.name === skillName
    );

    if (!exists) {

      let baseSkill = game.items.find(i =>
        i.type === "skill" && i.name === skillName
      );

      if (!baseSkill) {

        const pack = game.packs.get("sdp.skills");

        if (pack) {

          const index = await pack.getIndex();
          const entry = index.find(i => i.name === skillName);

          if (entry) {
            baseSkill = await pack.getDocument(entry._id);
          }

        }

      }


      if (baseSkill) {
        await actor.createEmbeddedDocuments("Item", [
          baseSkill.toObject()
        ]);
      }

    }

  }

        // =========================
// AUTO ADD TALENTS
// =========================

let talents = career.system.talents || [];

if (typeof talents === "string") {
  talents = talents.split(",").map(t => t.trim());
}

if (!Array.isArray(talents)) {
  talents = [];
}

for (const talentName of talents) {

  const exists = actor.items.find(i =>
    i.type === "talent" && i.name === talentName
  );

  if (!exists) {

    let baseTalent = game.items.find(i =>
      i.type === "talent" && i.name === talentName
    );

    if (!baseTalent) {

      const pack = game.packs.get("sdp.talents");

      if (pack) {

        const index = await pack.getIndex();
        const entry = index.find(i => i.name === talentName);

        if (entry) {
          baseTalent = await pack.getDocument(entry._id);
        }

      }

    }

    if (baseTalent) {
      await actor.createEmbeddedDocuments("Item", [
        baseTalent.toObject()
      ]);
    }

  }

}

  await this.render();

}


  get id() {
    return `sdp-actor-sheet-${this.document.id}`;
  }

  async _onDropItem(event, data) {

  const item = await Item.fromDropData(data);

  if (item.type !== "career") return super._onDropItem(event, data);

  const actor = this.document;

  // =========================
  // CREATE CAREER ON ACTOR
  // =========================

  const created = await actor.createEmbeddedDocuments("Item", [item.toObject()]);

  const career = created[0];

  // =========================
  // SET AS CURRENT IF NONE
  // =========================

  const hasCurrent = actor.items.some(i => i.type === "career" && i.system.current);

if (!hasCurrent) {
  await this._applyCareer(career);
}

  return created;
}

  _onRender(context, options) {
  super._onRender(context, options);

  const root = this.element;

  // ===== ATTRIBUTES =====
root.querySelectorAll('[data-action="rollAttribute"]').forEach(el => {
  el.addEventListener("click", (event) => {
    const attr = event.currentTarget.dataset.attr;
    const attrData = this.document.system.attributes[attr];

    const value = attrData.value;

    SdpRoll.openDialog({
      actor: this.document,
      type: "skill",
      label: attrData.name || attrData.label,
      target: value
    });
  });
});

  // ===== SKILLS =====
  root.querySelectorAll('[data-action="rollSkill"]').forEach(el => {
    el.addEventListener("click", (event) => {
      const skill = this.document.items.get(event.currentTarget.dataset.itemId);

      SdpRoll.openDialog({
  actor: this.document,
  type: "skill",
  label: skill.name,
  target: skill.system.value
});
    });
  });

  // ===== ATTACK =====
  root.querySelectorAll('[data-action="weaponAttack"]').forEach(el => {
    el.addEventListener("click", (event) => {
      const weapon = this.document.items.get(event.currentTarget.dataset.itemId);
      const attackValue = this.document.system.derived.attack.value;

SdpRoll.openDialog({
  actor: this.document,
  type: "attack",
  label: weapon.name,
  target: attackValue,
  weapon: weapon
});
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

// =========================
// SKILL ADV INPUT (GM)
// =========================

root.querySelectorAll('[data-action="updateSkillAdv"]').forEach(el => {

  el.addEventListener("change", async (event) => {

    if (!game.user.isGM) return;

    const input = event.currentTarget;
    const item = this.document.items.get(input.dataset.itemId);

    await item.update({
      "system.advances": Number(input.value) || 0
    });

  });

});


root.querySelectorAll('.condition-input').forEach(el => {

  el.addEventListener("change", async (event) => {

    const input = event.currentTarget;
    const key = input.dataset.key;
    const value = Number(input.value) || 0;

    const actor = this.document;

    // valeur actuelle (affichée)
    const previous = actor.system.conditions?.[key] ?? 0;

await actor.update({
  [`system.conditions.${key}`]: value
});

if (
  (key === "stunned" || key === "poisoned" || key === "bleeding") &&
  previous > 0 &&
  value === 0
) {
  await actor.update({
    "system.conditions.exhausted":
      (actor.system.conditions.exhausted || 0) + 1
  });
}

  });

});


// ===== ATTRIBUTE MODIFIER (MANUEL + EFFECTS) =====
root.querySelectorAll('[data-action="updateConditionState"]').forEach(el => {

  el.addEventListener("change", async (event) => {

    const input = event.currentTarget;
    const key = input.dataset.key;
    const checked = input.checked;

    const actor = this.document;
    const previous = actor.system.conditions?.[key];

    await actor.update({
      [`system.conditions.${key}`]: checked
    });

    // =========================
    // SHAKEN / FRIGHTENED
    // =========================

    if (key === "frightened") {

      if (checked) {
        await actor.update({
          "system.conditions.shaken": false
        });
      } else {
        await actor.update({
          "system.conditions.shaken": true
        });
      }

    }

    // =========================
    // SHAKEN → EXHAUSTED
    // =========================

    if (key === "shaken" && previous === true && checked === false) {

      await actor.update({
        "system.conditions.exhausted":
          (actor.system.conditions.exhausted || 0) + 1
      });

    }

    // =========================
    // UNCONSCIOUS → PRONE
    // =========================

    if (key === "unconscious" && checked) {

      await actor.update({
        "system.conditions.prone": true
      });

    }

    // =========================
    // DYING → UNCONSCIOUS
    // =========================

    if (key === "dying" && checked) {

  await actor.update({
    "system.conditions.unconscious": true,
    "system.conditions.prone": true
  });

}

  });

});

root.querySelectorAll('.movement-input').forEach(el => {

  el.addEventListener("change", async (event) => {

    const input = event.currentTarget;
    const newDisplayed = Number(input.value) || 0;

    const actor = this.document;

    const slowed = actor.system.conditionTotals?.slowed ?? 0;

    // IMPORTANT : recalcul propre de la base
    const newBase = newDisplayed + slowed;

    await actor.update({
      "system.resources.movement.value": newBase
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

root.querySelectorAll('[data-action="editItem"]').forEach(el => {
  el.addEventListener("click", (event) => {

    const item = this.document.items.get(event.currentTarget.dataset.itemId);

    item.sheet.render(true);

  });
});

root.querySelectorAll('[data-action="deleteItem"]').forEach(el => {
  el.addEventListener("click", async (event) => {

    const item = this.document.items.get(event.currentTarget.dataset.itemId);

    await item.delete();

  });
});

root.querySelectorAll('[data-action="updateTalentAdv"]').forEach(el => {
  el.addEventListener("change", async (event) => {

    const input = event.currentTarget;
    const item = this.document.items.get(input.dataset.itemId);

    await item.update({
      "system.advances": Number(input.value)
    });

  });
});

root.querySelectorAll('[data-action="addSpeciesTest"]').forEach(el => {
  el.addEventListener("click", async (event) => {

  const button = event.currentTarget;

  if (button.disabled) return;
  button.disabled = true;

    const species = game.items.filter(i => i.type === "specie");

    if (species.length === 0) {
      ui.notifications.warn("No specie found");
      return;
    }

    const specie = species[0];
    const actor = this.document;

    // =========================
    // APPLY BASE ATTRIBUTES (REPLACE)
    // =========================

    const updates = {};

    for (const [key, value] of Object.entries(specie.system.baseAttributes || {})) {

      if (value === 0 || value === null || value === undefined) continue;

      const path = `system.attributes.${key}.initial`;

      updates[path] = value;
    }

    // =========================
// MOVEMENT (SPECIE)
// =========================

if (specie.system.movement?.walk !== undefined) {

  updates["system.resources.movement.walk"] = specie.system.movement.walk;

  // recalcul run (optionnel mais conseillé)
  updates["system.resources.movement.run"] = specie.system.movement.walk * 2;

}

    await actor.update(updates);

    // =========================
    // REMOVE EXISTING SPECIE
    // =========================

    const existing = actor.items.find(i => i.type === "specie");
    if (existing) await existing.delete();

    // =========================
    // ADD SPECIE ITEM
    // =========================

    await actor.createEmbeddedDocuments("Item", [specie.toObject()]);

  });
});

// =========================
// CAREER CURRENT
// =========================

root.querySelectorAll('[data-action="toggleCareerCurrent"]').forEach(el => {
  el.addEventListener("change", async (event) => {

    const item = this.document.items.get(event.currentTarget.dataset.itemId);

    await this._applyCareer(item);

  });
});

// =========================
// CAREER COMPLETED
// =========================

root.querySelectorAll('[data-action="toggleCareerCompleted"]').forEach(el => {
  el.addEventListener("change", async (event) => {

    const item = this.document.items.get(event.currentTarget.dataset.itemId);

    await item.update({
      "system.completed": event.currentTarget.checked
    });

  });
});

// =========================
// ATTRIBUTE ADVANCE BUTTON
// =========================

root.querySelectorAll('[data-action="advanceAttribute"]').forEach(el => {

  // CLICK GAUCHE → +1
  el.addEventListener("click", async (event) => {

    const key = event.currentTarget.dataset.attr;
    const actor = this.document;

    const current = actor.system.attributes[key].advances || 0;

    await actor.update({
      [`system.attributes.${key}.advances`]: current + 1
    });

  });

  // CLICK DROIT → -1
  el.addEventListener("contextmenu", async (event) => {

    event.preventDefault(); // 🚨 important (sinon menu navigateur)

    const key = event.currentTarget.dataset.attr;
    const actor = this.document;

    const current = actor.system.attributes[key].advances || 0;

    await actor.update({
      [`system.attributes.${key}.advances`]: Math.max(0, current - 1)
    });

  });

});

// =========================
// SKILL ADVANCE BUTTON
// =========================

root.querySelectorAll('[data-action="advanceSkill"]').forEach(el => {

  // CLICK GAUCHE
  el.addEventListener("click", async (event) => {

    const item = this.document.items.get(event.currentTarget.dataset.itemId);

    const current = item.system.advances || 0;

    await item.update({
      "system.advances": current + 1
    });

  });

  // CLICK DROIT
  el.addEventListener("contextmenu", async (event) => {

    event.preventDefault();

    const item = this.document.items.get(event.currentTarget.dataset.itemId);

    const current = item.system.advances || 0;

    await item.update({
      "system.advances": Math.max(0, current - 1)
    });

  });

});

// =========================
// ATTRIBUTE ADV INPUT (GM FIX)
// =========================

root.querySelectorAll('input[name^="system.attributes"][name$=".advances"]').forEach(el => {

  el.addEventListener("change", async (event) => {

    if (!game.user.isGM) return;

    const input = event.currentTarget;

    const path = input.name;
    const value = Number(input.value) || 0;

    await this.document.update({
      [path]: value
    });

  });

});

// =========================
// TALENT ADVANCE BUTTON
// =========================

root.querySelectorAll('[data-action="advanceTalent"]').forEach(el => {

  // CLICK GAUCHE
  el.addEventListener("click", async (event) => {

    const item = this.document.items.get(event.currentTarget.dataset.itemId);

    const current = item.system.advances || 0;

    await item.update({
      "system.advances": current + 1
    });

  });

  // CLICK DROIT
  el.addEventListener("contextmenu", async (event) => {

    event.preventDefault();

    const item = this.document.items.get(event.currentTarget.dataset.itemId);

    const current = item.system.advances || 0;

    await item.update({
      "system.advances": Math.max(0, current - 1)
    });

  });

});

}}



