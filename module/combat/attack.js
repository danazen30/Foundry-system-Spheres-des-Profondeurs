import { SdpRoll } from "../rolls/roll.js";
import { rollHitLocation, getHitLocationProfile} from "./hit-location.js";
import { SdpTraitEngine } from "../system/trait-engine.js";
import { WEAPON_TRAITS } from "../system/config.js";
import { ITEM_TRAITS } from "../system/config.js";
import { SdpSizeEngine } from "../system/size-engine.js";


export class SdpAttack {

static async attackTest(actor, weapon, attackValue){

const dialogMods = game.sdp?.dialogModifiers || {};
const inspiration = dialogMods.inspiration || 0;
const useFinesse = dialogMods.finesse;
const hitProfileKey =
  dialogMods.hitLocationProfile ||
  actor.system.hitLocationProfile ||
  "humanoid";

const hitProfile =
  getHitLocationProfile(hitProfileKey);

  // ======================
// STUNNED CHECK
// ======================

const stunned = actor.system.conditions?.stunned || 0;

if(stunned > 0){

  ui.notifications.warn(`${actor.name} is stunned and cannot attack`);
  return;

}

  const isRanged = weapon.system.category === "ranged";

const weaponTraitsBase = Array.isArray(weapon.system.traits)
  ? weapon.system.traits
  : [];

const itemTraitsBase = Array.isArray(weapon.system.itemTraits)
  ? weapon.system.itemTraits
  : [];

const allReloadTraits = [
  ...weaponTraitsBase,
  ...itemTraitsBase
];

const hasReload = allReloadTraits.some(t => {

  if (!t) return false;

  if (typeof t === "string") {
    return t.toLowerCase() === "reload";
  }

  if (typeof t === "object") {
    return (t.key || "").toLowerCase() === "reload";
  }

  return false;

});

const forceReload = weapon.system.forceReload;

console.log("SDP | RELOAD CHECK", {
  weapon: weapon.name,
  hasReload,
  forceReload,
  loaded: weapon.system.loaded
});

// =========================
// FORCE RELOAD
// considère l'arme comme chargée
// =========================

if (hasReload && forceReload) {

  console.log("SDP | FORCE RELOAD ACTIVE", {
    weapon: weapon.name
  });

  // force loaded
  if (!weapon.system.loaded) {

    await weapon.update({
      "system.loaded": true,
      "system.reloadProgress": 0
    });

    // IMPORTANT
    weapon.system.loaded = true;
  }

}
else if (hasReload && !weapon.system.loaded) {

  console.log("SDP | RELOAD REQUIRED", {
    weapon: weapon.name
  });

  return await this.reloadTest(actor, weapon);

}

const targets = Array.from(game.user.targets);
let targetId = targets.length ? targets[0].id : null;

let conditionText = "";
let bonus = 0;



  let hitLocation;

if (dialogMods.location) {

  hitLocation = {
    location: dialogMods.location,
    roll: { total: "manual" }
  };

  } else {

  hitLocation = await rollHitLocation(hitProfileKey);

}

  // ======================
  // RANGED ATTACK
  // ======================

  if(isRanged){

    // =========================
// AMMO
// =========================

let ammo = null;

if (weapon.system.currentAmmo) {
  ammo = actor.items.get(weapon.system.currentAmmo);

  if (!ammo) {
    ui.notifications.warn("Invalid ammunition selected");
    return;
  }
} else if (weapon.system.consumesAmmo) {
  ui.notifications.warn("No ammunition selected");
  return;
}

console.log("SDP | Ammo used", {
  weapon: weapon.name,
  ammo: ammo?.name
});

const base = actor._getBestWeaponSkill(weapon);

// =========================
// RANGE CALCULATION
// =========================

let rangeModifier = 0;
let rangeLabel = "Unknown";
let measuredDistance = 0;

const targetToken = targets[0];
const sourceToken = actor.getActiveTokens()[0];

if (sourceToken && targetToken) {

const path = [
  sourceToken.center,
  targetToken.center
];

measuredDistance = canvas.grid.measurePath(path).distance;

// =========================
// FINAL RANGE (WEAPON + AMMO)
// =========================

const baseRange =
  Number(weapon.system.range || 0);

let ammoRangeModifier = 0;

if (ammo) {
  ammoRangeModifier =
    Number(ammo.system.rangeModifier || 0);
}

const weaponRange = Math.max(
  0,
  baseRange + ammoRangeModifier
);

const bands = CONFIG.SDP.rangeBands;

  if (measuredDistance <= weaponRange * bands.pointBlank.multiplier) {

    rangeModifier = bands.pointBlank.modifier;
    rangeLabel = bands.pointBlank.label;

  } else if (measuredDistance <= weaponRange * bands.short.multiplier) {

    rangeModifier = bands.short.modifier;
    rangeLabel = bands.short.label;

  } else if (measuredDistance <= weaponRange * bands.normal.multiplier) {

    rangeModifier = bands.normal.modifier;
    rangeLabel = bands.normal.label;

  } else if (measuredDistance <= weaponRange * bands.long.multiplier) {

    rangeModifier = bands.long.modifier;
    rangeLabel = bands.long.label;

  } else if (measuredDistance <= weaponRange * bands.extreme.multiplier) {

    rangeModifier = bands.extreme.modifier;
    rangeLabel = bands.extreme.label;

  } else {

    ui.notifications.warn("Target is out of range");
    return;

  }

  console.log("SDP | RANGE BAND", {
    weapon: weapon.name,
    distance: measuredDistance,
    range: weaponRange,
    band: rangeLabel,
    modifier: rangeModifier
  });

}

// =========================
// TRAIT : IMPALING
// =========================

const weaponTraits = weapon.system.traits || [];
const itemTraits = weapon.system.itemTraits || [];

const allTraits = [...weaponTraits, ...itemTraits];

let ammoTraits = [];

if (ammo) {
  ammoTraits = ammo.system.traits || [];
}

const traits = [...weaponTraits, ...itemTraits, ...ammoTraits];

const normalizedTraits = traits
  .filter(t => t)
  .map(t => {
    if (typeof t === "string") return { key: t };
    return t;
  });

// =========================
// SPLIT TRAITS (IMPORTANT)
// =========================

const getTraitConfig = (key) =>
  WEAPON_TRAITS?.[key] || ITEM_TRAITS?.[key];

const positiveTraits = normalizedTraits.filter(t =>
  getTraitConfig(t.key)?.type === "positive"
);

const negativeTraits = normalizedTraits.filter(t =>
  getTraitConfig(t.key)?.type === "negative"
);

// =========================
// SKILL CHECK
// =========================

const weaponSkills = (weapon.system.skill || "")
  .split(",")
  .map(s => s.trim().toLowerCase());

const actorSkills = actor.items.filter(i => i.type === "skill");

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

const hasValidSkill = !!bestSkill;

// =========================
// FINAL TRAITS
// =========================

const activePositiveTraits = hasValidSkill ? positiveTraits : [];
const finalTraits = [...activePositiveTraits, ...negativeTraits];

// =========================
// TRAITS DISPLAY
// =========================

const displayTraits = [
  ...activePositiveTraits.map(t => ({
    ...t,
    label: getTraitConfig(t.key)?.label || t.key,
    type: "positive"
  })),
  ...negativeTraits.map(t => ({
    ...t,
    label: getTraitConfig(t.key)?.label || t.key,
    type: "negative"
  }))
];

const traitsHTML = displayTraits.map(t => {
  return `<span class="trait-tag"
    data-trait="${t.key}"
    data-value="${t.value || ""}">
    ${t.label}${t.value ? ` (${t.value})` : ""}
  </span>`;
}).join("");

// =========================
// TRAIT : FAST
// =========================

let fastBonus = 0;

if (finalTraits.some(t => t.key === "fast")) {
  fastBonus = 10;
}

let locationMod = 0;

if (dialogMods.location) {

  locationMod =
    hitProfile.locations?.[hitLocation.location]?.modifier || 0;

}

let targetValue =
  base +
  (dialogMods.totalMod || 0) +
  (dialogMods.conditionMod || 0) +
  locationMod +
  fastBonus +
  rangeModifier;

  // =========================
// SIZE MODIFIER
// =========================

let sizeModifier = 0;

if (targets[0]?.actor) {

  sizeModifier = SdpSizeEngine.getRangedAttackModifier(
  targets[0].actor.system.size
);

  targetValue += sizeModifier;

  console.log("SDP | SIZE MODIFIER (RANGED)", {
    attacker: actor.name,
    target: targets[0].actor.name,
    modifier: sizeModifier,
    finalTarget: targetValue
  });

}

  // =========================
// OFFHAND (RANGED)
// =========================

if (weapon.system.offhand) {

  const reduction = actor.system.custom.offhandReduction || 0;

  const OFFHAND_PENALTY = 20;

  const penalty = Math.max(0, OFFHAND_PENALTY - reduction);

  targetValue -= penalty;

  console.log("SDP | OFFHAND RANGED", {
    penalty,
    reduction,
    finalTarget: targetValue
  });

}

  // =========================
// ITEM TRAITS
// =========================

// ===== PRACTICAL ITEM TRAIT (RANGED) =====
if (itemTraits.some(t => t.key === "practical")) {
  targetValue += 10;

  console.log("SDP | PRACTICAL (RANGED)", {
    weapon: weapon.name,
    newTarget: targetValue
  });
}

if (itemTraits.some(t => t.key === "impractical")) {
  targetValue -= 10;
}

// ===== PRECISE TRAIT =====
if (finalTraits.some(t => t.key === "precise")) {
  targetValue += 10;

  console.log("SDP | PRECISE (RANGED)", {
    weapon: weapon.name,
    newTarget: targetValue
  });
}

if (finalTraits.some(t => t.key === "imprecise")) {
  targetValue -= 10;

  console.log("SDP | IMPRECISE (RANGED)", {
    weapon: weapon.name,
    newTarget: targetValue
  });
}

// 🔥 juste pour affichage
let source = "Ranged Ability";

if (bestSkill) {
  source = bestSkill.name;
}
    const roll = await (new Roll("1d100")).roll();

    const result = roll.total;

    // =========================
// AMMO / WEAPON CONSUMPTION (ON ROLL)
// =========================

if (weapon.system.category === "ranged") {

  console.log("SDP | CONSUMPTION ON ATTACK ROLL", {
    weapon: weapon.name,
    consumesAmmo: weapon.system.consumesAmmo,
    ammo: ammo?.name
  });

  // =========================
  // NORMAL AMMO
  // =========================

  if (weapon.system.consumesAmmo) {

    if (ammo) {

      const current = ammo.system.quantity?.value ?? 0;

      // 🔥 SECURITE
      if (current <= 0) {

        ui.notifications.warn(`${ammo.name} is empty`);
        return;

      }

      const newValue = Math.max(current - 1, 0);

      await ammo.update({
        "system.quantity.value": newValue
      });

      console.log("SDP | Ammo consumed on roll", {
        ammo: ammo.name,
        before: current,
        after: newValue
      });

    } else {

      ui.notifications.warn("No ammunition selected");
      return;

    }

  }

  // =========================
  // THROWN WEAPON
  // =========================

  else {

    const current = weapon.system.quantity?.value ?? 0;

    if (current <= 0) {

      ui.notifications.warn(`${weapon.name} is depleted`);
      return;

    }

    const newValue = Math.max(current - 1, 0);

    await weapon.update({
      "system.quantity.value": newValue
    });

    console.log("SDP | Thrown weapon consumed on roll", {
      weapon: weapon.name,
      before: current,
      after: newValue
    });

  }

}

let critFailBase = 96;

// trait dangerous
if (finalTraits.some(t => t.key === "dangerous")) {
  critFailBase = 86;
}

    let success =
  result <= targetValue ||
  (targetValue <= 5 && result <= 5)

const crit = SdpRoll.getCritical(result, targetValue);

// 🔥 HARD OVERRIDE
if (result === 100) {
  success = false;
  crit.success = false;
  crit.failure = true;
}

// =========================
// FLAWED ITEM TRAIT (BREAK)
// =========================

let breakText = "";

if (crit.failure && itemTraits.some(t => t.key === "flawed")) {

  await weapon.update({
    "system.durability.value": 0
  });

  console.log("SDP | WEAPON BROKEN (FLAWED)", {
    weapon: weapon.name
  });

  breakText = `<p><strong>${weapon.name} breaks due to its fragility!</strong></p>`;
}

const isImpaling = finalTraits.some(t => t.key === "impaling");

const isRound = result % 10 === 0;

if (isImpaling && isRound && result <= targetValue) {
  crit.success = true;
}

    let SL =
  Math.floor(targetValue / 10) -
  Math.floor(result / 10);

  const adjusted = SdpRoll.applyDynamicResult(result, targetValue, success, SL);
success = adjusted.success;
SL = adjusted.SL;

  // =========================
// INSPIRATION → SL BONUS
// =========================

const inspiration = dialogMods.inspiration || 0;

SL += inspiration;

console.log("SDP | INSPIRATION APPLIED (RANGED)", {
  inspiration,
  finalSL: SL
});

// 🔥 APPLY SUCCESS BONUS
const selectedTalents = dialogMods.talents || [];

SL = SdpRoll.applySuccessBonus(SL, actor, selectedTalents);

// =========================
// TALENTS HTML
// =========================

const selectedTalentObjects = selectedTalents
  .map(id => actor.items.get(id))
  .filter(Boolean);

const talentsHTML =
  selectedTalentObjects.length > 0
    ? `
      <div class="roll-talents">

        <ul>
          ${selectedTalentObjects.map(t => `
            <li>
              ${t.name}
              ${t.system.advances
                ? `(${t.system.advances})`
                : ""}
            </li>
          `).join("")}
        </ul>
      </div>
    `
    : "";

let critText = "";

if (crit.success) {
  critText = `<p><strong>CRITICAL SUCCESS</strong></p>`;
}

if (crit.failure) {

  critText = `
    <p><strong>CRITICAL FAILURE</strong></p>

    <button class="roll-critical-failure"
      data-table="critical-attack-failure">
      Roll Critical Failure
    </button>
  `;
}


    let damageButton = "";

 if(success){

      damageButton = `
      <button type="button" type="button" class="roll-damage"
        data-actor="${actor.id}"
        data-weapon="${weapon.id}"
        data-ammo="${ammo?.id || ""}"
        data-target="${targetId ?? ""}">
        Roll Damage
      </button>
      `;

    }

    // 🔥 UNLOAD TOUJOURS SI RELOAD (SAFE)
if (finalTraits.some(t => t.key === "reload")) {

  await weapon.update({
  "system.loaded": false,
  "system.forceReload": false
});

  console.log("SDP | WEAPON UNLOADED (RANGED)", {
    weapon: weapon.name,
    success
  });

}

    const html = `
<div class="sdp-attack" data-sdp-safe="true"
     data-actor="${actor.id}"
     data-ammo="${ammo?.id || ""}"
     data-roll="${result}"
     data-type="ranged"
     data-testtarget="${targetValue}"
     data-critical="${crit.success}"
     data-brutal="${dialogMods.brutal}"
     data-weapon="${weapon.id}"
     data-target="${targetId ?? ""}"
     data-location="${hitLocation.location}"
     data-location-profile="${hitProfileKey}"
     data-talents='${JSON.stringify(dialogMods.talents || [])}'
     data-traits='${JSON.stringify(normalizedTraits)}'
     data-damagetype="${weapon.system.damageType || "slashing"}">

  <h3>${actor.name} shoots with ${weapon.name}</h3>

  <button class="edit-attack">Edit</button>

${displayTraits.length ? `
<div class="weapon-traits">

  ${displayTraits.some(t => t.type === "positive") ? `
    <div><strong>Advantages:</strong>
      ${displayTraits
        .filter(t => t.type === "positive")
        .map(t => `<span class="trait-tag">${t.label}</span>`)
        .join("")}
    </div>
  ` : ""}

  ${displayTraits.some(t => t.type === "negative") ? `
    <div><strong>Drawbacks:</strong>
      ${displayTraits
        .filter(t => t.type === "negative")
        .map(t => `<span class="trait-tag negative">${t.label}</span>`)
        .join("")}
    </div>
  ` : ""}

</div>
` : ""}

  <p>Test: ${source}</p>
  <p>Target: ${targetValue}</p>
${sizeModifier !== 0 ? `<p>Size Modifier: ${sizeModifier > 0 ? "+" : ""}${sizeModifier}</p>` : ""}
  <p>Range: ${rangeLabel} (${Math.round(measuredDistance)}m)</p>
  <p>Roll: ${result}</p>
  ${inspiration > 0 ? `<p>Inspiration: +${inspiration}</p>` : ""}
  <p>SL: ${SL} (${SdpRoll.getSLLabel(SL)})</p>
  
  ${critText}
  ${breakText}

  <p>
Hit Location:
${hitProfile.locations?.[hitLocation.location]?.label || hitLocation.location}
(${hitLocation.roll.total})
</p>
${talentsHTML}
  <p><strong>${success ? "HIT" : "MISS"}</strong></p>

  ${damageButton}

</div>
`;

    roll.toMessage({
  speaker: ChatMessage.getSpeaker({actor}),
  content: html
});

    return;

  }

  // =========================
// TRAITS (MELEE FIX)
// =========================

const weaponTraits = weapon.system.traits || [];
const itemTraits = weapon.system.itemTraits || [];

const allTraits = [...weaponTraits, ...itemTraits];

const normalizedTraits = allTraits
  .filter(t => t)
  .map(t => {
    if (typeof t === "string") return { key: t };
    return t;
  });

// =========================
// SPLIT TRAITS
// =========================

const positiveTraits = normalizedTraits.filter(t =>
  WEAPON_TRAITS?.[t.key]?.type === "positive"
);

const negativeTraits = normalizedTraits.filter(t =>
  WEAPON_TRAITS?.[t.key]?.type === "negative"
);

// =========================
// SKILL CHECK
// =========================

const weaponSkills = (weapon.system.skill || "")
  .split(",")
  .map(s => s.trim().toLowerCase());

const actorSkills = actor.items.filter(i => i.type === "skill");

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

const hasValidSkill = !!bestSkill;

// =========================
// FINAL TRAITS
// =========================

const activePositiveTraits = hasValidSkill ? positiveTraits : [];
const finalTraits = [...activePositiveTraits, ...negativeTraits];

  // ======================
  // MELEE ATTACK
  // ======================

  const isMelee = true;
const meleeBonus = Math.floor((dialogMods.totalMod || 0) / 10);

let chargeBonus = 0;

if (dialogMods.charge) {
  chargeBonus = 1;
}

let baseAttack = actor.getWeaponAttack(weapon) / 10;

// =========================
// FINESSE OVERRIDE
// =========================

if (useFinesse && weapon.system.traits?.some(t => t.key === "finesse")) {

  const DEX = actor.system.attributes.dexterity.value;

  const bestSkill = actor.items.find(i =>
    i.type === "skill" &&
    weapon.system.skill?.toLowerCase().includes(i.name.toLowerCase())
  );

  const advances = bestSkill?.system?.advances || 0;

  baseAttack =
    Math.floor(DEX / 10) +
    Math.floor(advances / 10);
}

// =========================
// WEAPON BONUS (SAFE)
// =========================

const weaponAttack =
  Number(weapon.system.attack) ||
  Number(weapon.system.attackBonus) ||
  0;

// ⚠️ seulement en finesse (sinon déjà inclus)
if (useFinesse && weapon.system.traits?.some(t => t.key === "finesse")) {
  baseAttack += weaponAttack;
}

const roll = await (new Roll("1d100")).roll();
const result = roll.total;

let critFailMin = 96;

if (finalTraits.some(t => t.key === "dangerous")) {
  critFailMin = 86;

  console.log("SDP | DANGEROUS (MELEE)", {
    weapon: weapon.name,
    critFailMin
  });
}

let critFailBase = 96;

if (finalTraits.some(t => t.key === "dangerous")) {
  critFailBase = 86;

  console.log("SDP | DANGEROUS (MELEE)", {
    weapon: weapon.name,
    critFailMin: critFailBase
  });
}

const crit = SdpRoll.getCritical(
  result,
  baseAttack * 10,
  {
    critFailBase
  }
);

// 🔥 melee : désactive uniquement les crit success natifs
crit.success = false;

// =========================
// FLAWED ITEM TRAIT (BREAK)
// =========================

let breakText = "";

if (crit.failure && itemTraits.some(t => t.key === "flawed")) {

  await weapon.update({
    "system.durability.value": 0
  });

  console.log("SDP | WEAPON BROKEN (FLAWED)", {
    weapon: weapon.name
  });

  breakText = `<p><strong>${weapon.name} breaks due to its fragility!</strong></p>`;
}
const traitsData = normalizedTraits.map(t => ({
  key: t.key,
  label: WEAPON_TRAITS?.[t.key]?.label || t.key,
  value: t.value
}));

let fastBonus = 0;

if (finalTraits.some(t => t.key === "fast")) {
  fastBonus = 1; // ⚠️ ici c’est en "points"
}

const isImpaling = finalTraits.some(t => t.key === "impaling");

// chiffre rond (10,20,...)
const isRound = result % 10 === 0;

const successCheck = result <= (baseAttack * 10);

if (isImpaling && isRound && successCheck) {
  crit.success = true;
}

let SL;

if (result === 100) {
  SL = 0;
} else {
  const tens = Math.floor(result / 10);
  SL = 10 - tens;
}

// 🎯 attack score final
let locationMod = 0;

if (dialogMods.location) {

  locationMod =
    hitProfile.locations?.[hitLocation.location]?.modifier || 0;

}

let attackScore =
  baseAttack +
  meleeBonus +
  SL +
  bonus +
  inspiration +
  fastBonus +
  chargeBonus +
  Math.floor((dialogMods.conditionMod || 0) / 10) +
  Math.floor(locationMod / 10); // 🔥 AJOUT

  // =========================
// SIZE MODIFIER
// =========================

let sizeModifier = 0;

const meleeTarget = targets[0]?.actor;

if (meleeTarget) {

  sizeModifier = SdpSizeEngine.getAttackModifier(
  actor.system.size,
  meleeTarget.system.size
);

  const sizeBonus = Math.floor(sizeModifier / 10);

  attackScore += sizeBonus;

  console.log("SDP | SIZE MODIFIER (MELEE)", {
    attacker: actor.name,
    target: meleeTarget.name,
    modifier: sizeModifier,
    appliedBonus: sizeBonus,
    finalAttack: attackScore
  });

}

  // =========================
// ITEM TRAITS
// =========================

// ===== PRACTICAL ITEM TRAIT (MELEE) =====
if (itemTraits.some(t => t.key === "practical")) {
  attackScore += 1;

  console.log("SDP | PRACTICAL (MELEE)", {
    weapon: weapon.name,
    newAttack: attackScore
  });
}

if (itemTraits.some(t => t.key === "impractical")) {
  attackScore -= 1;
}

// ===== PRECISE TRAIT =====
if (finalTraits.some(t => t.key === "precise")) {
  attackScore += 1;

  console.log("SDP | PRECISE (MELEE)", {
    weapon: weapon.name,
    newAttack: attackScore
  });
}

// ===== SLOW TRAIT =====
if (finalTraits.some(t => t.key === "slow")) {
  attackScore -= 1;

  console.log("SDP | SLOW (MELEE)", {
    weapon: weapon.name,
    newAttack: attackScore
  });
}

if (finalTraits.some(t => t.key === "imprecise")) {
  attackScore -= 1;

  console.log("SDP | IMPRECISE (MELEE)", {
    weapon: weapon.name,
    newAttack: attackScore
  });
}

let context = {
  actor,
  weapon,
  data: {
    damage: 0,
    parry: 0,
    initiativeBonus: 0
  }
};

context = SdpTraitEngine.applyAttackTraits(context);

 let critText = "";

if (crit.success) {
  critText = `<p><strong>CRITICAL SUCCESS</strong></p>`;
}

if (crit.failure) {

  critText = `
    <p><strong>CRITICAL FAILURE</strong></p>

    <button class="roll-critical-failure"
      data-table="critical-attack-failure">
      Roll Critical Failure
    </button>
  `;
}

  // =========================
// TALENTS HTML
// =========================

const selectedTalents = dialogMods.talents || [];

const selectedTalentObjects = selectedTalents
  .map(id => actor.items.get(id))
  .filter(Boolean);

const talentsHTML =
  selectedTalentObjects.length > 0
    ? `
      <div class="roll-talents">

        <ul>
          ${selectedTalentObjects.map(t => `
            <li>
              ${t.name}
              ${t.system.advances
                ? `(${t.system.advances})`
                : ""}
            </li>
          `).join("")}
        </ul>
      </div>
    `
    : "";

  const html = `
<div class="sdp-attack"
     data-roll="${result}"
     data-attack="${attackScore}"
     data-baseattack="${baseAttack}"
    data-type="melee"
    data-meleebonus="${meleeBonus}"
     data-actor="${actor.id}"
     data-weapon="${weapon.id}"
     data-target="${targetId ?? ""}"
     data-location="${hitLocation.location}"
     data-location-profile="${hitProfileKey}"
     data-critical="${crit.success}"
     data-brutal="${dialogMods.brutal}"
     data-traits='${JSON.stringify(normalizedTraits)}'
     data-damagetype="${weapon.system.damageType || "slashing"}">

  <h3>${actor.name} attacks with ${weapon.name}</h3>

  <button class="edit-attack">Edit</button>

  ${traitsData.length ? `
  <div class="weapon-traits">
    <strong>Traits:</strong>
    ${traitsData.map(t => `
      <span class="trait-tag"
      data-trait="${t.key}"
      data-value="${t.value || ""}">
       ${t.label}${t.value ? ` (${t.value})` : ""}
      </span>
    `).join("")}
  </div>
` : ""}

  <p>Roll: ${result}</p>
  <p>SL: ${SL}</p>
  ${inspiration > 0 ? `<p>Inspiration: +${inspiration}</p>` : ""}
  <p>
Location:
${hitProfile.locations?.[hitLocation.location]?.label || hitLocation.location}
(${hitLocation.roll.total})
</p>
  ${critText}
  ${breakText}
  ${dialogMods.charge ? "<p>Charge</p>" : ""}
  ${talentsHTML}
  <p>Attack Score: ${attackScore}</p>
${sizeModifier !== 0 ? `<p>Size Modifier: ${sizeModifier > 0 ? "+" : ""}${Math.floor(sizeModifier / 10)} DR</p>` : ""}

 <button class="apply-defense">Apply Defense</button>

</div>
`;

  roll.toMessage({
  speaker: ChatMessage.getSpeaker({actor}),
  content: html
});

}

static async reloadTest(actor, weapon) {

  const reloadTrait = [...(weapon.system.traits || []), ...(weapon.system.itemTraits || [])]
  .find(t => {
    if (typeof t === "string") return t === "reload";
    return t.key === "reload";
  });
  const target = Number(reloadTrait?.value || 1);

  const roll = await (new Roll("1d100")).roll();
  const result = roll.total;
  const traits = weapon.system.traits || [];

let critFailMin = 96;

if (traits.some(t => t.key === "dangerous")) {
  critFailMin = 86;
}

const base = actor._getBestWeaponSkill(weapon);

const dialogMods = game.sdp?.dialogModifiers || {};

let targetValue =
  base +
  (dialogMods.totalMod || 0) +
  (dialogMods.conditionMod || 0);

  const crit = SdpRoll.getCritical(result, targetValue, {
  critFailBase: critFailMin
});

let success;

if (result === 100) {
  success = false;
} else {
  success =
  result <= targetValue ||
  (targetValue <= 0 && result <= 5);
}

let SL =
  Math.floor(targetValue / 10) -
  Math.floor(result / 10);

// 🔥 APPLY RULE
const adjusted = SdpRoll.applyDynamicResult(result, targetValue, success, SL);
success = adjusted.success;
SL = adjusted.SL;

  // =========================
// CRITICAL EFFECTS
// =========================

if (crit.success) {
  SL += 2;

  console.log("SDP | RELOAD CRIT SUCCESS", {
    weapon: weapon.name,
    newSL: SL
  });
}

if (crit.failure) {
  SL = 0;

  console.log("SDP | RELOAD CRIT FAILURE", {
    weapon: weapon.name
  });
}

  const progressGain = Math.max(0, SL);
const newProgress = weapon.system.reloadProgress + progressGain;

  const loaded = newProgress >= target;

  await weapon.update({
    "system.reloadProgress": loaded ? 0 : newProgress,
    "system.loaded": loaded
  });

  console.log("SDP | RELOAD TEST", {
    weapon: weapon.name,
    roll: result,
    SL,
    progress: newProgress,
    target,
    loaded
  });

let critText = "";

if (crit.success) {
  critText = `<p><strong>CRITICAL SUCCESS</strong></p>`;
}

if (crit.failure) {

  critText = `
    <p><strong>CRITICAL FAILURE</strong></p>

    <button class="roll-reload-critical">
      Reload Malfunction
    </button>
  `;
}

  const html = `
<div class="sdp-reload">
  <h3>${actor.name} reloads ${weapon.name}</h3>

  <p>Target: ${targetValue}</p>
  <p>Roll: ${result}</p>
  <p>SL: ${SL}</p>
${critText}

  <p>Progress: ${newProgress}/${target}</p>

  <p><strong>${loaded ? "RELOADED" : "LOADING..."}</strong></p>
</div>
`;

  roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: html
  });

}

}