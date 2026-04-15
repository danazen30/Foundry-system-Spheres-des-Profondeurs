export class SdpActor extends Actor {

  prepareBaseData() {
    super.prepareBaseData();

    const system = this.system;

    // =====================
    // ATTRIBUTES DEFAULT
    // =====================

    const defaultAttributes = {
      meleeAbility: { label: "MA", name: "Strength", initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      rangedAbility: { label: "RA", name: "rangedAbility",initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      strength: { label: "S", name: "strength",initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      toughness: { label: "T", name: "toughness",initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      initiative: { label: "I", name: "initiative",initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      agility: { label: "A", name: "agility",initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      dexterity: { label: "D", name: "dexterity",initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      intelligence: { label: "Int", name: "intelligence",initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      willpower: { label: "WP", name: "willpower",initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      charisma: { label: "C", name: "charisma",initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 }
    };

    system.attributes ??= {};

    for (let [key, defaults] of Object.entries(defaultAttributes)) {

      const attr = system.attributes[key] ??= {};

      attr.label ??= defaults.label;
      attr.name ??= defaults.name;
      attr.initial ??= defaults.initial;
      attr.advances ??= defaults.advances;
      attr.modifier ??= defaults.modifier;
      attr.levelBonus ??= defaults.levelBonus;

    }

    // =====================
    // DERIVED DEFAULT
    // =====================

    system.derived ??= {};

    system.derived.woundThreshold ??= { value: 0 };
    system.derived.evasion ??= { value: 0 };
    system.derived.parry ??= { value: 0 };
    system.derived.attack ??= { value: 0 };
    system.derived.carryingCapacity ??= { value: 0 };

    // =====================
    // HEALTH DEFAULT
    // =====================

    system.health ??= {};
    system.health.value ??= 8;
    system.health.max ??= 8;
    system.health.levelBonus ??= 0;

    // =====================
    // RESOURCES DEFAULT
    // =====================

    system.resources ??= {};
    system.resources.mana ??= {};
    system.resources.mana.value ??= 0;

    system.resources.movement ??= {};
    system.resources.movement.value ??= 4;
    system.resources.movement.current ??= 4;
    system.resources.movement.walk ??= 0;
    system.resources.movement.run ??= 0;

    // =====================
    // CUSTOM
    // =====================

    system.custom ??= {};
    system.custom.offhandReduction ??= 0;
    system.custom.manaMultiplierBonus ??= 0;

    system.conditionOverride ??= {};
  }

getSign() {
  return this.items.find(i => i.type === "sign");
}

getSignEffects() {

  const sign = this.getSign();
  if (!sign) return {};

  const level = this.system.details.level || 0;
  const levels = sign.system.levels || {};

  let effects = {
  damageBonus: null,
  inspirationDice: null
};

  const lvl = levels[level];

if (!lvl) return effects;

// =========================
// DAMAGE BONUS (OVERRIDE)
// =========================

if (lvl.damageBonus) {
  effects.damageBonus = lvl.damageBonus;
}

// =========================
// INSPIRATION DICE (OVERRIDE)
// =========================

if (lvl.inspirationDice) {
  effects.inspirationDice = lvl.inspirationDice;
}

  return effects;
}

  // =====================
  // ITEM MODIFIERS (ATTRIBUTES)
  // =====================

  _getItemModifiers(targetKey) {

    let total = 0;

    for (const item of this.items.contents) {

      if (item.type !== "injury") continue;

      for (const effect of item.effects) {

        if (effect.disabled) continue;

        for (const change of effect.changes) {

          if (!change.key) continue;

          // ❌ ignore conditions
          if (change.key.startsWith("system.conditions")) continue;

          // ❌ ignore modifier (avoid double)
          if (change.key.endsWith(".modifier")) continue;

          // ✔ match attribute
          if (!change.key.startsWith(`system.attributes.${targetKey}`)) continue;

          total += Number(change.value || 0);
        }
      }
    }

    return total;
  }


  // =====================
  // DERIVED DATA
  // =====================

  prepareDerivedData() {
    

    super.prepareDerivedData();

const system = this.system;
system.custom.manaMultiplierBonus = 0;
system.bonuses = system.bonuses || {};
system.bonuses.successSL = system.bonuses.successSL || 0;

// =====================
// CUSTOM MODIFIERS
// =====================

system.custom.offhandReduction = 0;

for (const item of this.items.contents) {

  if (item.type !== "talent") continue;

  const level = Number(item.system.advances || 0);

  if (level <= 0) continue;

  for (const effect of item.effects) {

    if (effect.disabled) continue;

    for (const change of effect.changes) {

      if (change.key === "system.custom.offhandReduction") {

        const base = Number(change.value || 0);

        system.custom.offhandReduction += base * level * 10;

      }

      if (change.key === "system.custom.manaMultiplierBonus") {

  const base = Number(change.value || 0);

  if (level > 0) {
    system.custom.manaMultiplierBonus += base * level;
  }

}

    }
  }
}


    // =====================
    // CONDITIONS
    // =====================

system.conditionTotals = {};

for (const key in system.conditions) {

  const base = system.conditions[key] ?? 0;

  system.conditionTotals[key] = base;

}

    // =====================
    // ATTRIBUTES
    // =====================

    for (let [key, attr] of Object.entries(system.attributes)) {

      const itemMod = this._getItemModifiers(key) ?? 0;
      const manualMod = Number(attr.modifier || 0);

      attr.itemModifier = itemMod;
      attr.totalModifier = manualMod + itemMod;

      attr.value =
        Number(attr.initial || 0) +
        Number(attr.advances || 0) +
        attr.totalModifier +
        Number(attr.levelBonus || 0);

      attr.bonus = Math.floor(attr.value / 10);
    }



    // =====================
    // HEALTH
    // =====================

    const TB = system.attributes.toughness.bonus;
    const SB = system.attributes.strength.bonus;
    const WPB = system.attributes.willpower.bonus;

    const baseHealth = (TB * 2) + SB + WPB;

// NEW
const levelBonus = system.health.levelBonus ?? 0;

system.health.max = baseHealth + levelBonus;

const finalMax = system.health.max;

if (system.health.value == null) {
  system.health.value = finalMax;
}

if (system.health.value > finalMax) {
  system.health.value = finalMax;
}

    // =====================
    // SKILLS
    // =====================

    const skills = this.items.filter(i => i.type === "skill");

    for (let skill of skills) {

      const attribute =
        system.attributes[skill.system.characteristic]?.value ?? 0;

      skill.system.value =
        attribute +
        Number(skill.system.advances || 0) +
        Number(skill.system.modifier || 0);

      skill.system.bonus =
        Math.floor(skill.system.value / 10);
    }

    const getSkill = (key) => skills.find(s => s.system.key === key);

    const resistance = getSkill("resistance");
    const dodge = getSkill("dodge");
    const brawl = getSkill("brawl");

    // =====================
    // WEAPON DAMAGE
    // =====================

    const SB_damage = system.attributes.strength.bonus;

    const weapons = this.items.filter(i => i.type === "weapon");

    for (let weapon of weapons) {

      weapon.system.usesSB = weapon.system.damage?.includes("SB");

      let formula = weapon.system.damage || "0";
      formula = formula.replace("SB", SB_damage);

      let value = 0;

      try {
        value = Roll.safeEval(formula);
      } catch {
        value = 0;
      }

      weapon.system.finalDamage = value;
    }

    // =====================
    // WEAPONS
    // =====================

    const equippedWeapons = this.items.filter(
  i => i.type === "weapon" &&
       i.system.equipped &&
       i.system.category === "melee"
);

    const OFFHAND_PENALTY = 20;
    const offhandPenalty =
      Math.max(0, OFFHAND_PENALTY - system.custom.offhandReduction);

    // =====================
// PARRY (DEFENSE WEAPON)
// =====================

let parryBase = 0;

const meleeWeapons = equippedWeapons.filter(w => w.system.category === "melee");

// 🔥 DEFENSE WEAPON PRIORITY
const defenseWeapon = this.items.find(w =>
  w.type === "weapon" &&
  w.system.isDefenseWeapon === true
);

if (defenseWeapon) {

  const skill = getSkill(defenseWeapon.system.skill);

  let base = skill
    ? skill.system.value
    : system.attributes.meleeAbility.value;

let value = base + (Number(defenseWeapon.system.parryBonus || 0) * 10);

if (defenseWeapon.system.offhand) value -= offhandPenalty;

// =========================
// DEFENSIVE TRAIT
// =========================

const traits = defenseWeapon.system.traits || [];

// =========================
// CHECK DEFENSIVE TRAIT
// =========================

const hasDefensive = traits.some(t => t.key === "defensive");

if (hasDefensive) {

  console.log("=== DEFENSIVE APPLIED ===", {
    weapon: defenseWeapon.name,
    before: value,
    traits
  });

  value += 10;

  console.log("=== DEFENSIVE RESULT ===", {
    after: value
  });

}

parryBase = value;

  console.log("SDP | Parry from defense weapon", {
    weapon: defenseWeapon.name,
    value
  });

}

// 🔥 FALLBACK NORMAL
else if (meleeWeapons.length > 0) {

  const values = [];

  for (let weapon of meleeWeapons) {

    const skill = getSkill(weapon.system.skill);

    let base = skill
      ? skill.system.value
      : system.attributes.meleeAbility.value;

    let value = base + (Number(weapon.system.parryBonus || 0) * 10);

    if (weapon.system.offhand) value -= offhandPenalty;

    values.push(value);
  }

  parryBase = Math.max(...values);

}

// 🔥 NO WEAPON
else {

  const skill = getSkill("brawl");

  parryBase = skill
    ? skill.system.value
    : system.attributes.meleeAbility.value;
}
    // =====================
    // ATTACK
    // =====================

    let attackBase = 0;

    if (equippedWeapons.length > 0) {

      const values = [];

     for (let weapon of equippedWeapons) {

  let base;

base = this._getBestWeaponSkill(weapon);
        let value = base + (Number(weapon.system.attackBonus || 0) * 10);

        if (weapon.system.offhand) value -= offhandPenalty;

        values.push(value);
      }

      attackBase = Math.max(...values);

    } else {

      const skill = getSkill("brawl");

      attackBase = skill
        ? skill.system.value
        : system.attributes.meleeAbility.value;
    }

    // =====================
    // DERIVED FINAL
    // =====================

    system.derived.woundThreshold.value = resistance?.system.bonus ?? 0;

// =====================
// CONDITION MALUS (PARry / EVASION)
// =====================

const cond = system.conditions || {};

let conditionPenalty = 0;

// stack conditions
conditionPenalty -= Number(cond.poisoned || 0);
conditionPenalty -= Number(cond.exhausted || 0);
conditionPenalty -= Number(cond.stunned || 0);
conditionPenalty -= Number(cond.deafened || 0);

if (cond.prone) conditionPenalty -= 2;
if (cond.surprised) conditionPenalty -= 3;
if (cond.shaken) conditionPenalty -= 1;
if (cond.frightened) conditionPenalty -= 3;

// =====================
// APPLY TO VALUES
// =====================

const finalParry = (parryBase / 10 + 5) + conditionPenalty;
system.derived.parry.value = Math.max(finalParry, 0);

const evasionBase =
  dodge?.system.value ??
  system.attributes.agility.value ??
  0;

const finalEvasion = (evasionBase / 10 + 5) + conditionPenalty;
system.derived.evasion.value = Math.max(finalEvasion, 0);

    // =====================
    // CONDITIONS EFFECTS
    // =====================

 

    const finalAttack = Math.max(attackBase, 0);

   system.derived.attack.value = finalAttack/10;
  //Math.round((finalAttack / 10) * 10) / 10;

    // =====================
    // MOVEMENT
    // =====================

    const baseMove = system.resources.movement.value ?? 0;
    const slowed = system.conditionTotals?.slowed ?? 0;

    const currentMove = Math.max(baseMove - slowed, 0);

    system.resources.movement.current = currentMove;
    system.resources.movement.walk = currentMove * 2;
    system.resources.movement.run = currentMove * 4;

    if (currentMove === 0 && slowed > 0) {
      system.conditions.entangled = true;
    }

const sign = this.items.find(i => i.type === "sign");

// =========================
// MANA CALCULATION
// =========================

const wpb = this.system.attributes.willpower?.bonus || 0;
const level = this.system.details?.level || 0;

console.log("Talent level:", level);
console.log("Mana bonus:", system.custom.manaMultiplierBonus);

// table non linéaire
const manaMultiplier = {
  0: 3,
  1: 4,
  2: 5,
  3: 6,
  4: 8,
  5: 10
};

// fallback si level > 5
const baseMultiplier = manaMultiplier[level] ?? 10;

const bonusMultiplier = system.custom.manaMultiplierBonus || 0;

const multiplier = baseMultiplier + Math.max(0, bonusMultiplier);

this.system.resources.mana = this.system.resources.mana || {};

this.system.resources.mana.max = wpb * multiplier;

// =========================
// 🔋 MANA CLAMP (ANTI OVERFLOW)
// =========================

const mana = system.resources?.mana;

if (mana) {

  const before = mana.value;

  mana.value = Math.min(mana.value, mana.max);

  if (mana.value !== before) {
    console.log("SDP | Mana clamped", {
      before,
      after: mana.value,
      max: mana.max,
      actor: this.name
    });
  }

}

  }

  // =====================
  // TALENT MAX
  // =====================

  getTalentMax(talent){

    const max = talent.system.max;

    if(!isNaN(max)) return Number(max);

    const attr = this.system.attributes[max];

    return attr?.bonus ?? 1;
  }

getWeaponAttack(weapon) {

  const system = this.system;

  const skills = this.items.filter(i => i.type === "skill");
  const getSkill = (key) => skills.find(s => s.system.key === key);

  // =========================
  // BASE
  // =========================

 let base;

base = this._getBestWeaponSkill(weapon);

  let value = base + (Number(weapon.system.attackBonus || 0) * 10);

  // =========================
  // OFFHAND
  // =========================

  const OFFHAND_PENALTY = 20;

  const reduction = system.custom.offhandReduction || 0;

  const offhandPenalty = Math.max(0, OFFHAND_PENALTY - reduction);

  if (weapon.system.offhand) {
    value -= offhandPenalty;
  }

  return value;
}

_getBestWeaponSkill(weapon) {

  const actor = this;

  let weaponSkills = [];

  if (Array.isArray(weapon.system.skills)) {
    weaponSkills = weapon.system.skills;
  }
  else if (typeof weapon.system.skill === "string") {
    weaponSkills = weapon.system.skill
      .split(",")
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0);
  }

  if (!weaponSkills.length) {
    weaponSkills = [weapon.system.skill];
  }

  const actorSkills = actor.items.filter(i => i.type === "skill");

  let bestValue = null;

  // =========================
  // DETERMINE BASE ATTRIBUTE
  // =========================

  const isRanged = weapon.system.category === "ranged";

  const baseAttribute = isRanged
    ? actor.system.attributes.rangedAbility.value
    : actor.system.attributes.meleeAbility.value;

  // =========================
  // LOOP SKILLS
  // =========================

  for (const group of weaponSkills) {

    const skill = actorSkills.find(s => {

      const key = (s.system.key || "").trim().toLowerCase();
      const name = (s.name || "").trim().toLowerCase();

      return key === group || name === group;

    });

    if (!skill) continue;

    const advances = Number(skill.system.advances || 0);
    const modifier = Number(skill.system.modifier || 0);

    // 🔥 NOUVEAU CALCUL
    const candidateValue = baseAttribute + advances + modifier;

    if (bestValue === null || candidateValue > bestValue) {
      bestValue = candidateValue;
    }

  }

  // =========================
  // FALLBACK
  // =========================

  if (bestValue === null) {
    return baseAttribute;
  }

  return bestValue;
}

}