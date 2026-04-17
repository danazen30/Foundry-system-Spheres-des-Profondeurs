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
const useFinesse = dialogMods.finesse;

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

// =========================
// INOFFENSIVE TRAIT
// =========================

const traits = weapon.system.traits || [];

const hasInoffensive = traits.some(t => {
  const key = (t.key || "")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[\s_]/g, "-");

  return key === "inoffensive";
});

if (hasInoffensive) {
  armor *= 2;

  console.log("SDP | INOFFENSIVE APPLIED", {
    weapon: weapon.name,
    doubledArmor: armor
  });
}

 const SB = actor.system.attributes.strength.bonus;
const DB = actor.system.attributes.dexterity.bonus;

const statBonus = useFinesse ? DB : SB;

let baseWeapon = 0;

let impactfulTrait = null;

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
// SIGN BONUS (AVANT ROLL)
// =========================

const signEffects = actor.getSignEffects();
let bonus = signEffects.damageBonus || null;
let signDiceFormula = null;

if (useSB && bonus) {

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

if (useSB) formula += `${statBonus}`;
if (baseWeapon > 0) formula += (formula ? " + " : "") + baseWeapon;
if (diceFormula) formula += (formula ? " + " : "") + diceFormula;

if (signDiceFormula) {
  formula += (formula ? " + " : "") + signDiceFormula;
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
weaponDetail.push(`${count}d${faces} → ${max}`);;
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

damage = weaponMax + signTotal + baseWeapon + (useSB ? statBonus : 0);

  return {
  roll: signRoll,
  damage,
  finalDamage: Math.max(damage - armor, 0),
  armor,
  formula,
  devastating,
  weaponDetail: weaponDetail.join(" + "),
  baseWeapon,
  SB: useSB ? statBonus : 0
};
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

  // ⚠️ damage est DÉJÀ FINAL (armor déjà retirée)
  const finalDamage = damage;

  const current = actor.system.health.value;
  const newHealth = current - finalDamage;

  await actor.update({
    "system.health.value": newHealth
  });

  const severity = this.getWoundSeverity(finalDamage, WT);

  return {
    armor: 0,
    finalDamage,
    newHealth,
    severity,
    WT,
    current
  };
}

static getArmorValue(actor, location){

  let armor = 0;

  const armors = actor.items.filter(
    i => i.type === "armor" && i.system.worn.value
  );

  for (let item of armors){
    armor += item.system.AP[location] ?? 0;
  }

  // =========================
  // PROTECTRICE TRAIT
  // =========================

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

      return key === "protectrice";
    });

    if (protectrice) {

      const value = Number(protectrice.value || 0);

      armor += value;

      console.log("SDP | PROTECTRICE APPLIED", {
        weapon: defenseWeapon.name,
        bonus: value,
        finalArmor: armor
      });

    }

  }

  return armor;

}

}