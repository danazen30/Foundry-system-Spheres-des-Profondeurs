import { SdpRoll } from "../rolls/roll.js";
import { SdpAttack } from "../combat/attack.js";
import { SDP } from "../system/config.js";
import { SimpleDialog } from "../apps/simple-dialog.js";
import { SdpSpell } from "../combat/spell.js";

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

_getCost(type, value) {

  const table = {
    attribute: [
      [5, 25],[10,30],[15,40],[20,50],[25,100],[30,150],
      [35,200],[40,250],[45,300],[50,350],[55,400],
      [60,450],[65,550],[70,600],[999,650]
    ],
    skill: [
      [5,10],[10,15],[15,20],[20,30],[25,60],[30,90],
      [35,120],[40,150],[45,180],[50,210],[55,240],
      [60,270],[65,300],[70,330],[999,360]
    ]
  };

  const ranges = table[type];

  for (let [max, cost] of ranges) {
    if ((value + 1) <= max) return cost;
  }

  return 0;
}

_getTalentCost(current) {
  return (current + 1) * 100;
}

_getTalentMax(item) {

  const max = item.system.max;

  // si attribut
  if (this.document.system.attributes[max]) {
    return this.document.system.attributes[max].bonus;
  }

  // sinon nombre
  return Number(max) || 0;
}

  async _prepareContext() {
    const context = {};
    const attributes = SDP.ATTRIBUTE_ORDER.map(key => {
  return {
    key,
    ...this.document.system.attributes[key]
  };
});

const sign = this.document.getSign();
const signEffects = this.actor.getSignEffects();

const xp = this.document.system.details?.experience ?? {};


const xpData = {
  total: xp.total ?? 0,
  spent: xp.spent ?? 0,
  available: (xp.total ?? 0) - (xp.spent ?? 0),
  log: Array.isArray(xp.log) ? xp.log : []
};

const skillMap = Object.fromEntries(
  this.document.items
    .filter(i => i.type === "skill")
    .map(i => [i.name, i.system])
);

const currentCareer = this.document.items.find(
    i => i.type === "career" && i.system.current
  );

  const xpTotal = xpData.total;
const currentLevel = this.document.system.details?.level ?? 0;

const nextXP = game.sdp.level.getNextLevelXP(currentLevel);
const currentLevelXP = game.sdp.level.LEVELS.find(l => l.level === currentLevel)?.xp ?? 0;

let xpProgress = 0;

if (nextXP !== null) {
  xpProgress = Math.min(
    100,
    Math.floor(((xpTotal - currentLevelXP) / (nextXP - currentLevelXP)) * 100)
  );
}

// =========================
// SPELLS SORTING
// =========================

const spells = this.document.items.filter(i => i.type === "spell");

const spellsMinor = spells.filter(s =>
  (s.system.magicType?.value || "minor") === "minor"
);

const spellsAdvanced = spells.filter(s =>
  (s.system.magicType?.value || "minor") === "advanced"
);

const spellsSuperior = spells.filter(s =>
  (s.system.magicType?.value || "minor") === "superior"
);

// =========================
// WEAPONS SPLIT
// =========================

const weapons = this.document.items.filter(i => i.type === "weapon");
const allAmmo = this.document.items.filter(i => i.type === "ammunition");

const meleeWeapons = weapons.filter(w => w.system.category === "melee");

const rangedWeapons = weapons
  .filter(w => w.system.category === "ranged");

for (let w of rangedWeapons) {

  w.compatibleAmmo = allAmmo.filter(a =>
    a.system.weaponGroup === w.system.ammunitionGroup
  );

}
console.log("SDP | Ammo mapping", {
  ranged: rangedWeapons.map(w => ({
    weapon: w.name,
    ammo: w.compatibleAmmo.map(a => a.name)
  }))
});

console.log("SDP | Weapons split", {
  melee: meleeWeapons.length,
  ranged: rangedWeapons.length
});

const ammunition = this.document.items.filter(i => i.type === "ammunition");

console.log("SDP | Ammo count", ammunition.length);

return {
  actor: this.document,
  system: this.document.system,
  config: SDP,
  attributes,
  currentCareer,
  skillMap,
  user: game.user,
  xp: xpData,
  sign,
  signEffects,
  canLevelUp: game.sdp.level.canLevelUp(this.actor),
  availableLevel: game.sdp.level.getAvailableLevel(this.actor),
  levelProgression: this.document.system.details?.levelProgression ?? [],
  xpBar: {
  value: xpTotal,
  currentLevel,
  nextXP,
  percent: xpProgress
  },
  spellsMinor,
  spellsAdvanced,
  spellsSuperior,
  meleeWeapons,
  rangedWeapons,
  ammunition
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

async _addXPLog(entry) {

  const xp = this.document.system.details.experience;

  const log = Array.isArray(xp.log) ? [...xp.log] : [];

  const total = xp.total || 0;
  const spent = (xp.spent || 0);

  let label = "";

  if (entry.type === "spend") {
  label = `${entry.target} (${entry.old} → ${entry.value}) : -${entry.amount} XP (${spent} / ${total})${entry.reason ? " - " + entry.reason : ""}`;
}
else if (entry.type === "refund") {
  label = `${entry.target} (${entry.old} → ${entry.value}) : +${entry.amount} XP (${spent} / ${total})${entry.reason ? " - " + entry.reason : ""}`;
}
else if (entry.type === "gain") {
  label = `+${entry.amount} XP (${spent} / ${total}) - ${entry.reason || ""}`;
}

  log.unshift({
    label
  });

  await this.document.update({
    "system.details.experience.log": log
  });

}

  get id() {
    return `sdp-actor-sheet-${this.document.id}`;
  }

async _onDropItem(event, data) {

  const item = await Item.fromDropData(data);
  const actor = this.document;

  console.log("DROP ITEM:", item); // 🔥 debug

  // =========================
  // SIGN (FIX PRINCIPAL)
  // =========================

  if (item.type === "sign") {

    // 🔥 supprime ancien sign (optionnel mais recommandé)
    const existing = actor.items.find(i => i.type === "sign");
    if (existing) await existing.delete();

    // 🔥 ajoute le sign
    const created = await actor.createEmbeddedDocuments("Item", [item.toObject()]);

    console.log("SIGN ADDED:", created);

    await this.render();

    return created;
  }

  // =========================
  // CAREER (ton code existant)
  // =========================

  if (item.type === "career") {

    const created = await actor.createEmbeddedDocuments("Item", [item.toObject()]);
    const career = created[0];

    const hasCurrent = actor.items.some(i => i.type === "career" && i.system.current);

    if (!hasCurrent) {
      await this._applyCareer(career);
    }

    await this.render();

    return created;
  }

  // =========================
  // AUTRES ITEMS
  // =========================

  const created = await actor.createEmbeddedDocuments("Item", [item.toObject()]);

  await this.render();

  return created;
}

async _toggleSpellMemory(event) {

  event.preventDefault();

  const itemId = event.currentTarget.dataset.itemId;
  const item = this.actor.items.get(itemId);

  if (!item) return;

  const current = item.system.memorized?.value ?? false;

  await item.update({
    "system.memorized.value": !current
  });

}

async _castSpell(event) {

  event.preventDefault();

  const itemId = event.currentTarget.dataset.itemId;
  const spell = this.actor.items.get(itemId);

  if (!spell) return;

  const actor = this.actor;

  // =========================
  // MANA CHECK (simple)
  // =========================

  const cost = spell.system.power.value || 0;
  const mana = actor.system.resources.mana.value;

  if (mana < cost) {
    ui.notifications.warn("Not enough mana");
    return;
  }

  // =========================
  // TARGET VALUE (IMPORTANT)
  // =========================

const bestSkill = SdpSpell._getBestSpellSkill(actor, spell);

let skillLabel = "Intelligence";
let skillValue = actor.system.attributes.intelligence.value;

if (bestSkill){
  skillLabel = bestSkill.name;
  skillValue = bestSkill.system.value;
}

SdpRoll.openDialog({
  actor: actor,
  type: "attack",
  label: spell.name,
  target: skillValue,
  weapon: spell,
  isSpell: true,

  // 🔥 AJOUT
  spellData: {
    skillLabel,
    skillValue
  }
});

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

if (!weapon) return;

// =========================
// WEAPON QUANTITY CHECK
// =========================

const weaponQty = weapon.system.quantity?.value;

console.log("SDP | Weapon qty check", {
  weapon: weapon.name,
  qty: weaponQty
});

// 🔥 uniquement si défini
if (weaponQty !== undefined && weaponQty !== null && weaponQty <= 0) {

  ui.notifications.warn(`${weapon.name} is depleted`);
  return;

}

// =========================
// AMMO CHECK (AVANT DIALOG)
// =========================

if (weapon.system.category === "ranged" && weapon.system.consumesAmmo) {

  if (!weapon.system.currentAmmo) {

    ui.notifications.warn("No ammunition selected");
    return;

  }

  const ammo = this.document.items.get(weapon.system.currentAmmo);

  if (!ammo) {

    ui.notifications.warn("Ammunition not found");
    return;

  }

  const qty = ammo.system.quantity?.value ?? 0;

  console.log("SDP | UI Ammo check", {
    weapon: weapon.name,
    ammo: ammo.name,
    qty
  });

  if (qty <= 0) {

    ui.notifications.warn("No ammunition left");
    return;

  }

}

// =========================
// NORMAL FLOW
// =========================

let target;

// =========================
// RANGED
// =========================

if (weapon.system.category === "ranged") {

  target = this.document._getBestWeaponSkill(weapon);

}

    // =========================
    // MELEE
    // =========================

    else {

      target = this.document.system.derived.attack.value;

    }

    SdpRoll.openDialog({
      actor: this.document,
      type: "attack",
      label: weapon.name,
      target: target,
      weapon: weapon
    });

  });
});

  // ===== CHECKBOXES =====
root.querySelectorAll('[data-action="toggleWeaponEquip"]').forEach(el => {
  el.addEventListener("click", async (event) => {

  event.preventDefault(); // 🔥 bloque le toggle visuel
  event.stopPropagation(); // 🔥 sécurité


    const item = this.document.items.get(event.currentTarget.dataset.itemId);
    const actor = this.document;

    const isEquipping = !item.system.equipped;

    if (!isEquipping) {
      await item.update({ "system.equipped": false });
      return;
    }

    const equipped = actor.items.filter(i =>
      i.type === "weapon" &&
      i.system.equipped &&
      i.id !== item.id
    );

    const handed = (item.system.handedness || "").toLowerCase();

    console.log("HAND:", handed);
    console.log("EQUIPPED:", equipped.map(w => w.system.handedness));

    // =========================
    // SPECIAL
    // =========================

    if (handed === "special") {
      await item.update({ "system.equipped": true });
      return;
    }

    // =========================
    // CHECK 2H EXIST
    // =========================

    const hasTwoHanded = equipped.some(w =>
      (w.system.handedness || "").toLowerCase() === "two"
    );

    if (hasTwoHanded) {
      ui.notifications.warn("2H weapon already equipped");
      return;
    }

    // =========================
    // EQUIP 2H
    // =========================

    if (handed === "two") {

      const hasOther = equipped.some(w =>
        (w.system.handedness || "").toLowerCase() !== "special"
      );

      if (hasOther) {
        ui.notifications.warn("Cannot equip 2H with other weapons");
        return;
      }

      await item.update({ "system.equipped": true });
      return;
    }

    // =========================
    // ONE HAND LIMIT
    // =========================

    const oneHandedCount = equipped.filter(w =>
      (w.system.handedness || "").toLowerCase() === "one"
    ).length;

    if (oneHandedCount >= 2) {
      ui.notifications.warn("Max 2 one-hand weapons");
      return;
    }

    await item.update({ "system.equipped": true });
this.render(); // 🔥 refresh UI

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

// =========================
// SPELL MEMORY TOGGLE
// =========================
root.querySelectorAll('[data-action="toggleSpellMemory"]').forEach(el => {
  el.addEventListener("click", (event) => {
    this._toggleSpellMemory(event);
  });
});

// =========================
// CAST SPELL
// =========================
root.querySelectorAll('[data-action="castSpell"]').forEach(el => {
  el.addEventListener("click", (event) => {
    this._castSpell(event);
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
    const actor = this.document;

    const checked = event.currentTarget.checked;

    const xp = actor.system.details.experience;

    const cost = 100;

    // =========================
    // COMPLETE
    // =========================

    if (checked) {

      const available = xp.total - xp.spent;

      if (available < cost) {
        ui.notifications.warn("Not enough XP to complete career");
        event.currentTarget.checked = false;
        return;
      }

      await actor.update({
        "system.details.experience.spent": xp.spent + cost
      });

      await item.update({
        "system.completed": true
      });

      await this._addXPLog({
        type: "spend",
        amount: cost,
        target: `${item.name} (Career Completed)`,
        old: "",
        value: ""
      });

    }

    // =========================
    // UNDO COMPLETE
    // =========================

    else {

      await actor.update({
        "system.details.experience.spent": Math.max(0, xp.spent - cost)
      });

      await item.update({
        "system.completed": false
      });

      await this._addXPLog({
        type: "refund",
        amount: cost,
        target: `${item.name} (Career Uncompleted)`,
        old: "",
        value: ""
      });

    }

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
  const cost = this._getCost("skill", current);

  const xp = this.document.system.details.experience;
  const available = xp.total - xp.spent;

  if (available < cost) {
    ui.notifications.warn("Not enough XP");
    return;
  }

  await item.update({
    "system.advances": current + 1
  });

  await this.document.update({
    "system.details.experience.spent": xp.spent + cost
  });

  await this._addXPLog({
  type: "spend",
  amount: cost,
  target: item.name,
  old: current,
  value: current + 1
});
});

  // CLICK DROIT
  el.addEventListener("contextmenu", async (event) => {

  event.preventDefault();

  const item = this.document.items.get(event.currentTarget.dataset.itemId);

  const current = item.system.advances || 0;
  if (current <= 0) return;

  const newValue = current - 1;
  const cost = this._getCost("skill", newValue);

  const xp = this.document.system.details.experience;

  await item.update({
    "system.advances": newValue
  });

  await this.document.update({
    "system.details.experience.spent": Math.max(0, xp.spent - cost)
  });

  await this._addXPLog({
    type: "refund",
    amount: cost,
    target: item.name,
    old: current,
    value: newValue
  });

});

});

// =========================
// ATTRIBUTE ADV INPUT (GM FIX)
// =========================

root.querySelectorAll('[data-action="advanceAttribute"]').forEach(el => {

  el.addEventListener("click", async (event) => {

    const key = event.currentTarget.dataset.attr;
    const actor = this.document;

    const current = actor.system.attributes[key].advances || 0;
    const cost = this._getCost("attribute", current);

    const xp = actor.system.details.experience;
    const available = xp.total - xp.spent;

    if (available < cost) {
      ui.notifications.warn("Not enough XP");
      return;
    }

    await actor.update({
      [`system.attributes.${key}.advances`]: current + 1,
      "system.details.experience.spent": xp.spent + cost
    });

    await this._addXPLog({
  type: "spend",
  amount: cost,
  target: key,
  old: current,
  value: current + 1
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
  const cost = this._getTalentCost(current);

  const xp = this.document.system.details.experience;
  const available = xp.total - xp.spent;

  if (available < cost) {
    ui.notifications.warn("Not enough XP");
    return;
  }

  const max = this._getTalentMax(item);

if (current >= max) {
  ui.notifications.warn("Talent already at max");
  return;
}

  await item.update({
    "system.advances": current + 1
  });

  await this.document.update({
    "system.details.experience.spent": xp.spent + cost
  });

  await this._addXPLog({
  type: "spend",
  amount: cost,
  target: item.name,
  old: current,
  value: current + 1
});

});

  // CLICK DROIT
  el.addEventListener("contextmenu", async (event) => {

  event.preventDefault();

  const item = this.document.items.get(event.currentTarget.dataset.itemId);

  const current = item.system.advances || 0;
  if (current <= 0) return;

  const newValue = current - 1;
  const cost = this._getTalentCost(newValue);

  const xp = this.document.system.details.experience;

  await item.update({
    "system.advances": newValue
  });

  await this.document.update({
    "system.details.experience.spent": Math.max(0, xp.spent - cost)
  });

  await this._addXPLog({
    type: "refund",
    amount: cost,
    target: item.name,
    old: current,
    value: newValue
  });

});

});

// =========================
// UPDATE XP (GM)
// =========================

root.querySelectorAll('[data-action="updateXP"]').forEach(el => {

el.addEventListener("change", async (event) => {

  if (!game.user.isGM) return;

  const input = event.currentTarget;
  const type = input.dataset.type;

  const newValue = Number(input.value) || 0;

  const xp = this.document.system.details.experience;

  let oldValue = 0;

  if (type === "total") oldValue = xp.total || 0;
  if (type === "spent") oldValue = xp.spent || 0;

  const diff = newValue - oldValue;

  if (diff === 0) return;

  // 🔥 IMPORTANT : rollback visuel
  input.value = oldValue;

  new SimpleDialog({
    title: "XP Change",
    content: `
      <p>Change: ${diff > 0 ? "+" : ""}${diff} XP</p>

      <label>Reason</label>
      <input type="text" id="xp-reason" placeholder="Reason..." />
    `,
    buttons: {
      confirm: {
        label: "Apply",
        callback: async (app) => {

          const reason = app.element.querySelector("#xp-reason").value || "";

          const actor = this.document;

          if (type === "total") {
            await actor.update({
              "system.details.experience.total": newValue
            });
          }

          if (type === "spent") {
            await actor.update({
              "system.details.experience.spent": newValue
            });
          }

          await this._addXPLog({
            type: diff > 0 ? "gain" : "refund",
            amount: Math.abs(diff),
            target: type.toUpperCase(),
            old: oldValue,
            value: newValue,
            reason
          });

        }
      },
      cancel: {
        label: "Cancel"
      }
    }
  }).render(true);

});

});

// =========================
// TOOLTIP COST
// =========================

// ATTRIBUTES
root.querySelectorAll('[data-action="advanceAttribute"]').forEach(el => {

  const key = el.dataset.attr;
  const current = this.document.system.attributes[key].advances || 0;

  const cost = this._getCost("attribute", current);

  el.title = `Cost: ${cost} XP`;
});

// SKILLS
root.querySelectorAll('[data-action="advanceSkill"]').forEach(el => {

  const item = this.document.items.get(el.dataset.itemId);

  const current = item.system.advances || 0;
  const cost = this._getCost("skill", current);

  el.title = `Cost: ${cost} XP`;
});

// TALENTS
root.querySelectorAll('[data-action="advanceTalent"]').forEach(el => {

  const item = this.document.items.get(el.dataset.itemId);

  const current = item.system.advances || 0;
  const cost = this._getTalentCost(current);

  el.title = `Cost: ${cost} XP`;
});

// =========================
// LEVEL UP BUTTON
// =========================

root.querySelectorAll('[data-action="levelUp"]').forEach(el => {

  el.addEventListener("click", (event) => {

    this._onLevelUp();

  });

});

// =========================
// AMMO QUANTITY UPDATE
// =========================

root.querySelectorAll('[data-action="updateAmmoQty"]').forEach(el => {

  el.addEventListener("change", async (event) => {

    const input = event.currentTarget;
    const item = this.document.items.get(input.dataset.itemId);

    if (!item) return;

    const value = Math.max(0, Number(input.value) || 0);

    console.log("SDP | Ammo qty update", {
      item: item.name,
      value
    });

    await item.update({
      "system.quantity.value": value
    });

  });

});

// =========================
// SELECT AMMO
// =========================

root.querySelectorAll('[data-action="selectAmmo"]').forEach(el => {

  el.addEventListener("change", async (event) => {

    const select = event.currentTarget;
    const weapon = this.document.items.get(select.dataset.itemId);

    if (!weapon) return;

    const ammoId = select.value;

    console.log("SDP | Ammo selected", {
      weapon: weapon.name,
      ammoId
    });

    await weapon.update({
      "system.currentAmmo": ammoId
    });

  });

});

// =========================
// DEFENSE WEAPON TOGGLE
// =========================

root.querySelectorAll('.toggle-defense-weapon').forEach(el => {

  el.addEventListener("change", async (event) => {

    const checkbox = event.currentTarget;
    const itemId = checkbox.dataset.itemId;
    const checked = checkbox.checked;

    const item = this.document.items.get(itemId);

    if (!item) return;

    // =========================
    // OPTION (IMPORTANT)
    // Une seule arme de défense active
    // =========================

    if (checked) {

      const current = this.document.items.filter(i =>
        i.type === "weapon" &&
        i.system.isDefenseWeapon &&
        i.id !== item.id
      );

      for (let w of current) {
        await w.update({ "system.isDefenseWeapon": false });
      }

    }

    await item.update({
      "system.isDefenseWeapon": checked
    });

    console.log("SDP | Defense weapon toggled", {
      weapon: item.name,
      checked
    });

    this.render(); // refresh UI

  });

});

}

_onLevelUp() {

  const actor = this.document;

  const newLevel = game.sdp.level.getAvailableLevel(actor);

  const app = new game.sdp.levelUpApp(actor, newLevel);
  app.render(true);

}

}


