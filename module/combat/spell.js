import { SdpRoll } from "../rolls/roll.js";
import { resolveSdpFormula } from "../system/formula-utils.js";
import { getActorItemDisplayName } from "../system/item-localization.js";
import { getTokenIdForActor } from "../system/actor-utils.js";
import { buildDamageModsControlsHtml } from "../chat/damage-mods-ui.js";

export class SdpSpell {

    static resolveFormula(value, actor){
      return resolveSdpFormula(value, actor);
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



static async cast(actor, spell, baseValue){

  const dialogMods = game.sdp?.dialogModifiers || {};

 const hitProfileKey =
  dialogMods.hitLocationProfile ||
  actor.system.hitLocationProfile ||
  "humanoid";

  const selectedTalents = dialogMods.talents || [];

    const system = spell.system;

  const magicType = system.magicType?.value ?? "minor";

  // ======================
  // BASE
  // ======================

const INT = actor.system.attributes.intelligence.value;

const bestSkill = this._getBestSpellSkill(actor, spell);

let skillValue = 0;
let skillName =
  game.i18n.localize("SDP.NoSkill");

if (bestSkill){
  skillValue = bestSkill.system.value;
  skillName = getActorItemDisplayName(bestSkill) || bestSkill.name;
}

const targetValue =
  (skillValue || INT) +
  (dialogMods.totalMod || 0) +
  SdpRoll.getTargetBonus(
    actor,
    selectedTalents
  );

  const roll = await (new Roll("1d100")).roll();
  const result = roll.total;

  const hasSkill = bestSkill !== null && bestSkill !== undefined;

let success;

if (result === 100) {
  success = false;
} else {
  success =
  result <= targetValue ||
  (targetValue <= 5 && result <= 5);
}

let SL =
  Math.floor(targetValue / 10) -
  Math.floor(result / 10);

// 🔥 APPLY RULE
const adjusted = SdpRoll.applyDynamicResult(result, targetValue, success, SL);
success = adjusted.success;
SL = adjusted.SL;

const critFailBase = hasSkill ? 96 : 81;

const crit = SdpRoll.getCritical(result, targetValue, {
  critFailBase
});

// 🔥 HARD OVERRIDE
if (result === 100) {
  success = false;
  crit.success = false;
  crit.failure = true;
}

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

SL += dialogMods.inspiration || 0;

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
              ${getActorItemDisplayName(t)}
              ${t.system.advances
                ? `(${t.system.advances})`
                : ""}
            </li>
          `).join("")}
        </ul>
      </div>
    `
    : "";

// 🔥 APPLY SUCCESS BONUS
SL = SdpRoll.applyTalentSLModifiers(SL, actor, selectedTalents);

  // ======================
  // DAMAGE CHECK (before location — skip location if no damage)
  // ======================

const baseDamage = system.damage?.base?.value ?? system.damage ?? 0;
const diceDamage = system.damage?.dice?.value ?? system.damageDice ?? "";

const hasDamage =
  (String(baseDamage ?? "").trim() !== "" && String(baseDamage).trim() !== "0") ||
  (typeof diceDamage === "string" && diceDamage.trim() !== "");

  const hitLocationMode =
    system.hitLocationMode?.value === "fixed" ? "fixed" : "random";
  const fixedHitLocation =
    system.fixedHitLocation?.value || "body";

  const concentration = system.concentration?.value === true;
  const hasSpecialOvercast = system.overcast?.value === true;
  const power = system.power?.value ?? 0;
  const manaCost = power;

const durationRaw = system.duration?.value ?? 0;
const duration = SdpSpell.resolveFormula(durationRaw, actor);
const durationType = system.duration?.type ?? "";

const targets = system.target?.value ?? 0;
const lockTargets = system.lockTargets?.value === true;
const isProjectile = system.projectile?.value === true;
const rangeRaw = system.range?.value ?? 0;
const radiusRaw = system.radius?.value ?? 0;
const maintainRangeRaw = String(system.maintainRange?.value ?? "").trim();
const maintainRange = maintainRangeRaw
  ? SdpSpell.resolveFormula(maintainRangeRaw, actor)
  : 0;
const maintainRangeLabel = maintainRangeRaw
  ? (maintainRange > 0 ? `${maintainRange} m` : maintainRangeRaw)
  : "";

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
      ${game.i18n.localize("SDP.CriticalSuccess")}
    </strong>
  </p>`;
}

if (crit.failure){
  critText = `
  <p>
    <strong class="spell-crit-failure clickable"
      data-severity="${magicConsequence || "minor"}">
      ${game.i18n.localize("SDP.CriticalFailure")}
    </strong>
  </p>`;
}

  const currentMana = actor.system.resources.mana.value;

if (currentMana < manaCost) {
  ui.notifications.warn(
  game.i18n.localize("SDP.NotEnoughMana")
);
  return;
}

await actor.update({
  "system.resources.mana.value": currentMana - manaCost
}); 

  // ======================
  // DAMAGE BUTTON
  // ======================

  const tokenId = getTokenIdForActor(actor);

  let damageButton = "";

  if (success && hasDamage) {
    const ignoreArmor = !!system.ignoreArmor;
    damageButton = `
    ${buildDamageModsControlsHtml()}
    <button class="roll-damage"
      data-actor="${actor.id}"
      data-token="${tokenId}"
      data-weapon="${spell.id}"
      data-ignore-armor="${ignoreArmor}">
      ${game.i18n.localize("SDP.RollDamage")}
    </button>
    `;
  }

  // ======================
  // CHAT CARD
  // ======================

  const damageType =
    (typeof system.damageType === "object"
      ? system.damageType?.value
      : system.damageType) || "special";

  const html = `
<div class="sdp-spell" data-sdp-safe="true"
     data-type="spell"
     data-actor="${actor.id}"
     data-token="${tokenId}"
     data-roll="${result}"
     data-testtarget="${targetValue}"
     data-critical="${crit.success}"
     data-hasskill="${hasSkill}"
     data-weapon="${spell.id}"
     data-damagetype="${damageType}"
     data-location=""
     data-hit-location-mode="${hitLocationMode}"
     data-fixed-hit-location="${fixedHitLocation}"
     data-location-profile="${hitProfileKey}"
     data-talents='${JSON.stringify(selectedTalents)}'
     data-overcast="${overcast}"
     data-overcast-used="0">

  <h3>
  ${actor.name}
  ${game.i18n.localize("SDP.CastSpell")}
  ${spell.name}
</h3>

  <button class="edit-attack">${game.i18n.localize("SDP.Edit")}</button>

  <p><strong>${game.i18n.localize("SDP.MagicType")}:</strong> ${game.i18n.localize(
  CONFIG.SDP.magicTypes?.[magicType] || "SDP.MagicMinor"
)}</p>
  <p><strong>${game.i18n.localize("SDP.Used")}:</strong> ${bestSkill ? skillName : game.i18n.localize("SDP.Intelligence")} (${bestSkill ? skillValue : INT})</p>

  <p class="spell-target"><strong>${game.i18n.localize("SDP.Target")}:</strong> ${targetValue}</p>
<p class="spell-roll"><strong>${game.i18n.localize("SDP.Roll")}:</strong> ${result}</p>
<p class="spell-sl">
  <strong>${game.i18n.localize("SDP.SuccessLevel")}:</strong> ${SdpRoll.formatSL(SL, success)} (${SdpRoll.getSLLabel(SL, success)})
</p>

 <div class="crit-block">
  ${critText}
</div>
  ${magicConsequence ? `
  <p><strong>${game.i18n.localize("SDP.MagicalConsequence")}:</strong> ${game.i18n.localize(
  `SDP.MagicSeverity.${String(magicConsequence).charAt(0).toUpperCase()}${String(magicConsequence).slice(1)}`
)}</p>
` : ""}
${talentsHTML}
<p class="spell-result"><strong>${success
  ? game.i18n.localize("SDP.Success")
  : game.i18n.localize("SDP.Failure")}</strong></p>

<p><strong>${game.i18n.localize("SDP.ManaCost")}:</strong> ${manaCost}</p>

${concentration ? `<p><strong>${game.i18n.localize("SDP.Concentration")}</strong></p>` : ""}
${concentration && maintainRangeLabel ? `<p><strong>${game.i18n.localize("SDP.MaintainRange")}:</strong> ${maintainRangeLabel}</p>` : ""}

<hr>

${overcast > 0 ? `
<p class="spell-overcast">
  <strong>${game.i18n.localize("SDP.Overcast")}:</strong> ${overcast}
</p>

<div class="spell-overcast-controls">
<button class="reset-overcast">
  ${game.i18n.localize("SDP.ResetOvercast")}
</button>

  ${specialEffects.map((e, i) => {

  const start = SdpSpell.resolveFormula(e.start ?? 0, actor);
  const increment = SdpSpell.resolveFormula(e.value, actor);

  return `
    <p class="spell-special overcast-click"
       data-type="special"
       data-index="${i}"
       data-start="${start}"
       data-base="${increment}"
       data-value="${start}">
       
      <strong>${e.label}:</strong>
      <span class="value">${start}</span>
      
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
   <strong>${game.i18n.localize("SDP.Range")}:</strong>
   <span class="value">${range}</span> m
</p> ` : ""}

${duration > 0 ? `
${!concentration ? `
<p class="spell-duration overcast-click" data-type="duration"
   data-base="${duration}"
   data-value="${duration}"
   data-unit="${durationType}">
   <strong>${game.i18n.localize("SDP.Duration")}:</strong>
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
   <strong>${game.i18n.localize("SDP.Radius")}:</strong>
<span class="value">${radius}</span>
<button class="place-aoe">📍</button>
</p>` : "")
  : (targets > 0 ? `
    <p class="spell-target-count${lockTargets ? "" : " overcast-click"}"
       ${lockTargets ? "" : `data-type="target"`}
       data-base="${targets}"
       data-value="${targets}">
       <strong>${isProjectile ? game.i18n.localize("SDP.Projectiles") : game.i18n.localize("SDP.Targets")}:</strong>
<span class="value">${targets}</span>${lockTargets ? ` <em>(${game.i18n.localize("SDP.Fixed")})</em>` : ""}
    </p>` : "")
}

${hasSpecialOvercast ? `
<p>
  <strong>${game.i18n.localize("SDP.SpecialOvercast")}:</strong>
  ${game.i18n.localize("SDP.Yes")}
</p>
` : ""}

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