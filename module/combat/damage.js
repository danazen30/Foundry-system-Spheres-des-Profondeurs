import { SdpSizeEngine } from "../system/size-engine.js";
import { SdpRoll } from "../rolls/roll.js";
import { SdpMount } from "../system/mount-utils.js";
import {
  hasWeaponDamageStatBonus,
  parseWeaponDamageFormula
} from "../system/formula-utils.js";

export class SdpDamage {

static getTalentDamageReduction(actor) {

  if (!actor) return 0;

  let reduction = 0;

  for (const item of actor.items) {

    if (item.type !== "talent") continue;

    const level = Number(item.system.advances || 1);

    for (const effect of item.effects) {

      if (effect.disabled) continue;

      for (const change of effect.changes) {

        if (change.key !== "damageReduction") continue;

        reduction += Number(change.value || 0) * level;

      }

    }

  }

  return reduction;

}

static resolveIncomingDamage(damageAfterArmor, actor) {

  if (damageAfterArmor <= 0) return 0;

  const reduction = this.getTalentDamageReduction(actor);

  return Math.max(1, damageAfterArmor - reduction);

}

static getEffectiveWoundThreshold(actor) {

  return Math.max(
    0,
    actor.system?.derived?.woundThreshold?.value ?? 0
  );

}

static getWoundSeverity(damage, WT) {

  if (damage < WT * 2) {
    return null;
  }

  if (damage < WT * 3) {
    return "light";
  }

  if (damage < WT * 4) {
    return "moderate";
  }

  if (damage < WT * 5) {
    return "severe";
  }

  if (damage < WT * 6) {
    return "critical";
  }

  return "instant";
}

static applyInjurySeverityBonus(severity, steps = 0) {

  if (!severity || steps <= 0) {
    return severity;
  }

  const order = [
    "light",
    "moderate",
    "severe",
    "critical",
    "instant"
  ];

  const index = order.indexOf(severity);

  if (index < 0) {
    return severity;
  }

  return order[
    Math.min(index + steps, order.length - 1)
  ];

}

static normalizeTraitKey(trait) {
  if (!trait) return "";
  const raw = typeof trait === "string" ? trait : (trait.key || "");
  return String(raw)
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[\s_]/g, "-");
}

static getBleedingThreshold(traits = []) {
  const trait = (traits || []).find((t) =>
    this.normalizeTraitKey(t) === "bleeding"
  );
  if (!trait) return null;

  const raw = String(trait.value ?? "").trim();
  // Versatile can store "5/4" — use the first threshold by default.
  const match = raw.match(/(\d+)/);
  if (!match) return null;

  const threshold = Number(match[1]);
  return threshold > 0 ? threshold : null;
}

static extractDieResultsFromRoll(roll) {
  if (!roll?.dice?.length) return [];

  const results = [];
  for (const die of roll.dice) {
    for (const entry of die.results || []) {
      if (entry.active === false) continue;
      results.push(Number(entry.result));
    }
  }
  return results;
}

/** Keep only results that match the weapon/ammo dice formula (ignore sign dice, etc.). */
static extractMatchingDieResults(roll, diceFormula) {
  const neededFaces = [];
  const matches = String(diceFormula || "").match(/(\d+)d(\d+)/gi) || [];

  for (const match of matches) {
    const parts = match.match(/(\d+)d(\d+)/i);
    if (!parts) continue;
    const count = Number(parts[1]);
    const faces = Number(parts[2]);
    for (let i = 0; i < count; i++) {
      neededFaces.push(faces);
    }
  }

  if (!neededFaces.length || !roll?.dice?.length) return [];

  const remaining = [...neededFaces];
  const results = [];

  for (const die of roll.dice) {
    for (const entry of die.results || []) {
      if (entry.active === false) continue;
      const idx = remaining.indexOf(die.faces);
      if (idx === -1) continue;
      remaining.splice(idx, 1);
      results.push(Number(entry.result));
    }
  }

  return results;
}

static expandMaxDieResults(diceFormula) {
  const results = [];
  const matches = String(diceFormula || "").match(/(\d+)d(\d+)/gi) || [];

  for (const match of matches) {
    const parts = match.match(/(\d+)d(\d+)/i);
    if (!parts) continue;
    const count = Number(parts[1]);
    const faces = Number(parts[2]);
    for (let i = 0; i < count; i++) {
      results.push(faces);
    }
  }

  return results;
}

static countBleedingStacks(traits, dieResults) {
  const threshold = this.getBleedingThreshold(traits);
  if (!threshold || !dieResults?.length) {
    return { stacks: 0, threshold: threshold || 0 };
  }

  const stacks = dieResults.filter(
    (result) => Number(result) >= threshold
  ).length;

  return { stacks, threshold };
}

static async rollDamage({ actor, weapon, target, location, critical, brutal, ammoId, damageType = null, defenseType }) {

  const dialogMods = game.sdp?.dialogModifiers || {};
const useFinesse = dialogMods.finesse;

  // =========================
// AMMO
// =========================

let ammo = null;

if (ammoId) {
  ammo = actor.items.get(ammoId);
}

  // =========================
  // ARMOR
  // =========================
  let armor = 0;
  let armorBase = 0;
  let armorMultiplierReason = "";

if (target) {
  const resolvedDamageType = this.normalizeDamageType(
    damageType ?? weapon.system.damageType
  );

armorBase = this.getArmorValue(
  target,
  location,
  resolvedDamageType,
  defenseType
);
armor = armorBase;
}

// =========================
// INOFFENSIVE TRAIT
// =========================

const traits = weapon.system.traits || [];

const hasInoffensive = traits.some(t => {

  if (!t) return false;

  const key = (typeof t === "string" ? t : (t.key || ""))
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[\s_]/g, "-");

  return key === "inoffensive";

});

if (hasInoffensive && armor > 0) {
  armor *= 2;
  armorMultiplierReason = "inoffensive";
}

let impactfulTrait = null;

let devastating = false;

// =========================
// WEAPON DEVASTATING
// =========================

for (let t of traits) {

  if (!t) continue;

  const key = (t.key || "")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[\s_]/g, "-");

  if (key === "devastating") {
    devastating = true;
    break;
  }
}

// =========================
// SIZE DEVASTATING
// =========================

if (
  !devastating &&
  target &&
  SdpSizeEngine.grantsDevastating(
    this.resolveActorSize(actor),
    this.resolveActorSize(target)
  )
) {

  devastating = true;

}

for (let t of traits) {
  if (!t) continue;

  if (t.key === "impactful") {
    impactfulTrait = t;
    break;
  }
}

// =========================
// NORMALISATION SPELL / WEAPON
// =========================

// 🎯 BASE DAMAGE
let baseFormula = weapon.system.damage || weapon.system.damage_base || "0";

// cas spell structuré
if (typeof baseFormula === "object") {

  // { base: { value: X } }
  if (baseFormula.base?.value !== undefined) {
    baseFormula = baseFormula.base.value;
  }

  // { value: X }
  else if (baseFormula.value !== undefined) {
    baseFormula = baseFormula.value;
  }

  else {
    baseFormula = 0;
  }
}

// 🎯 DICE
let diceFormula =
  weapon.system.damageDice ??
  weapon.system.damage_dice ??
  weapon.system.damage?.dice ??
  "";

  let weaponDiceFormula = diceFormula; // 🔥 garde les dés de l'arme uniquement

  // 🔥 IMPORTANT : sync avec crit
if (critical && weaponDiceFormula) {
  weaponDiceFormula = weaponDiceFormula.replace(/(\d+)d(\d+)/g, (match, diceCount, diceSize) => {
    return `${Number(diceCount) * 2}d${diceSize}`;
  });
}

// cas spell structuré
if (typeof diceFormula === "object") {

  // { value: "1d4" }
  if (diceFormula.value !== undefined) {
    diceFormula = diceFormula.value;
  } else {
    diceFormula = "";
  }
}

// array safety
if (Array.isArray(diceFormula)) {
  diceFormula = diceFormula.flat().join(" + ");
}

// final clean
baseFormula = String(baseFormula).trim();
diceFormula = String(diceFormula).trim();

const { statBonus, flatBase } = parseWeaponDamageFormula(
  baseFormula,
  actor,
  { useFinesse }
);

const useStatBonus = hasWeaponDamageStatBonus(baseFormula);

// =========================
// BASE WEAPON
// =========================

let baseWeapon = flatBase;

// =========================
// AMMO (BASE + DICE)
// =========================

if (ammo) {

  const ammoBase = Number(ammo.system.damage?.base?.value || 0);
  baseWeapon += ammoBase;

  const ammoDice = ammo.system.damage?.dice?.value;

  if (ammoDice) {
    diceFormula = diceFormula
      ? `${diceFormula} + ${ammoDice}`
      : ammoDice;
  }

}

console.log("SDP | FINAL BASE:", baseWeapon);
console.log("SDP | FINAL DICE:", diceFormula);



// =========================
// SIGN BONUS (AVANT ROLL)
// =========================

const signEffects = actor.getSignEffects();
let bonus = signEffects.damageBonus || null;
let signDiceFormula = null;

if (useStatBonus && bonus) {

  if (typeof bonus === "string" && bonus.includes("d")) {
    signDiceFormula = bonus; // 🎯 on garde pour roll séparé
  } else {
    formula += (formula ? " + " : "") + Number(bonus);
  }

}

  // =========================
  // CRITICAL
  // =========================

  if (critical) {
  baseWeapon *= 2;

  // weapon dice
  if (diceFormula) {
    diceFormula = diceFormula.replace(/(\d+)d(\d+)/g, (match, diceCount, diceSize) => {
      return `${Number(diceCount) * 2}d${diceSize}`;
    });
  }
}

  // =========================
    // BUILD FORMULA
  // =========================
let formula = "";

if (statBonus) formula += `${statBonus}`;
if (baseWeapon > 0) formula += (formula ? " + " : "") + baseWeapon;
if (diceFormula) formula += (formula ? " + " : "") + diceFormula;

// Weapon/ammo dice present in the formula (before impactful mutation below).
const rolledDiceFormula = diceFormula;

if (signDiceFormula) {
  formula += (formula ? " + " : "") + signDiceFormula;
}

  // =========================
// IMPACTFUL (PERCUTANTE) — foot charge only
// =========================

const mountedCharge =
  dialogMods.mountedCharge
  || (dialogMods.charge && SdpMount.isMounted(actor));

if (impactfulTrait && dialogMods.charge && !mountedCharge) {

  const impactfulValue = impactfulTrait.value; // ex: "1d4"

  if (impactfulValue && impactfulValue.includes("d")) {

    diceFormula = diceFormula
      ? `${diceFormula} + ${impactfulValue}`
      : impactfulValue;

    // Rebuild formula so impactful dice are rolled.
    formula = "";
    if (statBonus) formula += `${statBonus}`;
    if (baseWeapon > 0) formula += (formula ? " + " : "") + baseWeapon;
    if (diceFormula) formula += (formula ? " + " : "") + diceFormula;
    if (signDiceFormula) {
      formula += (formula ? " + " : "") + signDiceFormula;
    }

    console.log("SDP | IMPACTFUL ADDED:", impactfulValue);
  }
}

// =========================
// ROLL FINAL
// =========================

console.log("FINAL FORMULA:", formula);
const roll = new Roll(formula);
await roll.evaluate();

let damage = roll.total;

// =========================
// SIZE DAMAGE MULTIPLIER
// =========================

const sizeMultiplier =
  CONFIG.SDP.sizes?.[this.resolveActorSize(actor)]?.damageMultiplier || 1;

damage = Math.floor(damage * sizeMultiplier);

const talentDamageBonus = SdpRoll.getAttackDamageBonus(
  actor,
  dialogMods.talents || []
);

if (talentDamageBonus) {
  damage += talentDamageBonus;

  console.log("SDP | TALENT ATTACK DAMAGE BONUS", {
    actor: actor.name,
    bonus: talentDamageBonus
  });
}

// =========================
// MOUNTED CHARGE (+50%) / COUNTER-CHARGE ANTI-LARGE (×2)
// =========================

if (mountedCharge) {
  damage = Math.floor(damage * 1.5);
  console.log("SDP | MOUNTED CHARGE DAMAGE ×1.5", { damage });
}

const hasAntiLarge = traits.some((t) => {
  if (!t) return false;
  const key = this.normalizeTraitKey(t);
  return key === "anti-large" || key === "antilarge";
});

if (dialogMods.counterCharge && hasAntiLarge) {
  damage = Math.floor(damage * 2);
  console.log("SDP | COUNTER-CHARGE ANTI-LARGE ×2", { damage });
}

if (
  dialogMods.counterCharge &&
  target &&
  SdpMount.isMounted(target)
) {
  await SdpMount.knockDownMounted(target);
}

  // =========================
  // BRUTAL
  // =========================
if (brutal) {

let weaponMax = 0;
let weaponDetail = [];

  // =========================
  // WEAPON DICE → MAX (PAS DE ROLL)
  // =========================

  if (weaponDiceFormula) {

    const matches = weaponDiceFormula.match(/(\d+)d(\d+)/g) || [];

    for (let m of matches) {
      const [, count, faces] = m.match(/(\d+)d(\d+)/);
      const max = Number(count) * Number(faces);
weaponMax += max;
weaponDetail.push(
  `${count}d${faces} → ${max}`
);
    }
  }

  // =========================
  // SIGN DICE → VRAI ROLL
  // =========================

  let signRoll = null;
  let signTotal = 0;

  if (signDiceFormula) {
    signRoll = new Roll(signDiceFormula);
    await signRoll.evaluate();

    // 🎲 Dice So Nice
    await game.dice3d?.showForRoll(signRoll);

    signTotal = signRoll.total;
  }

  // =========================
  // TOTAL FINAL
  // =========================

  damage = weaponMax + signTotal + baseWeapon + statBonus + talentDamageBonus;

  if (mountedCharge) {
    damage = Math.floor(damage * 1.5);
  }

  if (dialogMods.counterCharge && hasAntiLarge) {
    damage = Math.floor(damage * 2);
  }

  const damageAfterArmor = Math.max(damage - armor, 0);

  const finalDamage = target
    ? this.resolveIncomingDamage(damageAfterArmor, target)
    : damageAfterArmor;

  const brutalDieResults = this.expandMaxDieResults(weaponDiceFormula);
  const bleeding = this.countBleedingStacks(traits, brutalDieResults);

  return {
  roll: signRoll,
  damage,
  damageAfterArmor,
  finalDamage,
  armor,
  armorBase,
  armorMultiplierReason,
  formula,
  devastating,
  weaponDetail: weaponDetail.join(" + "),
  baseWeapon,
  SB: statBonus,
  bleedingStacks: bleeding.stacks,
  bleedingThreshold: bleeding.threshold
};
}

  // =========================
  // LOCATION MULT
  // =========================
  if (location === "head" && target?.type !== "vehicle") {
    damage = Math.floor(damage * 1.5);
  }

  const damageAfterArmor = Math.max(damage - armor, 0);

  const finalDamage = target
    ? this.resolveIncomingDamage(damageAfterArmor, target)
    : damageAfterArmor;

  const bleeding = this.countBleedingStacks(
    traits,
    this.extractMatchingDieResults(roll, rolledDiceFormula)
  );

  return {
  roll,
  damage,
  damageAfterArmor,
  finalDamage,
  armor,
  armorBase,
  armorMultiplierReason,
  formula,
  devastating,
  rolledDiceFormula,
  bleedingStacks: bleeding.stacks,
  bleedingThreshold: bleeding.threshold
};
}

static async applyFullDamage({
  actor,
  damage,
  location,
  severitySteps = 0
}) {

  const WT =
    this.getEffectiveWoundThreshold(actor);

  const current = actor.system.health.value;

  // =========================
  // VEHICLE
  // Button damage is always AFTER armor (never subtract again).
  // =========================

  if (actor.type === "vehicle") {
    const incoming = Math.max(0, Number(damage) || 0);
    const severity = this.applyInjurySeverityBonus(
      this.getWoundSeverity(incoming, WT),
      severitySteps
    );

    return this.applyVehicleDamage({
      actor,
      finalDamage: incoming,
      severity,
      current,
      WT
    });
  }

  // damage = après armure, avant réduction de talent
  const finalDamage = this.resolveIncomingDamage(damage, actor);
  const newHealth = current - finalDamage;

  await actor.update({
    "system.health.value": newHealth
  });

  return {
    armor: 0,
    finalDamage,
    newHealth,
    severity: this.applyInjurySeverityBonus(
      this.getWoundSeverity(finalDamage, WT),
      severitySteps
    ),
    WT,
    current
  };
}

static async applyVehicleDamage({
  actor,
  finalDamage,
  severity,
  current,
  WT
}) {

  const newHealth = Math.max(0, current - finalDamage);

  const maxCritical = Math.max(
    1,
    Number(actor.system.criticalWounds?.max) || 3
  );

  let criticalWounds = Number(
    actor.system.criticalWounds?.value ?? 0
  );

  let addedCritical = false;
  let destroyed = false;

  if (severity === "instant") {
    destroyed = true;
    criticalWounds = maxCritical;
    addedCritical = true;
  } else if (severity === "critical") {
    criticalWounds = Math.min(maxCritical, criticalWounds + 1);
    addedCritical = true;
  }

  const outOfService =
    destroyed ||
    newHealth <= 0 ||
    criticalWounds >= maxCritical;

  await actor.update({
    "system.health.value": newHealth,
    "system.criticalWounds.value": criticalWounds,
    "system.outOfService": outOfService
  });

  return {
    armor: 0,
    finalDamage,
    newHealth,
    severity,
    WT,
    current,
    criticalWounds,
    criticalWoundsMax: maxCritical,
    addedCritical,
    outOfService,
    destroyed
  };
}

static normalizeDamageType(damageType) {
  if (!damageType) return null;
  if (typeof damageType === "string") return damageType;
  if (typeof damageType === "object") {
    return damageType.value || damageType.type || null;
  }
  return null;
}

static resolveActorSize(actor) {
  return (
    actor?.system?.details?.size?.value ||
    actor?.system?.size ||
    "average"
  );
}

static normalizeVehicleArmorTraits(raw) {
  const result = {
    padded: false,
    dense: false,
    layered: false
  };

  if (!raw) return result;

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      const key = typeof entry === "string" ? entry : entry?.key;
      if (key && Object.prototype.hasOwnProperty.call(result, key)) {
        result[key] = true;
      }
    }
    return result;
  }

  for (const key of Object.keys(result)) {
    const entry = raw[key];
    result[key] =
      entry === true ||
      entry === 1 ||
      entry === "true" ||
      entry?.selected === true ||
      entry?.value === true;
  }

  return result;
}

static getArmorValue(actor, location, damageType = null, defenseType = null){

  if (actor?.type === "vehicle") {
    const base = Math.max(
      0,
      Number(
        foundry.utils.getProperty(actor, "system.armor.value") ?? 0
      ) || 0
    );

    const dt = this.normalizeDamageType(damageType);
    const traits = this.normalizeVehicleArmorTraits(
      actor.system?.armorTraits
    );

    let value = base;

    // Only explicit true flags can double AP.
    if (traits.padded && dt === "bludgeoning") value *= 2;
    else if (traits.dense && dt === "slashing") value *= 2;
    else if (traits.layered && dt === "piercing") value *= 2;

    return value;
  }

  let armor = 0;

  const armors = actor.items.filter(
    i => i.type === "armor" && i.system.worn.value
  );

for (let item of armors){

  let ap = Number(item.system.AP[location] ?? 0);

  // =========================
  // PADDED (REMBOURRÉ)
  // =========================

const traits = item.system.armorTraits || [];
const resolvedDamageType = this.normalizeDamageType(damageType);

const hasPadded = traits.some(t => (t.key || "").toLowerCase() === "padded");
const hasDense = traits.some(t => (t.key || "").toLowerCase() === "dense");
const hasLayered = traits.some(t => (t.key || "").toLowerCase() === "layered");

// PADDED → BLUDGEONING
if (hasPadded && resolvedDamageType === "bludgeoning") {
  ap *= 2;

  console.log("SDP | PADDED APPLIED", {
    armor: item.name,
    location,
    finalAP: ap
  });
}

// DENSE → SLASHING
if (hasDense && resolvedDamageType === "slashing") {
  ap *= 2;

  console.log("SDP | DENSE APPLIED", {
    armor: item.name,
    location,
    finalAP: ap
  });
}

// LAYERED → PIERCING
if (hasLayered && resolvedDamageType === "piercing") {
  ap *= 2;

  console.log("SDP | LAYERED APPLIED", {
    armor: item.name,
    location,
    finalAP: ap
  });
}

  armor += ap;
}

// =========================
// PROTECTRICE TRAIT (PARRY ONLY)
// =========================

if (defenseType === "parry") {

  const defenseWeapon = actor.items.find(i =>
    i.type === "weapon" &&
    i.system.equipped &&
    i.system.isDefenseWeapon
  );

  if (defenseWeapon) {

    const traits = defenseWeapon.system.traits || [];

    const protectrice = traits.find(t => {
      const key = (t.key || "")
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .toLowerCase()
        .replace(/[\s_]/g, "-");

      return key === "protective";
    });

    if (protectrice) {

      const value = Number(protectrice.value || 0);

      armor += value;

      console.log("SDP | PROTECTRICE APPLIED (PARRY)", {
        weapon: defenseWeapon.name,
        bonus: value,
        finalArmor: armor
      });

    }

  }

}

  return armor;

}

}