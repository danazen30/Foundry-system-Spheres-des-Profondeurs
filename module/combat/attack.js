import { SdpRoll } from "../rolls/roll.js";
import { rollHitLocation } from "./hit-location.js";
import { SdpTraitEngine } from "../system/trait-engine.js";
import { WEAPON_TRAITS } from "../system/config.js";
import { ITEM_TRAITS } from "../system/config.js";

export class SdpAttack {

static async attackTest(actor, weapon, attackValue){

const dialogMods = game.sdp?.dialogModifiers || {};
const inspiration = dialogMods.inspiration || 0;
const useFinesse = dialogMods.finesse;
  // ======================
// STUNNED CHECK
// ======================

const stunned = actor.system.conditions?.stunned || 0;

if(stunned > 0){

  ui.notifications.warn(`${actor.name} is stunned and cannot attack`);
  return;

}

  const isRanged = weapon.system.category === "ranged";

  const weaponTraitsBase = weapon.system.traits || [];

const hasReload = weaponTraitsBase.some(t => t?.key === "reload");
const forceReload = weapon.system.forceReload;

if (hasReload && !weapon.system.loaded) {
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

  hitLocation = await rollHitLocation();

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

let rangeMod = 0;

if (ammo) {
  rangeMod = Number(ammo.system.rangeModifier) || 0;
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
  locationMod = CONFIG.SDP.hitLocationModifiers?.[hitLocation.location] || 0;
}

let targetValue =
  base +
  (dialogMods.totalMod || 0) +
  (dialogMods.conditionMod || 0) +
  locationMod +
  fastBonus;

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

   let critFailMin = 96;

// ===== DANGEROUS TRAIT =====
if (finalTraits.some(t => t.key === "dangerous")) {
  critFailMin = 86;

  console.log("SDP | DANGEROUS (RANGED)", {
    weapon: weapon.name,
    critFailMin
  });
}

let crit = {
  success: result >= 1 && result <= 5,
  failure: result >= critFailMin && result <= 100
};

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

    const success = result <= targetValue;

    let SL =
  Math.floor(targetValue / 10) -
  Math.floor(result / 10);

  // =========================
// INSPIRATION → SL BONUS
// =========================

const inspiration = dialogMods.inspiration || 0;

SL += inspiration;

console.log("SDP | INSPIRATION APPLIED (RANGED)", {
  inspiration,
  finalSL: SL
});

// 🔥 FIX -0
if (!success && SL === 0) {
  SL = -1;
}

// 🔥 APPLY SUCCESS BONUS
const selectedTalents = dialogMods.talents || [];

SL = SdpRoll.applySuccessBonus(SL, actor, selectedTalents);

    let critText = "";

if(crit.success){
  critText = `<p><strong>CRITICAL SUCCESS</strong></p>`;
}

if(crit.failure){
  critText = `<p><strong>CRITICAL FAILURE</strong></p>`;
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

  await weapon.update({ "system.loaded": false });

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
  <p>Roll: ${result}</p>
  ${inspiration > 0 ? `<p>Inspiration: +${inspiration}</p>` : ""}
  <p>SL: ${SL} (${SdpRoll.getSLLabel(SL)})</p>
  
  ${critText}
  ${breakText}

  <p>Hit Location: ${CONFIG.SDP.hitLocations[hitLocation.location]} (${hitLocation.roll.total})</p>

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

let crit = {
  success: result >= 1 && result <= 5,
  failure: result >= critFailMin && result <= 100
};

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
  locationMod = CONFIG.SDP.hitLocationModifiers?.[hitLocation.location] || 0;
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

if(crit.success){
  critText = `<p><strong>CRITICAL SUCCESS</strong></p>`;
}

if(crit.failure){
  critText = `<p><strong>CRITICAL FAILURE</strong></p>`;
}

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
  <p>Location: ${CONFIG.SDP.hitLocations[hitLocation.location]} (${hitLocation.roll.total})</p>
  ${critText}
  ${breakText}
  ${dialogMods.charge ? "<p>Charge</p>" : ""}
  <p>Attack Score: ${attackScore}</p>

 <button class="apply-defense">Apply Defense</button>

</div>
`;

  roll.toMessage({
  speaker: ChatMessage.getSpeaker({actor}),
  content: html
});

}

static async reloadTest(actor, weapon) {

  const reloadTrait = weapon.system.traits.find(t => t.key === "reload");
  const target = Number(reloadTrait?.value || 1);

  const roll = await (new Roll("1d100")).roll();
  const result = roll.total;
  const traits = weapon.system.traits || [];

let critFailMin = 96;

if (traits.some(t => t.key === "dangerous")) {
  critFailMin = 86;
}

let crit = {
  success: result >= 1 && result <= 5,
  failure: result >= critFailMin && result <= 100
};

const base = actor._getBestWeaponSkill(weapon);

const dialogMods = game.sdp?.dialogModifiers || {};

let targetValue =
  base +
  (dialogMods.totalMod || 0) +
  (dialogMods.conditionMod || 0);

const success = result <= targetValue;

let SL =
  Math.floor(targetValue / 10) -
  Math.floor(result / 10);

  if (!success && SL === 0) SL = -1;

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
  critText = `<p><strong>CRITICAL FAILURE</strong></p>`;
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