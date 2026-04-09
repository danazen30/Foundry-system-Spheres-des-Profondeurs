import { SdpRoll } from "../rolls/roll.js";
import { rollHitLocation } from "./hit-location.js";

export class SdpSpell {

    static resolveFormula(value, actor){

  if (!value) return 0;

  let str = String(value).toUpperCase().trim();

  const attrs = actor.system.attributes;

  // =========================
  // MAPPING COMPLET (UI → DATA)
  // =========================

  const map = {

    // ===== STRENGTH =====
    S: attrs.strength?.value ?? 0,
    SB: attrs.strength?.bonus ?? 0,

    // ===== TOUGHNESS =====
    T: attrs.toughness?.value ?? 0,
    TB: attrs.toughness?.bonus ?? 0,

    // ===== AGILITY =====
    AG: attrs.agility?.value ?? 0,
    AGB: attrs.agility?.bonus ?? 0,

    // ===== DEXTERITY =====
    DEX: attrs.dexterity?.value ?? 0,
    DEXB: attrs.dexterity?.bonus ?? 0,

    // ===== INITIATIVE =====
I: attrs.initiative?.value ?? 0,
IB: attrs.initiative?.bonus ?? 0,

    // ===== INTELLIGENCE =====
    INT: attrs.intelligence?.value ?? 0,
    INTB: attrs.intelligence?.bonus ?? 0,

    // ===== WILLPOWER =====
    WP: attrs.willpower?.value ?? 0,
    WPB: attrs.willpower?.bonus ?? 0,

    // ===== CHARISMA =====
    CHA: attrs.charisma?.value ?? 0,
    CHAB: attrs.charisma?.bonus ?? 0,

    // ===== COMBAT =====
    MA: attrs.meleeAbility?.value ?? 0,
    MAB: attrs.meleeAbility?.bonus ?? 0,

    RA: attrs.rangedAbility?.value ?? 0,
    RAB: attrs.rangedAbility?.bonus ?? 0
  };

  // =========================
  // TRI IMPORTANT (évite bugs SB / S)
  // =========================

  const keys = Object.keys(map).sort((a, b) => b.length - a.length);

  for (const key of keys){
    const regex = new RegExp(`\\b${key}\\b`, "g");
    str = str.replace(regex, map[key]);
  }

  // =========================
  // EVAL SAFE
  // =========================

  try {
    return Math.floor(eval(str));
  } catch (e) {
    console.warn("Formula error:", value, "→", str);
    return 0;
  }

}

static _getBestSpellSkill(actor, spell){

  const skillString = spell.system.magic?.value || "";

  const skillKeys = skillString
    .split(",")
    .map(s => (s || "").toLowerCase().trim());

      console.log("=== SPELL DEBUG ===");
console.log("Spell:", spell.name);
console.log("Skill string:", skillString);
console.log("Parsed keys:", skillKeys);

  const actorSkills = actor.items.filter(i => i.type === "skill");


console.log("Actor skills:", actorSkills.map(s => ({
  name: s.name,
  key: s.system.key,
  value: s.system.value
})));

  let best = null;

  for (const key of skillKeys){

    const skill = actorSkills.find(s => {

  const keyMatch =
    ((s.system.key || "").toLowerCase().trim() === key);

  const nameMatch =
    ((s.name || "").toLowerCase().trim() === key);

  return keyMatch || nameMatch;
});
console.log("Checking key:", key, "=>", skill);
    if (!skill) continue;

    if (!best || skill.system.value > best.system.value){
      best = skill;
    }
  }

  return best;
}

static getSpellCritical(result, hasSkill){

  return {
    success: result >= 1 && result <= 5,

    failure: hasSkill
      ? result >= 96
      : result >= 81
  };

}

static async cast(actor, spell, baseValue){

  const dialogMods = game.sdp?.dialogModifiers || {};

  const selectedTalents = dialogMods.talents || [];

    const system = spell.system;

  const magicType = system.magicType?.value ?? "minor";

  // ======================
  // BASE
  // ======================

const INT = actor.system.attributes.intelligence.value;

const bestSkill = this._getBestSpellSkill(actor, spell);

let skillValue = 0;
let skillName = "No Skill";

if (bestSkill){
  skillValue = bestSkill.system.value;
  skillName = bestSkill.name;
}

const targetValue =
  (skillValue || INT) +
  (dialogMods.totalMod || 0);

  const roll = await (new Roll("1d100")).roll();
  const result = roll.total;

  const hasSkill = bestSkill !== null && bestSkill !== undefined;

const crit = SdpSpell.getSpellCritical(result, hasSkill);
  const success = result <= targetValue;

 let magicConsequence = null;

if (crit.failure){

  let severity = "minor";

  // ======================
  // TYPE MAGIC
  // ======================

  if (magicType === "advanced"){
    severity = "major";
  }

  if (magicType === "superior"){
    severity = "major";
  }

  // ======================
  // TALENT DOWNGRADE
  // ======================

  const selectedTalents = dialogMods.talents || [];

const hasDowngradeTalent = actor.items.some(i => {
  if (i.type !== "talent") return false;

  // 🔥 IMPORTANT → doit être sélectionné
  if (!selectedTalents.includes(i.id)) return false;

  return Array.from(i.effects).some(e =>
    Array.from(e.changes).some(c =>
      c.key === "magicDowngrade" &&
      ["true", true, 1, "1"].includes(c.value)
    )
  );
});

  if (magicType === "advanced" && hasDowngradeTalent){
    severity = "minor";
  }

  // superior = JAMAIS downgrade

  magicConsequence = severity;

}

  // ======================
  // SL
  // ======================

let SL =
  Math.floor(targetValue / 10) -
  Math.floor(result / 10);

// 🔥 FIX -0
if (!success && SL === 0) {
  SL = -1;
}

SL += dialogMods.inspiration || 0;

// 🔥 APPLY SUCCESS BONUS
SL = SdpRoll.applySuccessBonus(SL, actor, selectedTalents);

  // ======================
  // LOCATION
  // ======================

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
// DAMAGE CHECK
// ======================

const baseDamage = system.damage?.base?.value ?? system.damage ?? 0;
const diceDamage = system.damage?.dice?.value ?? system.damageDice ?? "";

const hasDamage =
  (Number(baseDamage) > 0) ||
  (typeof diceDamage === "string" && diceDamage.trim() !== "");

  const concentration = system.concentration?.value === true;
  const hasSpecialOvercast = system.overcast?.value === true;
  const power = system.power?.value ?? 0;
const memorized = system.memorized?.value === true;
const manaCost = memorized ? power : power * 2;

const durationRaw = system.duration?.value ?? 0;
const duration = SdpSpell.resolveFormula(durationRaw, actor);
const durationType = system.duration?.type ?? "";

const targets = system.target?.value ?? 0;
const rangeRaw = system.range?.value ?? 0;
const radiusRaw = system.radius?.value ?? 0;

const range = SdpSpell.resolveFormula(rangeRaw, actor);
const radius = SdpSpell.resolveFormula(radiusRaw, actor);

const overcast = SdpRoll.getOvercast(SL);
let specialEffects = system.overcastSpecialEffects?.value;

// 🔥 FIX Foundry (object → array)
if (!Array.isArray(specialEffects)) {
  specialEffects = Object.values(specialEffects || {});
}

const isAoE = system.aoe?.value === true;

  // ======================
  // TEXT
  // ======================

  let critText = "";
  if (crit.success){
  critText = `
  <p>
    <strong class="spell-crit-success clickable">
      CRITICAL SUCCESS
    </strong>
  </p>`;
}

if (crit.failure){
  critText = `
  <p>
    <strong class="spell-crit-failure clickable"
      data-severity="${magicConsequence || "minor"}">
      CRITICAL FAILURE
    </strong>
  </p>`;
}

  const currentMana = actor.system.resources.mana.value;

if (currentMana < manaCost) {
  ui.notifications.warn("Not enough mana");
  return;
}

await actor.update({
  "system.resources.mana.value": currentMana - manaCost
}); 

  // ======================
  // DAMAGE BUTTON
  // ======================

  let damageButton = "";

  if (success && hasDamage) {
    damageButton = `
    <button class="roll-damage"
      data-actor="${actor.id}"
      data-weapon="${spell.id}"
      data-target="${Array.from(game.user.targets)[0]?.id || ""}">
      Roll Damage
    </button>
    `;
  }

  // ======================
  // CHAT CARD
  // ======================

  const html = `
<div class="sdp-spell" data-sdp-safe="true"
     data-type="spell"
     data-actor="${actor.id}"
     data-roll="${result}"
     data-testtarget="${targetValue}"
     data-critical="${crit.success}"
     data-hasskill="${hasSkill}"
     data-weapon="${spell.id}"
     data-location="${hitLocation.location}"
     data-talents='${JSON.stringify(selectedTalents)}'
     data-overcast="${overcast}"
     data-overcast="${overcast}"
     data-overcast-used="0">

  <h3>${actor.name} casts ${spell.name}</h3>

  <button class="edit-attack">Edit</button>

  <p><strong>Magic Type:</strong> ${magicType}</p>
  <p><strong>Used:</strong> ${bestSkill ? skillName : "Intelligence"} (${bestSkill ? skillValue : INT})</p>

  <p class="spell-target"><strong>Target:</strong> ${targetValue}</p>
<p class="spell-roll"><strong>Roll:</strong> ${result}</p>
<p class="spell-sl">
  <strong>SL:</strong> ${SL} (${SdpRoll.getSLLabel(SL)})
</p>

 <div class="crit-block">
  ${critText}
</div>
  ${magicConsequence ? `
  <p><strong>Magical Consequence:</strong> ${magicConsequence.toUpperCase()}</p>
` : ""}

<p class="spell-result"><strong>${success ? "SUCCESS" : "FAILURE"}</strong></p>

<p><strong>Mana Cost:</strong> ${manaCost}</p>

<p><strong>Location:</strong> ${CONFIG.SDP.hitLocations[hitLocation.location]}</p>

${concentration ? `<p><strong>Concentration</strong></p>` : ""}

<hr>

${overcast > 0 ? `
<p class="spell-overcast">
  <strong>Overcast:</strong> ${overcast}
</p>

<div class="spell-overcast-controls">

  ${specialEffects.map((e, i) => {

  const base = SdpSpell.resolveFormula(e.value, actor);

  return `
    <p class="spell-special overcast-click"
       data-type="special"
       data-index="${i}"
       data-base="${base}"
       data-value="${base}">
       
      <strong>${e.label}:</strong>
      <span class="value">${base}</span>
      
    </p>
  `;

}).join("")}

    </div>
  ` : ""}


${range > 0 ? `
  <p class="spell-range overcast-click"
   data-type="range"
   data-base="${range}"
   data-value="${range}"
   data-unit="m">
   <strong>Range:</strong>
   <span class="value">${range}</span> m
</p> ` : ""}

${duration > 0 ? `
${!concentration ? `
<p class="spell-duration overcast-click" data-type="duration"
   data-base="${duration}"
   data-value="${duration}"
   data-unit="${durationType}">
   <strong>Duration:</strong>
<span class="value">${duration}</span> ${durationType}
</p>
` : ""}
` : ""}


  ${isAoE
  ? (radius > 0 ? `
    <p class="spell-radius overcast-click"
   data-type="aoe"
   data-base="${radius}"
   data-value="${radius}">
   <strong>Radius:</strong>
<span class="value">${radius}</span>
<button class="place-aoe">📍</button>
</p>` : "")
  : (targets > 0 ? `
    <p class="spell-target-count overcast-click" data-type="target"
       data-base="${targets}"
       data-value="${targets}">
       <strong>Targets:</strong>
<span class="value">${targets}</span>
    </p>` : "")
}

${hasSpecialOvercast ? `<p><strong>Special Overcast:</strong> Yes</p>` : ""}

  <hr>

  ${damageButton}

</div>
`;

  roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: html
  });

}

}