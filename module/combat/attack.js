import { SdpRoll } from "../rolls/roll.js";
import { rollHitLocation } from "./hit-location.js";
import { SdpTraitEngine } from "../system/trait-engine.js";
import { WEAPON_TRAITS } from "../system/config.js";

export class SdpAttack {

static async attackTest(actor, weapon, attackValue){
const dialogMods = game.sdp?.dialogModifiers || {};
const inspiration = dialogMods.inspiration || 0;
  // ======================
// STUNNED CHECK
// ======================

const stunned = actor.system.conditions?.stunned || 0;

if(stunned > 0){

  ui.notifications.warn(`${actor.name} is stunned and cannot attack`);
  return;

}

  const isRanged = weapon.system.category === "ranged";



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
}

console.log("SDP | Ammo used", {
  weapon: weapon.name,
  ammo: ammo?.name
});

// =========================
// BEST SKILL (MULTI SUPPORT)
// =========================

const base = actor._getBestWeaponSkill(weapon);

let rangeMod = 0;

if (ammo) {
  rangeMod = Number(ammo.system.rangeModifier) || 0;
}

// =========================
// TRAIT : IMPALING
// =========================

const weaponTraits = weapon.system.traits || [];

let ammoTraits = [];

if (ammo) {
  ammoTraits = ammo.system.traits || [];
}

const traits = [...weaponTraits, ...ammoTraits];

const normalizedTraits = traits
  .filter(t => t) // 🔥 IMPORTANT (enlève null/undefined)
  .map(t => {
    if (typeof t === "string") {
      return { key: t };
    }
    return t;
  });

// =========================
// TRAITS DISPLAY
// =========================

const traitsData = normalizedTraits.map(t => ({
  key: t.key,
  label: WEAPON_TRAITS?.[t.key]?.label || t.key,
  value: t.value
}));

const traitsHTML = traitsData.map(t => {
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

if (normalizedTraits.some(t => t.key === "fast")) {
  fastBonus = 10;
}

const targetValue = base + (dialogMods.totalMod || 0) + fastBonus;

// 🔥 juste pour affichage
let source = "Ranged Ability";

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

if (bestSkill) {
  source = bestSkill.name;
}
    const roll = await (new Roll("1d100")).roll();

    const result = roll.total;

    let crit = SdpRoll.getCritical(result);

const isImpaling = normalizedTraits.some(t => t.key === "impaling");

const isRound = result % 10 === 0;

if (isImpaling && isRound && result <= targetValue) {
  crit.success = true;
}

    const success = result <= targetValue;

    let SL =
  Math.floor(targetValue / 10) -
  Math.floor(result / 10);

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
     data-traits='${JSON.stringify(normalizedTraits)}'>

  <h3>${actor.name} shoots with ${weapon.name}</h3>

  <button class="edit-attack">Edit</button>

${traitsData.length ? `
<div class="weapon-traits">
  <strong>Traits:</strong>
  ${traitsHTML}
</div>
` : ""}

  <p>Test: ${source}</p>
  <p>Target: ${targetValue}</p>
  <p>Roll: ${result}</p>
  <p>SL: ${SL} (${SdpRoll.getSLLabel(SL)})</p>
  
  ${critText}

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

  // ======================
  // MELEE ATTACK
  // ======================
const meleeBonus = Math.floor((dialogMods.totalMod || 0) / 10);

let chargeBonus = 0;

if (dialogMods.charge) {
  chargeBonus = 1;
}

const baseAttack = actor.getWeaponAttack(weapon) / 10;

const roll = await (new Roll("1d100")).roll();
const result = roll.total;

let crit = SdpRoll.getCritical(result);

// =========================
// TRAIT : IMPALING
// =========================

const traits = weapon.system.traits || [];

const normalizedTraits = traits
  .filter(t => t) // 🔥 IMPORTANT (enlève null/undefined)
  .map(t => {
    if (typeof t === "string") {
      return { key: t };
    }
    return t;
  });

const traitsData = normalizedTraits.map(t => ({
  key: t.key,
  label: WEAPON_TRAITS?.[t.key]?.label || t.key,
  value: t.value
}));

let fastBonus = 0;

if (normalizedTraits.some(t => t.key === "fast")) {
  fastBonus = 1; // ⚠️ ici c’est en "points"
}

const isImpaling = normalizedTraits.some(t => t.key === "impaling");

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
const attackScore = baseAttack + meleeBonus + SL + bonus + inspiration + fastBonus + chargeBonus;

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
     data-traits='${JSON.stringify(normalizedTraits)}'>

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
  <p>Inspiration: +${inspiration}</p>
  <p>Location: ${CONFIG.SDP.hitLocations[hitLocation.location]} (${hitLocation.roll.total})</p>
  ${critText}
  ${dialogMods.charge ? "<p>Charge</p>" : ""}
  <p>Attack Score: ${attackScore}</p>

  ${targetId
    ? `<button class="apply-defense">Apply Defense</button>`
    : `<button class="select-target">Select Target</button>`
  }

</div>
`;

  roll.toMessage({
  speaker: ChatMessage.getSpeaker({actor}),
  content: html
});

}

}