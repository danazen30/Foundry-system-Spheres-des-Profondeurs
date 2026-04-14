export class SdpDamage {

  static getDamageFormula(actor, weapon){

    const SB = actor.system.attributes.strength.bonus;

    let baseFormula = weapon.system.damage || "0";

    baseFormula = baseFormula.replace("SB", SB);

    const dice = weapon.system.damageDice || "";


    if(dice){
      return `${baseFormula} + ${dice}`;
    }

    return baseFormula;

  }


  static async applyDamage(target, damage){

    const current = target.system.health.value;

    const newHealth = Math.max(current - damage, 0);

    await target.update({
      "system.health.value": newHealth
    });

  }

  static getArmorValue(actor, location){

  let armor = 0;

  const armors = actor.items.filter(
    i => i.type === "armor" && i.system.worn.value
  );

  for (let item of armors){

    armor += item.system.AP[location] ?? 0;

  }

  return armor;

}

static async applyDamage(target, damage, location){

  const armor = this.getArmorValue(target, location);

  const finalDamage = Math.max(damage - armor, 0);

  const current = target.system.health.value;

  const newHealth = Math.max(current - finalDamage, 0);

  await target.update({
    "system.health.value": newHealth
  });

  return {
    armor,
    finalDamage
  };

}

static getWoundSeverity(damage, WT) {

  if (damage < WT * 2) return null;

  if (damage < WT * 3) return "light";
  if (damage < WT * 4) return "moderate";
  if (damage < WT * 5) return "severe";
  if (damage < WT * 6) return "critical";

  return "instant";
}

static async rollDamage({ actor, weapon, target, location, critical, brutal, ammoId }) {

  const dialogMods = game.sdp?.dialogModifiers || {};

  // =========================
// AMMO
// =========================

let ammo = null;

if (ammoId) {
  ammo = actor.items.get(ammoId);
}

console.log("SDP | Damage ammo", ammo?.name);

  // =========================
  // ARMOR
  // =========================
  let armor = 0;

  if (target) {
    armor = this.getArmorValue(target, location);
  }

  const SB = actor.system.attributes.strength.bonus;

let baseWeapon = 0;

let impactfulTrait = null;

const traits = weapon.system.traits || [];

let devastating = false;

for (let t of traits) {
  if (!t) continue;

  if (t.key === "devastating") {
    devastating = true;
    break;
  }
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

let useSB = baseFormula.includes("SB");

// =========================
// BASE WEAPON
// =========================

let weaponBase = baseFormula
  .replace("SB", "")
  .replace("+", "")
  .trim();

weaponBase = Number(weaponBase) || 0;

baseWeapon = weaponBase;

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
  // CRITICAL
  // =========================
  if (critical) {
    baseWeapon *= 2;

if (diceFormula) {

  diceFormula = diceFormula.replace(/(\d+)d(\d+)/g, (match, diceCount, diceSize) => {
    return `${Number(diceCount) * 2}d${diceSize}`;
  });
}
}

  // =========================
// IMPACTFUL (PERCUTANTE)
// =========================

if (impactfulTrait && dialogMods.charge) {

  const impactfulValue = impactfulTrait.value; // ex: "1d4"

  if (impactfulValue && impactfulValue.includes("d")) {

    diceFormula = diceFormula
      ? `${diceFormula} + ${impactfulValue}`
      : impactfulValue;

    console.log("SDP | IMPACTFUL ADDED:", impactfulValue);
  }
}

  // =========================
  // BUILD FORMULA
  // =========================
let formula = "";

if (useSB) formula += `${SB}`;
if (baseWeapon > 0) formula += (formula ? " + " : "") + baseWeapon;
if (diceFormula) formula += (formula ? " + " : "") + diceFormula;

// =========================
// SIGN BONUS (AVANT ROLL)
// =========================
const signEffects = actor.getSignEffects();
let bonus = signEffects.damageBonus || null;

if (useSB && bonus) {

  if (typeof bonus === "string" && bonus.includes("d")) {
    formula += (formula ? " + " : "") + bonus;
  } else {
    formula += (formula ? " + " : "") + Number(bonus);
  }

}

// =========================
// ROLL FINAL
// =========================

console.log("=== DAMAGE DEBUG ===");
console.log("weapon.system.damage:", weapon.system.damage);
console.log("weapon.system.damageDice:", weapon.system.damageDice);
console.log("weapon.system.damage?.dice:", weapon.system.damage?.dice);
console.log("baseFormula:", baseFormula);
console.log("diceFormula:", diceFormula);
console.log("FINAL FORMULA:", formula);
const roll = new Roll(formula);
await roll.evaluate();

let damage = roll.total;


  // =========================
  // BRUTAL
  // =========================
  if (brutal) {

    const match = diceFormula.match(/(\d+)d(\d+)/);

    if (match) {
      const diceCount = Number(match[1]);
      const diceSize = Number(match[2]);

      const maxDice = diceCount * diceSize;

      damage = maxDice + baseWeapon + (useSB ? SB : 0);

      if (critical) damage *= 2;
    }
  }

  // =========================
  // LOCATION MULT
  // =========================
  if (location === "head") {
    damage = Math.floor(damage * 1.5);
  }

  const finalDamage = Math.max(damage - armor, 0);

  return {
  roll,
  damage,
  finalDamage,
  armor,
  formula,
  devastating
};
}

static async applyFullDamage({ actor, damage, location }) {

  const WT = actor.system.derived.woundThreshold.value;

  const armor = this.getArmorValue(actor, location);
  const finalDamage = Math.max(damage - armor, 0);

  const current = actor.system.health.value;
  const newHealth = current - finalDamage;

  await actor.update({
    "system.health.value": newHealth
  });

  const severity = this.getWoundSeverity(finalDamage, WT);

  return {
    armor,
    finalDamage,
    newHealth,
    severity,
    WT,
    current
  };
}

}