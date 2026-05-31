import { SimpleDialog } from "../apps/simple-dialog.js";
import { SdpRoll } from "../rolls/roll.js";
import { WEAPON_TRAITS } from "../system/config.js";
import { getHitLocationLabel } from "../combat/hit-location.js";

export function registerEditHandlers(html, message) {

  // =========================
  // EDIT ROLL
  // =========================

  html.find(".edit-roll").click(async ev => {

    const card = ev.currentTarget.closest(".sdp-roll");

    const currentTarget = Number(card.dataset.target);
    const currentRoll = Number(card.dataset.roll);

    new SimpleDialog({

      title: game.i18n.localize("SDP.EditRoll"),

      content: `
        <label>${game.i18n.localize("SDP.Target")}</label>
        <input type="number" name="target" value="${currentTarget}"/>

        <label>${game.i18n.localize("SDP.Roll")}</label>
        <input type="number" name="roll" value="${currentRoll}"/>
      `,

      buttons: {
        apply: {
          label: game.i18n.localize("SDP.Apply"),
          callback: async (app) => {

            const newTarget = Number(
              app.element.querySelector('[name="target"]').value
            );

            const newRoll = Number(
              app.element.querySelector('[name="roll"]').value
            );

            let SL =
  Math.floor(newTarget / 10) -
  Math.floor(newRoll / 10);

let success =
  newRoll <= newTarget ||
  (newTarget <= 5 && newRoll <= 5);

// 🔥 APPLY RULE
const adjusted = SdpRoll.applyDynamicResult(newRoll, newTarget, success, SL);
success = adjusted.success;
SL = adjusted.SL;

const crit = SdpRoll.getCritical(newRoll, newTarget);

// 🔥 HARD OVERRIDE
if (newRoll === 100) {
  success = false;
  crit.success = false;
  crit.failure = true;
}

let critText = "";

if (crit.success){
  critText = `<p style="color:green"><strong>${game.i18n.localize("SDP.CriticalSuccess")}</strong></p>`;
}

if (crit.failure){
  critText = `<p style="color:red"><strong>${game.i18n.localize("SDP.CriticalFailure")}</strong></p>`;
}

            const message = game.messages.get(
              ev.currentTarget.closest(".message").dataset.messageId
            );

            const oldTarget = Number(card.dataset.target);
            const oldRoll = Number(card.dataset.roll);

            const actor = game.actors.get(card.dataset.actor);
            const label = card.querySelector("h3")?.textContent || actor.name;

            const newHtml = `
<div class="sdp-roll"
     data-target="${newTarget}"
     data-roll="${newRoll}"
     data-sl="${SL}"
     data-actor="${card.dataset.actor}">

  <h3>${label}</h3>

  <button class="edit-roll">
  ${game.i18n.localize("SDP.Edit")}
</button>

  <p>
  ${game.i18n.localize("SDP.Target")}:
  ${newTarget} (${oldTarget})
</p>
  <p>
  ${game.i18n.localize("SDP.Roll")}:
  ${newRoll} (${oldRoll})
</p>
  <p>
  ${game.i18n.localize("SDP.SL")}:
  ${SL} (${game.sdp.Roll.getSLLabel(SL)})
</p>

  <p><strong>${success
  ? game.i18n.localize("SDP.Success")
  : game.i18n.localize("SDP.Failure")}</strong></p>

${critText}

  <button class="sdp-opposed">
  ${game.i18n.localize("SDP.Oppose")}
</button>
  <button class="sdp-stop-opposed">
  ${game.i18n.localize("SDP.StopOppose")}
</button>

</div>
`;

            await message.update({ content: newHtml });

          }
        }
      }

    }).render(true);

  });

  // =========================
  // EDIT ATTACK
  // =========================

  html.find(".edit-attack").click(async ev => {

  const card =
    ev.currentTarget.closest(".sdp-attack") ||
    ev.currentTarget.closest(".sdp-spell");

    const oldRoll = Number(card.dataset.roll);
    const oldAttack = Number(card.dataset.attack);

    const roll = Number(card.dataset.roll);

    new SimpleDialog({

      title: game.i18n.localize("SDP.EditAttack"),

      content: `
      ${(card.dataset.type === "ranged" || card.dataset.type === "spell") ? `
        <strong>${game.i18n.localize("SDP.Target")}:</strong>
        <input type="number" name="target" value="${card.dataset.testtarget || 0}"/>
      ` : ""}

      <strong>${game.i18n.localize("SDP.Roll")}:</strong>
      <input type="number" name="roll" value="${roll}"/>
      `,

      buttons: {
        apply: {
          label: game.i18n.localize("SDP.Apply"),
          callback: async (app) => {
            let newHtml = "";

            const type = card.dataset.type;

            const newRoll = Number(
              app.element.querySelector('[name="roll"]').value
            );

            let target;

            if(type === "spell"){

  target = Number(
    app.element.querySelector('[name="target"]').value
  );

  const actor = game.actors.get(card.dataset.actor);
if (!actor) return;

let success =
  newRoll <= target ||
  (target <= 5 && newRoll <= 5);

let SL =
  Math.floor(target / 10) -
  Math.floor(newRoll / 10);

const adjusted = SdpRoll.applyDynamicResult(newRoll, target, success, SL);
success = adjusted.success;
SL = adjusted.SL;


// 🔥 APPLY SUCCESS BONUS
const selectedTalents = JSON.parse(card.dataset.talents || "[]");

SL = game.sdp.Roll.applyTalentSLModifiers(SL, actor, selectedTalents);

const overcast = game.sdp.Roll.getOvercast(SL);

const spell = actor.items.get(card.dataset.weapon);
if (!spell) return;

const hasSkill = card.dataset.hasskill === "true";

const critFailBase = hasSkill ? 96 : 81;

const crit = SdpRoll.getCritical(newRoll, target, {
  critFailBase
});

// 🔥 HARD OVERRIDE
if (newRoll === 100) {
  success = false;
  crit.success = false;
  crit.failure = true;
}
// =========================
// MAGIC CONSEQUENCE
// =========================

let magicConsequence = null;

if (crit.failure){

  let severity = "minor";

  const magicType =
    spell.system.magicType?.value || "minor";

  if (magicType === "advanced"){
    severity = "major";
  }

  if (magicType === "superior"){
    severity = "major";
  }

  const selectedTalents = JSON.parse(card.dataset.talents || "[]");

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

  magicConsequence = severity;
}
  // =========================
  // UPDATE DATASET
  // =========================

  card.dataset.roll = newRoll;
  card.dataset.testtarget = target;
  card.dataset.critical = crit.success;

// =========================
// UPDATE UI (PROPRE)
// =========================

const targetEl = card.querySelector(".spell-target");
if (targetEl){
  targetEl.innerHTML = `<strong>${game.i18n.localize("SDP.Target")}:</strong> ${target}`;
}

const rollEl = card.querySelector(".spell-roll");
if (rollEl){
  rollEl.innerHTML = `<strong>${game.i18n.localize("SDP.Roll")}:</strong> ${newRoll}`;
}

const slEl = card.querySelector(".spell-sl");
if (slEl){
  slEl.innerHTML =
    `<strong>${game.i18n.localize("SDP.SL")}:</strong> ${SL} (${game.sdp.Roll.getSLLabel(SL)})`;
}

let overcastEl = card.querySelector(".spell-overcast");

if (!overcastEl && overcast > 0){
  overcastEl = document.createElement("p");
  overcastEl.classList.add("spell-overcast");
  slEl.after(overcastEl);
}

if (overcastEl){
  overcastEl.innerHTML =
    overcast > 0
      ? `<strong>${game.i18n.localize("SDP.Overcast")}:</strong> ${overcast}`
      : "";
}

const resultEl = card.querySelector(".spell-result");
if (resultEl){
  resultEl.innerHTML = `
<strong>
${success
  ? game.i18n.localize("SDP.Success")
  : game.i18n.localize("SDP.Failure")}
</strong>`;
}

  // =========================
  // CRIT
  // =========================

 let critBlock = card.querySelector(".crit-block");

if(!critBlock){
  critBlock = document.createElement("div");
  critBlock.classList.add("crit-block");
  card.querySelector(".spell-sl").after(critBlock);
}

// =========================
// CONSEQUENCE UI
// =========================

let consequenceEl = card.querySelector(".spell-consequence");

if (!consequenceEl){
  consequenceEl = document.createElement("p");
  consequenceEl.classList.add("spell-consequence");
  critBlock.after(consequenceEl);
}

if (magicConsequence){

  const localizedSeverity =
    game.i18n.localize(
      magicConsequence === "major"
        ? "SDP.MagicConsequenceMajor"
        : "SDP.MagicConsequenceMinor"
    );

  consequenceEl.innerHTML =
    `<strong>${game.i18n.localize("SDP.MagicalConsequence")}:</strong> ${localizedSeverity}`;
} else {
  consequenceEl.innerHTML = "";
}

if (crit.success){
  critBlock.innerHTML = `
    <p>
      <strong class="spell-crit-success clickable">
        ${game.i18n.localize("SDP.CriticalSuccess")}
      </strong>
    </p>`;
}

else if (crit.failure){
  critBlock.innerHTML = `
    <p>
      <strong class="spell-crit-failure clickable"
        data-severity="${magicConsequence || "minor"}">
        ${game.i18n.localize("SDP.CriticalFailure")}
      </strong>
    </p>`;
}

else {
  critBlock.innerHTML = "";
}

const message = game.messages.get(
  ev.currentTarget.closest(".message").dataset.messageId
);

const wrapper = document.createElement("div");
wrapper.appendChild(card.cloneNode(true));

await message.update({
  content: wrapper.innerHTML
});

  return; // 🔥 IMPORTANT → empêche le reste du code
}

            if(type === "ranged"){
              target = Number(
                app.element.querySelector('[name="target"]').value
              );
            } else {
              target = Number(card.dataset.baseattack);
            }

            if(type === "ranged"){

              const actor = game.actors.get(card.dataset.actor);
if (!actor) return;

const rawTraits = JSON.parse(card.dataset.traits || "[]");

const traits = rawTraits.map(t => {
  if (typeof t === "string") {
    return { key: t };
  }
  return t;
});

let fastBonus = 0;

if (traits.some(t => t.key === "fast")) {
  fastBonus = 10;
}

const finalTarget = target + fastBonus;

let success =
  newRoll <= finalTarget ||
  (finalTarget <= 5 && newRoll <= 5);

let SL =
  Math.floor(finalTarget / 10) -
  Math.floor(newRoll / 10);

  const adjusted = SdpRoll.applyDynamicResult(newRoll, finalTarget, success, SL);
success = adjusted.success;
SL = adjusted.SL;


// 🔥 APPLY SUCCESS BONUS
const selectedTalents = JSON.parse(card.dataset.talents || "[]");

SL = game.sdp.Roll.applyTalentSLModifiers(SL, actor, selectedTalents);

              const weapon = actor.items.get(card.dataset.weapon);

              const ammoId = card.dataset.ammo;
const ammo = ammoId ? actor.items.get(ammoId) : null;

console.log("SDP | EDIT Ammo", ammo?.name);

let critFailMin = 96;

if (traits.some(t => t.key === "dangerous")) {
  critFailMin = 86;

  console.log("SDP | DANGEROUS (EDIT RANGED)", {
    critFailMin
  });
}

let critFailBase = 96;

if (traits.some(t => t.key === "dangerous")) {
  critFailBase = 86;
}
const crit = SdpRoll.getCritical(
  newRoll,
  finalTarget,
  {
    critFailBase
  }
);

// 🔥 HARD OVERRIDE
if (newRoll === 100) {
  success = false;
  crit.success = false;
  crit.failure = true;
}

let critText = "";
              if(crit.success){
                critText = `<p><strong>${game.i18n.localize("SDP.CriticalSuccess")}</strong></p>`;
              }
              if (crit.failure) {

  critText = `
    <p><strong>${game.i18n.localize("SDP.CriticalFailure")}</strong></p>

    <button class="roll-critical-failure"
      data-table="critical-attack-failure">
      ${game.i18n.localize("SDP.RollCriticalFailure")}
    </button>
  `;
}

const item = actor.items.get(card.dataset.weapon);
const itemTraits = item.system.itemTraits || [];

if (crit.failure && itemTraits.some(t => t.key === "flawed")) {

  await item.update({
    "system.durability.value": 0
  });

  critText += `<p><strong>${game.i18n.format(
  "SDP.ItemBreaksFragility",
  { item: item.name }
)}</strong></p>`;
}

// =========================
// TRAIT : IMPALING
// =========================

const traitsData = traits
  .filter(t => t)
  .map(t => ({
    key: t.key,
label: CONFIG.SDP.WEAPON_TRAITS?.[t.key]?.label || t.key,
value: t.value
  }));

const isImpaling = traits.some(t => t.key === "impaling");
const isRound = newRoll % 10 === 0;

if (isImpaling && isRound && newRoll <= target) {
  crit.success = true;
}

              let damageButton = "";

              if(success){
                damageButton = `
                <button class="roll-damage"
                  data-actor="${card.dataset.actor}"
                  data-weapon="${card.dataset.weapon}"
                  data-ammo="${ammoId || ""}"
                  data-target="${card.dataset.target}">
                  ${game.i18n.localize("SDP.RollDamage")}
                </button>
                `;
              }

              newHtml = `
<div class="sdp-attack"
     data-ammo="${ammoId || ""}"
     data-type="ranged"
     data-roll="${newRoll}"
     data-testtarget="${target}"
     data-actor="${card.dataset.actor}"
     data-weapon="${card.dataset.weapon}"
     data-target="${card.dataset.target}"
     data-location="${card.dataset.location}"
     data-location-profile="${card.dataset.locationProfile || "humanoid"}"
     data-critical="${crit.success}"
     data-brutal="${card.dataset.brutal}"
     data-traits='${JSON.stringify(traits)}'>

  <h3>
  ${game.i18n.format(
    "SDP.ActorShootsWithWeapon",
    {
      actor: actor.name,
      weapon: weapon.name
    }
  )}
</h3>

  <button class="edit-attack">
  ${game.i18n.localize("SDP.Edit")}
</button>

  ${traitsData.length ? `
  <div class="weapon-traits">
    <strong>${game.i18n.localize("SDP.Traits")}:</strong>
    ${traitsData.map(t => `
      <span class="trait-tag"
  data-trait="${t.key}"
  data-value="${t.value || ""}">
        ${game.i18n.localize(t.label)}${t.value ? ` (${t.value})` : ""}
      </span>
    `).join("")}
  </div>
` : ""}

  <p>
  ${game.i18n.localize("SDP.Target")}:
  ${finalTarget}
</p>

<p>
  ${game.i18n.localize("SDP.Roll")}:
  ${newRoll} (${oldRoll})
</p>

<p>
  ${game.i18n.localize("SDP.SL")}:
  ${SL} (${game.sdp.Roll.getSLLabel(SL)})
</p>

  ${critText}

<p>
${game.i18n.localize("SDP.HitLocation")}:
${getHitLocationLabel(
  card.dataset.locationProfile || "humanoid",
  card.dataset.location
)}
</p>

  <p><strong>${success
  ? game.i18n.localize("SDP.Hit")
  : game.i18n.localize("SDP.Miss")}</strong></p>

  ${damageButton}

</div>
`;

            } else {

              const tens = Math.floor(newRoll / 10);
              const SL = (newRoll === 100) ? 0 : 10 - tens;

              const baseAttack = Number(card.dataset.baseattack);
const meleeBonus = Number(card.dataset.meleebonus || 0);

const rawTraits = JSON.parse(card.dataset.traits || "[]");

const traits = rawTraits.map(t => {
  if (typeof t === "string") {
    return { key: t };
  }
  return t;
});

// =========================
// TRAIT : FAST
// =========================
let fastBonus = 0;

if (traits.some(t => t.key === "fast")) {
  fastBonus = 1;
}

const attackScore = baseAttack + meleeBonus + SL + fastBonus;

const actor = game.actors.get(card.dataset.actor);
const weapon = actor.items.get(card.dataset.weapon);

let critFailMin = 96;

if (traits.some(t => t.key === "dangerous")) {
  critFailMin = 86;

  console.log("SDP | DANGEROUS (EDIT MELEE)", {
    critFailMin
  });
}

const crit = SdpRoll.getCritical(
  newRoll,
  baseAttack * 10,
  {
    critFailBase: critFailMin
  }
);

// 🔥 melee : désactive uniquement les crit success natifs
crit.success = false;

// 🔥 HARD OVERRIDE
if (newRoll === 100) {
  crit.success = false;
  crit.failure = true;
}

              let critText = "";
              if(crit.success){
                critText = `<p><strong>${game.i18n.localize("SDP.CriticalSuccess")}</strong></p>`;
              }
              if (crit.failure) {

  critText = `
    <p><strong>${game.i18n.localize("SDP.CriticalFailure")}</strong></p>

    <button class="roll-critical-failure"
      data-table="critical-attack-failure">
      ${game.i18n.localize("SDP.RollCriticalFailure")}
    </button>
  `;
}

const item = actor.items.get(card.dataset.weapon);
const itemTraits = item.system.itemTraits || [];

if (crit.failure && itemTraits.some(t => t.key === "flawed")) {

  await item.update({
    "system.durability.value": 0
  });

  critText += `<p><strong>${game.i18n.format(
  "SDP.ItemBreaksFragility",
  { item: item.name }
)}</strong></p>`;
}

// =========================
// TRAITS DISPLAY
// =========================
const traitsData = traits.map(t => ({
  key: t.key,
  label: WEAPON_TRAITS?.[t.key]?.label || t.key,
  value: t.value
}));

const isImpaling = traits.some(t => t.key === "impaling");
const isRound = newRoll % 10 === 0;

// ⚠️ IMPORTANT → condition de succès melee
const successCheck = newRoll <= (baseAttack * 10);

if (isImpaling && isRound && successCheck) {
  crit.success = true;
}

              newHtml = `
<div class="sdp-attack"
     data-type="melee"
     data-roll="${newRoll}"
     data-attack="${attackScore}"
     data-baseattack="${baseAttack}"
     data-meleebonus="${meleeBonus}"
     data-actor="${card.dataset.actor}"
     data-weapon="${card.dataset.weapon}"
     data-target=""
     data-location="${card.dataset.location}"
     data-location-profile="${card.dataset.locationProfile || "humanoid"}"
     data-critical="${crit.success}"
     data-brutal="${card.dataset.brutal}"
     data-traits='${JSON.stringify(traits)}'>

 <h3>
${game.i18n.format(
  "SDP.ActorAttacksWithWeapon",
  {
    actor: actor.name,
    weapon: weapon.name
  }
)}
</h3>

  <button class="edit-attack">
  ${game.i18n.localize("SDP.Edit")}
</button>

  ${traitsData.length ? `
  <div class="weapon-traits">
    <strong>${game.i18n.localize("SDP.Traits")}:</strong>
    ${traitsData.map(t => `
      <span class="trait-tag"
        data-trait="${t.key}">
        ${game.i18n.localize(t.label)}${t.value ? ` (${t.value})` : ""}
      </span>
    `).join("")}
  </div>
` : ""}

  <p>
  ${game.i18n.localize("SDP.Roll")}:
  ${newRoll} (${oldRoll})
</p>

<p>
  ${game.i18n.localize("SDP.SL")}:
  ${SL}
</p>

<p>
  ${game.i18n.localize("SDP.AttackScore")}:
  ${attackScore} (${oldAttack})
</p>

<p>
${game.i18n.localize("SDP.Location")}:
${getHitLocationLabel(
  card.dataset.locationProfile || "humanoid",
  card.dataset.location
)}
</p>

  ${critText}

  <button class="apply-defense">${game.i18n.localize("SDP.ApplyDefense")}</button>

</div>
`;

            }

            const message = game.messages.get(
              ev.currentTarget.closest(".message").dataset.messageId
            );

            await message.update({ content: newHtml });

          }
        }
      }

    }).render(true);

  });

// =========================
// TRAIT CLICK
// =========================

html.on("click", ".trait-tag", async ev => {

  const traitKey = ev.currentTarget.dataset.trait;
const traitValue = ev.currentTarget.dataset.value;

const trait = WEAPON_TRAITS[traitKey];

  if (!trait) {
  console.log("SDP | Trait not found", { traitKey });
  return;
}

  const content = `
  <div class="sdp-trait-card">
    <h3>
  ${game.i18n.localize(trait.label)}
  ${traitValue ? `(${traitValue})` : ""}
</h3>

    ${traitValue ? `
      <p><strong>${game.i18n.localize("SDP.Value")}:</strong> ${traitValue}</p>
    ` : ""}

    <p>${game.i18n.localize(trait.description)}</p>
  </div>
`;

  ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker()
  });

});

}