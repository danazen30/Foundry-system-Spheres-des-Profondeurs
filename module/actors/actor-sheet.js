import { SdpRoll } from "../rolls/roll.js";
import { SdpAttack } from "../combat/attack.js";
import { SDP } from "../system/config.js";
import { SimpleDialog } from "../apps/simple-dialog.js";
import { SdpSpell } from "../combat/spell.js";
import { WEAPON_TRAITS } from "../system/config.js";
import { SdpConditionEngine } from "../system/condition-engine.js";

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class SdpActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

constructor(...args) {
    super(...args);

    this.activeTab = "skills"; // 🔥 TAB PAR DEFAUT
    this.openContainers = new Set();
    this._scrollPositions = {};
  }

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

_getItemLayer(item) {

  // priorité au layer défini
  if (item.system.layer !== undefined) {
    return item.system.layer;
  }

  // fallback automatique
  switch (item.type) {
    case "clothing": return 0;
    case "armor": return 1;
    default: return 0;
  }

}

async render(...args) {

const root = this.element;


const prevEl = this.element?.querySelector(".sdp-content-inner");

if (prevEl && prevEl.scrollHeight > prevEl.clientHeight) {
  this._scrollPositions.main = prevEl.scrollTop;
}

  return super.render(...args);
}

  async _prepareContext() {

  const applyFinalWeight = (items, field = "encumbrance") => {
  for (let i of items) {

    const qty = i.system.quantity?.value ?? 1;
    const base = i.system[field]?.value ?? 0;

    i.system.totalWeight = base * qty;

  }
};

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

const weapons = this.document.items.filter(i =>
  i.type === "weapon" && !i.system.containerId
);
const allAmmo = this.document.items.filter(i => i.type === "ammunition");

const meleeWeapons = weapons.filter(w => w.system.category === "melee");

const rangedWeapons = weapons
  .filter(w => w.system.category === "ranged");

  for (let w of weapons) {

  const traits = w.system.traits || [];

  w.hasReload = traits.some(t => t?.key === "reload");

}

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

for (let w of weapons) {

  const weaponTraits = w.system.traits || [];
const itemTraits = w.system.itemTraits || [];

const traits = [...weaponTraits, ...itemTraits];

const normalized = [
  ...weaponTraits.map(t => ({ ...(typeof t === "string" ? { key: t } : t), source: "weapon" })),
  ...itemTraits.map(t => ({ ...(typeof t === "string" ? { key: t } : t), source: "item" }))
];

  const positive = normalized.filter(t =>
    SDP.WEAPON_TRAITS?.[t.key]?.type === "positive"
  );

  const negative = normalized.filter(t =>
    SDP.WEAPON_TRAITS?.[t.key]?.type === "negative"
  );

  // =========================
  // SKILL CHECK (UI)
  // =========================

  const weaponSkills = (w.system.skill || "")
  .split(",")
  .map(s => s.trim().toLowerCase())
  .filter(s => s); // 🔥 IMPORTANT

  const actorSkills = this.document.items.filter(i => i.type === "skill");

  let bestSkill = null;

  for (const group of weaponSkills) {
    const skill = actorSkills.find(s =>
      (s.system.key || "").toLowerCase() === group ||
      (s.name || "").toLowerCase() === group
    );

    if (!skill) continue;

    if (!bestSkill || skill.system.value > bestSkill.system.value) {
      bestSkill = skill;
    }
  }

const actorSkillNames = actorSkills.map(s =>
  (s.name || "").toLowerCase().trim()
);

const hasValidSkill = weaponSkills.some(group => {

  const g = group.toLowerCase().trim();

  return actorSkillNames.includes(g);

});

// DEBUG (EN DEHORS)
console.log("CHECK SKILL", {
  weapon: w.name,
  weaponSkills,
  actorSkillNames,
  hasValidSkill
});
  // =========================
  // UI TRAITS
  // =========================

w.displayTraits = normalized.map(t => {

  const traitConfig =
  SDP.WEAPON_TRAITS?.[t.key] ||
  SDP.ITEM_TRAITS?.[t.key];

  const isPositive = traitConfig?.type === "positive";

  console.log("TRAIT DEBUG", {
    weapon: w.name,
    trait: t.key,
    config: traitConfig,
    isPositive,
    hasValidSkill
  });

  return {
  key: t.key,
  label: traitConfig?.label || t.key,
  value: t.value,
  type: traitConfig?.type || "neutral",
  description: traitConfig?.description || "No description",
  disabled: (
    t.key !== "protectrice" &&
    t.source === "weapon" &&
    isPositive &&
    !hasValidSkill
  )
};
});

// =========================
// DISPLAY SKILLS (ALL, EVEN IF MISSING)
// =========================

const displaySkills = weaponSkills.map(group => {

  const skill = actorSkills.find(s =>
    (s.system.key || "").toLowerCase() === group ||
    (s.name || "").toLowerCase() === group
  );

  // 🔥 si le skill existe → nom réel
  if (skill) return skill.name;

  // 🔥 sinon → afficher le nom brut (capitalisé)
  return group.charAt(0).toUpperCase() + group.slice(1);

});

w.displaySkill = displaySkills.length
  ? displaySkills.join(", ")
  : "No skill";
}

const ammunition = this.document.items.filter(i =>
  i.type === "ammunition" && !i.system.containerId
);
const possessions = this.document.items.filter(i =>
  i.type === "possession" && !i.system.containerId
);
const traits = this.actor.items.filter(i => i.type === "trait");
const diseases = this.actor.items.filter(i => i.type === "disease");
const clothing = this.document.items.filter(i =>
  i.type === "clothing" && !i.system.containerId
);
const armors = this.document.items.filter(i =>
  i.type === "armor" && !i.system.containerId
);

for (let a of armors) {

  const armorTraits = a.system.armorTraits || {};
  const itemTraits = a.system.itemTraits || {};

  const allTraits = [];

  // =========================
  // ARMOR TRAITS
  // =========================
const armorTraitsArray = Array.isArray(armorTraits) ? armorTraits : [];

for (const t of armorTraitsArray) {

  const key = typeof t === "string" ? t : t.key;
  const value = typeof t === "object" ? t.value : undefined;

  const config = SDP.ARMOR_TRAITS?.[key];

  allTraits.push({
  key,
  label: config?.label || key,
  value,
  type: config?.type || "neutral",
  description: config?.description || "No description"
});
}

  // =========================
  // ITEM TRAITS
  // =========================
const itemTraitsArray = Array.isArray(itemTraits) ? itemTraits : [];

for (const t of itemTraitsArray) {

  const key = typeof t === "string" ? t : t.key;
  const value = typeof t === "object" ? t.value : undefined;

  const config = SDP.ITEM_TRAITS?.[key];

  allTraits.push({
    key,
    label: config?.label || key,
    value,
    type: config?.type || "neutral"
  });
}

  a.displayArmorTraits = allTraits;

  console.log("ARMOR FINAL TRAITS", a.name, allTraits);
}

const containers = this.document.items.filter(i => i.type === "container");

  const allItems = this.document.items;

// items dans container
const containedItems = allItems.filter(i => i.system.containerId);

// items hors container
const rootItems = allItems.filter(i => !i.system.containerId);

// group par container
const containerMap = {};

for (let item of containedItems) {
  const cid = item.system.containerId;
  if (!containerMap[cid]) containerMap[cid] = [];
  containerMap[cid].push(item);
}

const containerLoad = {};

for (let container of containers) {

  const items = containerMap[container.id] || [];

  const total = items.reduce((sum, i) => {
    return sum + ((i.system.encumbrance?.value || 0) * (i.system.quantity?.value || 1));
  }, 0);

  containerLoad[container.id] = total;
}

// =========================
// EQUIPMENT SLOTS (SILHOUETTE)
// =========================

// reset
const slots = {
  head: [],
  chest: [],
  armLeft: [],
  armRight: [],
  legLeft: [],
  legRight: [],

  weaponMain: null,
  weaponOff: null
};

// ===== ARMOR =====
for (let armor of armors) {

  if (!armor.system.worn?.value) continue;

  const s = armor.system.slots || {};

if (s.head) slots.head.push(armor);
if (s.chest) slots.chest.push(armor);
if (s.armLeft) slots.armLeft.push(armor);
if (s.armRight) slots.armRight.push(armor);
if (s.legLeft) slots.legLeft.push(armor);
if (s.legRight) slots.legRight.push(armor);
}

// ===== CLOTHING =====
for (let cloth of clothing) {

  if (!cloth.system.equipped) continue;

  const s = cloth.system.slots || {};

if (s.head) slots.head.push(cloth);
if (s.chest) slots.chest.push(cloth);
if (s.armLeft) slots.armLeft.push(cloth);
if (s.armRight) slots.armRight.push(cloth);
if (s.legLeft) slots.legLeft.push(cloth);
if (s.legRight) slots.legRight.push(cloth);
}

// ===== WEAPONS =====
for (let weapon of weapons) {

  if (!weapon.system.equipped) continue;

const handed = (weapon.system.handedness || "").toLowerCase();

// =========================
// SPECIAL → PAS DE SLOT
// =========================
if (handed === "special") {
  continue; // 🔥 ignore complètement pour la silhouette
}

  // =========================
  // 2 MAINS → prend les deux slots
  // =========================
  if (handed === "two") {

    slots.weaponMain = weapon;
    slots.weaponOff = weapon;

    continue;
  }

  // =========================
  // 1 MAIN / NORMAL
  // =========================
  if (weapon.system.offhand) {
    slots.weaponOff = weapon;
  } else {
    slots.weaponMain = weapon;
  }

}
// DEBUG
console.log("SDP | Slots", slots);

for (let key in slots) {

  if (Array.isArray(slots[key])) {

    slots[key].sort((a, b) => {
      return this._getItemLayer(a) - this._getItemLayer(b);
    });

  }

}

const currency = this.document.items.filter(i =>
  i.type === "currency"
);

const injuries = this.actor.items.filter(i => i.type === "injury");
const species = this.document.items
  .filter(i => i.type === "specie")
  .at(-1);

  let levelProgression = [];

if (sign?.system?.levels) {

  const levels = sign.system.levels;
const storedProgression = this.document.system.details?.levelProgression ?? [];

levelProgression = storedProgression.map(data => {
  return {
    level: data.level,
    hp: data.hp,
    hitDice: data.hitDice,
    hpRoll: data.hpRoll,
    signRoll: data.signRoll,

    // 🔥 AJOUT
    damageBonus: data.damageBonus,
    inspirationDice: data.inspirationDice,

    description: data.description
  };
});

  // tri par niveau (important)
  levelProgression.sort((a, b) => a.level - b.level);
}

const progression =
  this.document.system.details?.levelProgression ?? [];

const hasValidatedLevel0 = progression.some(l => l.level === 0);

const biography =
  this.document.system.details?.biography?.value ?? "";

const playerNotes =
  this.document.system.details?.playerNotes?.value ?? "";

const gmNotes =
  this.document.system.details?.gmNotes?.value ?? "";

const editors = {
  biography: await foundry.applications.ux.TextEditor.enrichHTML(
    biography,
    { async: true }
  ),

  playerNotes: await foundry.applications.ux.TextEditor.enrichHTML(
    playerNotes,
    { async: true }
  ),

  gmNotes: await foundry.applications.ux.TextEditor.enrichHTML(
    gmNotes,
    { async: true }
  )
};

applyFinalWeight(meleeWeapons);
applyFinalWeight(rangedWeapons);
applyFinalWeight(possessions, "weight");
applyFinalWeight(containers);
applyFinalWeight(ammunition);
applyFinalWeight(armors);
applyFinalWeight(clothing);

return {
  actor: this.document,
  system: this.document.system,
  config: SDP,
  attributes,
  currentCareer,
  skillMap,
  user: game.user,
  editors,
  owner: this.isOwner,
  editable: this.isEditable,
  xp: xpData,
  sign,
  signEffects,
  canLevelUp:(  currentLevel === 0 &&  !hasValidatedLevel0) ||
  game.sdp.level.canLevelUp(this.actor),
  availableLevel: game.sdp.level.getAvailableLevel(this.actor),
  levelProgression,
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
  possessions,
  ammunition,
  traits,
  clothing,
  containers,
  containerMap,
  armors,
  containerLoad,
  rootItems,
  diseases,
  slots,
  currency,
  injuries,
  species,
  activeTab: this.activeTab
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

  const actor = this.document;

  // 🔥 IMPORTANT : si drop sur container → on laisse le handler container gérer
  if (event.target.closest(".container-block")) {
    return super._onDropItem(event, data);
  }

  const item = await Item.fromDropData(data);

  // =========================
  // SI ITEM DEJA DANS ACTOR
  // =========================

  const existing = actor.items.get(item.id);

  if (existing) {
    // 👉 on enlève du container
    await existing.update({
      "system.containerId": null
    });
    return;
  }

  // =========================
  // SINON → CREATE
  // =========================

  const created = await actor.createEmbeddedDocuments("Item", [
    item.toObject()
  ]);

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

this.element.querySelectorAll("*").forEach(e => {

  if (e.scrollHeight > e.clientHeight) {

  }

});


  // ===== ATTRIBUTES =====
root.querySelectorAll('[data-action="rollAttribute"]').forEach(el => {
  el.addEventListener("click", (event) => {
    const attr = event.currentTarget.dataset.attr;
    const attrData = this.document.system.attributes[attr];

    const value = attrData.value;

    SdpRoll.openDialog({
  actor: this.document,
  type: "attribute", // ✅ FIX
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

  root.querySelectorAll('[data-action="rollSkill"]').forEach(el => {
  el.addEventListener("contextmenu", (event) => {

    event.preventDefault(); // 🔥 CRUCIAL

    const item = this.document.items.get(event.currentTarget.dataset.itemId);

    if (!item) return;

    item.sheet.render(true);

  });
});

  // ===== ATTACK =====
root.querySelectorAll('[data-action="weaponAttack"]').forEach(el => {
  el.addEventListener("click", (event) => {

    const weapon = this.document.items.get(event.currentTarget.dataset.itemId);

if (!weapon) return;

// =========================
// EQUIPPED CHECK
// =========================

if (!weapon.system.equipped) {
  ui.notifications.warn(`${weapon.name} is not equipped`);
  return;
}

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
  el.addEventListener("change", async (event) => {

    const checkbox = event.currentTarget;
    const item = this.document.items.get(checkbox.dataset.itemId);
    const actor = this.document;

    const isEquipping = checkbox.checked; // ✅ ON UTILISE LE CHECKBOX

    // =========================
    // UNEQUIP
    // =========================

    if (!isEquipping) {

  await item.update({
    "system.equipped": false,
    "system.offhand": false,
    "system.isDefenseWeapon": false
  });

  // 🔥 reassigne defense si besoin
  const remaining = actor.items.find(i =>
    i.type === "weapon" &&
    i.system.equipped
  );

  if (remaining) {
    await remaining.update({
      "system.isDefenseWeapon": true
    });
  }

  return;
}

    // =========================
    // LOGIQUE EXISTANTE
    // =========================

    const equipped = actor.items.filter(i =>
      i.type === "weapon" &&
      i.system.equipped &&
      i.id !== item.id
    );

    const handed = (item.system.handedness || "").toLowerCase();

    if (handed === "special") {

  await item.update({ "system.equipped": true });

  // =========================
  // AUTO DEFENSE (SPECIAL)
  // =========================

  const hasDefense = actor.items.some(i =>
    i.type === "weapon" &&
    i.system.equipped &&
    i.system.isDefenseWeapon
  );

  if (!hasDefense) {
    await item.update({
      "system.isDefenseWeapon": true
    });
  }

  return;
}

    const hasTwoHanded = equipped.some(w =>
      (w.system.handedness || "").toLowerCase() === "two"
    );

    if (hasTwoHanded) {
      ui.notifications.warn("2H weapon already equipped");
      checkbox.checked = false; // 🔥 rollback UI
      return;
    }

    if (handed === "two") {

      const hasOther = equipped.some(w =>
        (w.system.handedness || "").toLowerCase() !== "special"
      );

      if (hasOther) {
        ui.notifications.warn("Cannot equip 2H with other weapons");
        checkbox.checked = false;
        return;
      }

      await item.update({ "system.equipped": true });
      return;
    }

    const oneHandedCount = equipped.filter(w =>
      (w.system.handedness || "").toLowerCase() === "one"
    ).length;

    if (oneHandedCount >= 2) {
      ui.notifications.warn("Max 2 one-hand weapons");
      checkbox.checked = false;
      return;
    }

    await item.update({ "system.equipped": true });

    // =========================
// AUTO OFFHAND
// =========================

const oneHanded = actor.items.filter(i =>
  i.type === "weapon" &&
  i.system.equipped &&
  (i.system.handedness || "").toLowerCase() === "one"
);

if (oneHanded.length === 2) {

  // si aucune offhand → on en assigne une
  const hasOffhand = oneHanded.some(w => w.system.offhand);

  if (!hasOffhand) {

    // 👉 la nouvelle arme devient offhand
    await item.update({
      "system.offhand": true
    });

  }

}

// =========================
// AUTO DEFENSE WEAPON
// =========================

const hasDefense = actor.items.some(i =>
  i.type === "weapon" &&
  i.system.equipped &&
  i.system.isDefenseWeapon &&
  (
    i.system.category === "melee" ||
    (i.system.handedness || "").toLowerCase() === "special"
  )
);

if (!hasDefense) {

  // =========================
// DEFENSE ELIGIBILITY
// =========================

const isMelee = item.system.category === "melee";
const isSpecial = (item.system.handedness || "").toLowerCase() === "special";

if (isMelee || isSpecial) {

  await item.update({
    "system.isDefenseWeapon": true
  });

}

}

  });
});

root.querySelectorAll('[data-action="toggleOffhand"]').forEach(el => {
  el.addEventListener("click", async (event) => {

    event.preventDefault(); // 🔥 IMPORTANT

    const checkbox = event.currentTarget;
    const item = this.document.items.get(checkbox.dataset.itemId);
    const actor = this.document;

    // =========================
    // EQUIPPED CHECK
    // =========================

    if (!item || !item.system.equipped) {
      ui.notifications.warn("Weapon must be equipped");

      checkbox.checked = false; // 🔥 rollback visuel
      return;
    }

    const isOffhand = !item.system.offhand;
    const isSpecial = (item.system.handedness || "").toLowerCase() === "special";

    // =========================
    // SI ON ACTIVE
    // =========================

    if (isOffhand) {

      // 👉 UNIQUEMENT si PAS special
      if (!isSpecial) {

        const others = actor.items.filter(i =>
          i.type === "weapon" &&
          i.system.offhand &&
          i.id !== item.id &&
          (i.system.handedness || "").toLowerCase() !== "special"
        );

        for (let w of others) {
          await w.update({ "system.offhand": false });
        }

      }

    }

    await item.update({
      "system.offhand": isOffhand
    });

  });
});

root.querySelectorAll('[data-action="toggleArmor"]').forEach(el => {
  el.addEventListener("click", async (event) => {

    const item = this.document.items.get(event.currentTarget.dataset.itemId);

    if (!item) {
      console.error("ARMOR TOGGLE ERROR: item not found");
      return;
    }

    const current = item.system?.worn?.value ?? false;

    await item.update({
      "system.worn.value": !current
    });

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

    const previous = actor.system.conditions?.[key] ?? 0;

    // ✅ PAS DE RESET
    if (value > 0) {
      await SdpConditionEngine.add(actor, key, value - previous);
    } else {
      await SdpConditionEngine.clear(actor, key);
    }

    // fatigue on recovery
    if (
      (key === "stunned" || key === "poisoned" || key === "bleeding") &&
      previous > 0 &&
      value === 0
    ) {
      await SdpConditionEngine.add(actor, "exhausted", 1);
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

      await SdpConditionEngine.add(actor, "exhausted", 1);

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
    if (!item) return;

    new SimpleDialog({
      title: "Delete Item",
      content: `
        <div class="confirm-delete">
          <p>Are you sure you want to delete:</p>
          <p><strong>${item.name}</strong> ?</p>
        </div>
      `,
      buttons: {
        confirm: {
          label: "Delete",
          callback: async () => {
            await item.delete();
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

    console.log("=== ADD SPECIES CLICK ===");

    const button = event.currentTarget;
    if (button.disabled) return;
    button.disabled = true;

    const actor = this.document;

    // =========================
    // 1. GET SPECIES
    // =========================

    const species = game.items.filter(i => i.type === "specie");

    console.log("SPECIES FOUND:", species.map(s => s.name));

    if (species.length === 0) {
      ui.notifications.warn("No specie found");
      button.disabled = false;
      return;
    }

    const baseSpecie = species[0];

    console.log("USING SPECIE:", baseSpecie.name);

    // =========================
    // 2. CREATE ITEM
    // =========================

    const [created] = await actor.createEmbeddedDocuments("Item", [
      baseSpecie.toObject()
    ]);

    console.log("CREATED SPECIE ITEM:", created);

    // =========================
    // 3. PREPARE UPDATES
    // =========================

    const updates = {}; // 🔥 FIX CRITIQUE

    const baseAttrs = created.system.baseAttributes || {};

    console.log("BASE ATTRIBUTES:", baseAttrs);

    for (const [key, value] of Object.entries(baseAttrs)) {

      if (value === 0 || value === null || value === undefined) continue;

      updates[`system.attributes.${key}.initial`] = value;
    }

    // =========================
    // 4. MOVEMENT
    // =========================

    if (created.system.movement?.walk !== undefined) {
      updates["system.resources.movement.value"] = created.system.movement.walk;
    }

    console.log("FINAL UPDATES:", updates);

    // =========================
    // 5. APPLY
    // =========================

    await actor.update(updates);

    console.log("ACTOR UPDATED");

    // =========================
    // 6. FORCE RENDER
    // =========================

    await this.render(true);

    console.log("RENDER DONE");

    button.disabled = false;

  });
});

Hooks.on("createItem", async (item, options, userId) => {

  if (item.type !== "specie") return;

  const actor = item.parent;
  if (!actor) return;

  console.log("SPECIE ADDED → APPLY EFFECT");

  const updates = {};

  const baseAttrs = item.system.baseAttributes || {};

  for (const [key, value] of Object.entries(baseAttrs)) {

    if (!value) continue;

    updates[`system.attributes.${key}.initial`] = value;
  }

  // movement
  if (item.system.movement?.walk !== undefined) {
    updates["system.resources.movement.value"] = item.system.movement.walk;
  }

  await actor.update(updates);

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

    // CLICK DROIT
  el.addEventListener("contextmenu", async (event) => {

    event.preventDefault();

    const key = event.currentTarget.dataset.attr;
    const actor = this.document;

    const current = actor.system.attributes[key].advances || 0;

    if (current <= 0) return;

    const newValue = current - 1;

    const cost = this._getCost("attribute", newValue);

    const xp = actor.system.details.experience;

    await actor.update({
      [`system.attributes.${key}.advances`]: newValue,
      "system.details.experience.spent": Math.max(0, xp.spent - cost)
    });

    await this._addXPLog({
      type: "refund",
      amount: cost,
      target: key,
      old: current,
      value: newValue
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
// UPDATE ITEM QTY (POSSESSIONS)
// =========================
root.querySelectorAll('[data-action="updateItemQty"]').forEach(el => {

  el.addEventListener("change", async (event) => {

    const input = event.currentTarget;
    const item = this.document.items.get(input.dataset.itemId);

    if (!item) return;

    const value = Math.max(0, Number(input.value) || 0);

    console.log("SDP | Item qty update", {
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

    let ammoId = select.value;

// 🔥 FIX NULL
if (!ammoId) ammoId = null;

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
// EQUIPPED CHECK
// =========================

if (!item.system.equipped) {
  ui.notifications.warn("Weapon must be equipped");
  event.currentTarget.checked = false;
  return;
}

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

root.querySelectorAll('[data-action="toggleLoaded"]').forEach(el => {

  el.addEventListener("change", async (event) => {

    const item = this.document.items.get(event.currentTarget.dataset.itemId);

    if (!item) return;

    const checked = event.currentTarget.checked;

    await item.update({
      "system.loaded": checked,
      "system.reloadProgress": checked ? 0 : item.system.reloadProgress
    });

    console.log("SDP | TOGGLE LOADED", {
      weapon: item.name,
      loaded: checked
    });

  });

});

// =========================
// TOGGLE BOOLEAN (GENERIC)
// =========================

root.querySelectorAll('[data-action="toggleBoolean"]').forEach(el => {

  el.addEventListener("change", async (event) => {

    const checkbox = event.currentTarget;
    const item = this.document.items.get(checkbox.dataset.itemId);

    if (!item) return;

    const path = checkbox.dataset.path;
    const checked = checkbox.checked;

    await item.update({
      [path]: checked
    });

    console.log("SDP | TOGGLE BOOLEAN", {
      item: item.name,
      path,
      value: checked
    });

  });

});

// =========================
// TOGGLE WEAPON DETAILS
// =========================

root.querySelectorAll('.weapon-toggle').forEach(el => {

el.addEventListener("click", (event) => {

  const itemId = event.currentTarget.dataset.itemId;
  const weapon = this.document.items.get(itemId);

  if (!weapon) return;

  if (!weapon.system.equipped) {
    ui.notifications.warn(`${weapon.name} is not equipped`);
    return;
  }

  let target;

  // 🔥 RANGED
  if (weapon.system.category === "ranged") {

    target = this.document._getBestWeaponSkill(weapon);

  }

  // 🔥 MELEE
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

  // =========================
  // CLICK DROIT = TOGGLE DETAILS
  // =========================
  el.addEventListener("contextmenu", (event) => {

    event.preventDefault();

    const itemId = event.currentTarget.dataset.itemId;

    const details = root.querySelector(`.weapon-details[data-details="${itemId}"]`);

    if (!details) return;

    const isHidden = details.style.display === "none";

    details.style.display = isHidden ? "table-row" : "none";

  });

});

// =========================
// REST SYSTEM
// =========================

root.querySelectorAll('[data-action="shortRest"]').forEach(el => {
  el.addEventListener("click", async () => {
    await this._doRest("short");
  });
});

root.querySelectorAll('[data-action="longRest"]').forEach(el => {
  el.addEventListener("click", async () => {
    await this._doRest("long");
  });
});

root.querySelectorAll('[data-action="toggleClothing"]').forEach(el => {
  el.addEventListener("click", async (event) => {

    const item = this.document.items.get(event.currentTarget.dataset.itemId);

    const current = item.system?.equipped ?? false;

    await item.update({
      "system.equipped": !current
    });

  });
});

// =========================
// CONTAINER DROP
// =========================

root.querySelectorAll(".container-header-row").forEach(el => {

  el.addEventListener("dragover", e => e.preventDefault());

  el.addEventListener("drop", async (event) => {

    event.preventDefault();

    const data = foundry.applications.ux.TextEditor.getDragEventData(event);

    if (!data.uuid) return;

    const item = await fromUuid(data.uuid);

    if (!item) return;

    const actor = this.document;

    let actorItem = actor.items.get(item.id);

    // =========================
    // SI ITEM EXISTE → MOVE
    // =========================

    if (actorItem) {

      await actorItem.update({
        "system.containerId": el.dataset.containerId
      });

      return;
    }

    // =========================
    // SINON → IMPORT + SET
    // =========================

    const created = await actor.createEmbeddedDocuments("Item", [{
      ...item.toObject(),
      system: {
        ...item.system,
        containerId: el.dataset.containerId
      }
    }]);

  });

});

root.querySelectorAll('[data-action="removeFromContainer"]').forEach(el => {

  el.addEventListener("click", async (event) => {

    const item = this.document.items.get(event.currentTarget.dataset.itemId);

    await item.update({
      "system.containerId": null
    });

  });

});

root.querySelectorAll('[data-action="toggleContainer"]').forEach(el => {

  el.addEventListener("click", (event) => {

    const button = event.currentTarget;
    const row = button.closest("tr");
    const contentRow = row.nextElementSibling;

    if (!contentRow) return;

    const containerId = row.dataset.containerId;

    const isOpen = this.openContainers.has(containerId);

    if (isOpen) {
      this.openContainers.delete(containerId);
      contentRow.style.display = "none";

      button.textContent = "▶"; // 👉 fermé

    } else {
      this.openContainers.add(containerId);
      contentRow.style.display = "table-row";

      button.textContent = "▼"; // 👉 ouvert
    }

  });

});

// =========================
// ITEM DRAG START
// =========================

root.querySelectorAll('[data-item-id]').forEach(el => {

  el.setAttribute("draggable", true);

  // 🔥 IMPORTANT
  // bloque totalement le drag depuis inputs/buttons/etc
  el.addEventListener("mousedown", (event) => {

    if (
      event.target.closest(
        "input, textarea, select, option, button, label"
      )
    ) {
      el.setAttribute("draggable", false);
    } else {
      el.setAttribute("draggable", true);
    }

  });

  el.addEventListener("mouseup", () => {
    el.setAttribute("draggable", true);
  });

  el.addEventListener("dragstart", (event) => {

    // 🔥 sécurité supplémentaire
    if (
      event.target.closest(
        "input, textarea, select, option, button, label, .qty-clickable"
      )
    ) {
      event.preventDefault();
      return;
    }

    const itemId = el.dataset.itemId;
    const item = this.document.items.get(itemId);

    if (!item) return;

    // =========================
    // 🚫 BLOCK DRAG IF EQUIPPED
    // =========================

    if (item.type === "weapon" && item.system.equipped) {
      event.preventDefault();
      return;
    }

    if (item.type === "armor" && item.system.worn?.value) {
      event.preventDefault();
      return;
    }

    if (item.type === "clothing" && item.system.equipped) {
      event.preventDefault();
      return;
    }

    // =========================
    // ✅ NORMAL DRAG
    // =========================

    event.dataTransfer.setData("text/plain", JSON.stringify({
      type: "Item",
      uuid: item.uuid
    }));

  });

});

this.element.querySelectorAll("[data-tab]").forEach(btn => {

  // ACTIVE VISUEL
  if (btn.dataset.tab === this.activeTab) {
    btn.classList.add("active");
  } else {
    btn.classList.remove("active");
  }

  btn.addEventListener("click", () => {
    this.activeTab = btn.dataset.tab;
    this.render();
  });

});

// =========================
// PORTRAIT CLICK
// =========================

this.element.querySelector(".character-portrait img")?.addEventListener("click", async () => {

  const fp = new FilePicker({
    type: "image",
    current: this.document.img,
    callback: async (path) => {
      await this.document.update({ img: path });
    }
  });

  fp.render(true);

});

// =========================
// TALENT TOGGLE + OPEN
// =========================

root.querySelectorAll(".talent-row").forEach(row => {

  // CLICK GAUCHE → toggle description
  row.addEventListener("click", (event) => {

    // 🔥 ignore si on clique sur un bouton ou input
    if (event.target.closest("button, input")) return;

    const itemId = row.dataset.itemId;

    const details = root.querySelector(
      `.talent-description[data-details="${itemId}"]`
    );

    if (!details) return;

    const isHidden = details.style.display === "none";

    details.style.display = isHidden ? "table-row" : "none";

  });

  // CLICK DROIT → ouvrir item
  row.addEventListener("contextmenu", (event) => {

    event.preventDefault();

    const item = this.document.items.get(row.dataset.itemId);

    if (!item) return;

    item.sheet.render(true);

  });

});

// =========================
// SPELL CLICK GAUCHE = CAST
// =========================
root.querySelectorAll('[data-action="rollSpell"]').forEach(el => {

  el.addEventListener("click", (event) => {

    const spell = this.document.items.get(event.currentTarget.dataset.itemId);
    if (!spell) return;

    this._castSpell({
      preventDefault: () => {},
      currentTarget: {
        dataset: {
          itemId: spell.id
        }
      }
    });

  });

  // =========================
  // CLICK DROIT = TOGGLE DETAILS
  // =========================
  el.addEventListener("contextmenu", (event) => {

    event.preventDefault();

    const itemId = event.currentTarget.dataset.itemId;

    const details = root.querySelector(
      `.spell-details[data-details="${itemId}"]`
    );

    if (!details) return;

    const isHidden = details.style.display === "none";

    details.style.display = isHidden ? "table-row" : "none";

  });

});

// =========================
// ARMOR TOGGLE DETAILS
// =========================

root.querySelectorAll('.armor-toggle').forEach(el => {

  // CLICK DROIT = ouvrir dépliant
  el.addEventListener("contextmenu", (event) => {

    event.preventDefault();

    const itemId = event.currentTarget.dataset.itemId;

    const details = root.querySelector(
      `.armor-details[data-details="${itemId}"]`
    );

    if (!details) return;

    const isHidden = details.style.display === "none";

    details.style.display = isHidden ? "table-row" : "none";

  });
});

// =========================
// CLICK QUANTITY (GLOBAL)
// =========================

root.querySelectorAll('.qty-clickable').forEach(el => {


  // CLICK DROIT → -1
  el.addEventListener("contextmenu", async (event) => {

    event.preventDefault();

    const item = this.document.items.get(el.dataset.itemId);
    if (!item) return;

    const current = item.system.quantity?.value ?? 0;

    if (current <= 0) return;

    await item.update({
      "system.quantity.value": current - 1
    });

  });

  el.addEventListener("click", async (event) => {

  // 🔥 FIX CRUCIAL
  if (event.target.closest("input, select, button")) return;

  const item = this.document.items.get(el.dataset.itemId);
  if (!item) return;

  const current = Number(item.system.quantity?.value ?? 0);

  await item.update({
    "system.quantity.value": current + 1
  });

});

});

// =========================
// RESTORE CONTAINERS STATE
// =========================

this.openContainers.forEach(containerId => {

  const contentRow = root.querySelector(
    `.container-content-row[data-container="${containerId}"]`
  );

  const headerRow = root.querySelector(
    `.container-header-row[data-container-id="${containerId}"]`
  );

  if (contentRow) {
    contentRow.style.display = "table-row";
  }

  if (headerRow) {
    const btn = headerRow.querySelector(".container-toggle");
    if (btn) btn.textContent = "▼";
  }

});

// =========================
// TRAIT CLICK → DIALOG (DELEGATION)
// =========================
root.addEventListener("click", (event) => {

  const el = event.target.closest(".trait-clickable");

  if (!el) return;

  console.log("TRAIT CLICKED", el.dataset); // 🔥 DEBUG

  const label = el.dataset.trait;
  const desc = el.dataset.description;

  new SimpleDialog({
    title: label,
    content: `
      <div class="trait-dialog">
        <p>${desc}</p>
      </div>
    `,
    buttons: {
      ok: {
        label: "OK"
      }
    }
  }).render(true);

});

root.querySelectorAll('.currency-click').forEach(el => {

  // CLICK GAUCHE → +1
  el.addEventListener("click", async (event) => {

    const type = el.dataset.type;

    const current = this.document.system.currency?.[type] ?? 0;

    await this.document.update({
  [`system.currency.value.${type}`]: current + 1
});

  });

  // CLICK DROIT → -1
  el.addEventListener("contextmenu", async (event) => {

    event.preventDefault();

    const type = el.dataset.type;

    const current = this.document.system.currency?.[type] ?? 0;

    if (current <= 0) return;

    await this.document.update({
  [`system.currency.value.${type}`]: current - 1
});
  });

});

root.querySelectorAll('.condition-clickable').forEach(el => {

  // CLICK GAUCHE → +1
  el.addEventListener("click", async (event) => {

    event.preventDefault();

    const key = el.dataset.key;
    const actor = this.document;

    const current = actor.system.conditionTotals?.[key] ?? 0;

    await SdpConditionEngine.add(actor, key, 1);

  });

  // CLICK DROIT → -1
el.addEventListener("contextmenu", async (event) => {

  event.preventDefault();

  const key = el.dataset.key;
  const actor = this.document;

  const current = actor.system.conditionTotals?.[key] ?? 0;

  if (current <= 0) return;

  // remove 1 stack
  await SdpConditionEngine.add(actor, key, -1);

  // 🔥 exhausted on recovery
  if (
    (key === "stunned" || key === "poisoned" || key === "bleeding") &&
    current === 1
  ) {
    await SdpConditionEngine.add(actor, "exhausted", 1);
  }

});

});

// =========================
// CONDITION CLICK
// =========================

root.querySelectorAll('.condition-header').forEach(el => {

  el.addEventListener("contextmenu", (event) => {

    event.preventDefault();

    const key = el.dataset.key;
    const description = el.dataset.description;

    const table = el.closest("table");
    const detailsRow = table.querySelector(".condition-details-row");
    const content = table.querySelector(".condition-details-content");

    if (!detailsRow || !content) return;

    const isOpen = detailsRow.style.display === "table-row";

    if (isOpen && content.dataset.key === key) {
      detailsRow.style.display = "none";
      return;
    }

    content.innerHTML = `<strong>${key}</strong><br>${description}`;
    content.dataset.key = key;

    detailsRow.style.display = "table-row";

  });

});

// =========================
// TOGGLE NOTE EDITOR
// =========================

root.querySelectorAll('[data-action="toggleEditor"]').forEach(el => {

  el.addEventListener("click", (event) => {

    const target = event.currentTarget.dataset.target;

    const display = root.querySelector(
      `[data-display="${target}"]`
    );

    const editor = root.querySelector(
      `[data-editor="${target}"]`
    );

    if (!display || !editor) return;

    const isEditing = editor.style.display !== "none";

    // =========================
    // CLOSE
    // =========================

    if (isEditing) {

      editor.style.display = "none";
      display.style.display = "block";

      event.currentTarget.textContent = "✏️ Edit";

    }

    // =========================
    // OPEN
    // =========================

    else {

      editor.style.display = "block";
      display.style.display = "none";

      event.currentTarget.textContent = "✔ Close";

    }

  });

});

console.log("ROOT", root);
console.log(
  "EDITORS NOW",
  root.querySelectorAll('[contenteditable="true"]').length
);

// =========================
// FORCE ENTER => <br> IN EDITORS
// =========================

// =========================
// FORCE ENTER => <br> IN EDITORS
// =========================

requestAnimationFrame(() => {

  const editors = root.querySelectorAll('[contenteditable="true"]');

  console.log("EDITORS FOUND:", editors.length);

  editors.forEach(editor => {

    console.log("EDITOR", editor);

    editor.addEventListener("keydown", (event) => {

       console.log({
    key: event.key,
    code: event.code
  });

      console.log("KEYDOWN", event.key);

      if (event.key !== "Enter") return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const br = document.createElement("br");

      const sel = window.getSelection();

      if (!sel.rangeCount) return;

      const range = sel.getRangeAt(0);

      range.deleteContents();
      range.insertNode(br);

      range.setStartAfter(br);
      range.setEndAfter(br);

      sel.removeAllRanges();
      sel.addRange(range);

      console.log("BR INSERTED");

    });

  });

});

// =========================
// AUTO RESIZE TEXTAREA (FIX)
// =========================



// =========================
// RESTORE SCROLL DEBUG
// =========================

const rootEl = this.element;

if (!rootEl) return;

const tryRestoreScroll = () => {

  // 🔥 si la sheet a été détruite → stop
  if (!rootEl.isConnected) return;

  const el = rootEl.querySelector(".sdp-content-inner");
  if (!el) return;

  // 🔥 attendre que le layout soit prêt
  if (el.scrollHeight <= el.clientHeight) {
    requestAnimationFrame(tryRestoreScroll);
    return;
  }

  el.scrollTop = this._scrollPositions.main || 0;

  console.log("RESTORE FINAL:", el.scrollTop);
};

requestAnimationFrame(tryRestoreScroll);
  }

_onLevelUp() {

  const actor = this.document;

  let newLevel;

  // =========================
  // FIRST CHARACTER CREATION
  // =========================

  if ((actor.system.details?.level ?? 0) === 0) {

    const progression =
      actor.system.details?.levelProgression ?? [];

    // si aucun niveau encore appliqué
    if (progression.length === 0) {
      newLevel = 0;
    } else {
      newLevel = game.sdp.level.getAvailableLevel(actor);
    }

  }

  // =========================
  // NORMAL LEVEL UP
  // =========================

  else {

    newLevel = game.sdp.level.getAvailableLevel(actor);

  }

  const app = new game.sdp.levelUpApp(actor, newLevel);
  app.render(true);

}

async _doRest(type) {

  const actor = this.document;

  let hpRoll, manaRoll;

  if (type === "short") {

    hpRoll = new Roll("1d4");
    manaRoll = new Roll("1d4");

  } else {

    const TB = actor.system.attributes.toughness.bonus;
    const WPB = actor.system.attributes.willpower.bonus;

    hpRoll = new Roll(`${TB}d4`);
    manaRoll = new Roll(`${WPB}d4`);

  }

  // 🎲 ÉVALUATION ASYNC (OBLIGATOIRE V12)
await hpRoll.evaluate();
await manaRoll.evaluate();

// 🎲 Animation + son SANS créer de message
if (game.dice3d) {
  await game.dice3d.showForRoll(hpRoll);
  await game.dice3d.showForRoll(manaRoll);
} else {
  foundry.audio.AudioHelper.play({ src: CONFIG.sounds.dice }, true);
}

  const hp = hpRoll.total;
  const mana = manaRoll.total;

  const hpHTML = await hpRoll.render();
  const manaHTML = await manaRoll.render();

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
    <div class="sdp-rest"
         data-actor="${actor.id}"
         data-hp="${hp}"
         data-mana="${mana}"
         data-used="false">

      <h3>${type === "short" ? "Short Rest" : "Long Rest"}</h3>

      <div class="dice-block">
        <p><strong>HP:</strong></p>
        ${hpHTML}

        <p><strong>Mana:</strong></p>
        ${manaHTML}
      </div>

      <button class="apply-rest">
        Apply Rest
      </button>

    </div>
    `
  });

}

}