import { SimpleDialog } from "../apps/simple-dialog.js";
import { SdpRoll } from "../rolls/roll.js";
import { WEAPON_TRAITS } from "../system/config.js";


export function registerEditHandlers(html, message) {

  // =========================
  // EDIT ROLL
  // =========================

  html.find(".edit-roll").click(async ev => {

    const card = ev.currentTarget.closest(".sdp-roll");

    const currentTarget = Number(card.dataset.target);
    const currentRoll = Number(card.dataset.roll);

    new SimpleDialog({

      title: "Edit Roll",

      content: `
        <label>Target</label>
        <input type="number" name="target" value="${currentTarget}"/>

        <label>Roll</label>
        <input type="number" name="roll" value="${currentRoll}"/>
      `,

      buttons: {
        apply: {
          label: "Apply",
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

const success = newRoll <= newTarget;

const crit = SdpRoll.getCritical(newRoll);

// 🔥 FIX -0
if (!success && SL === 0) {
  SL = -1;
}

let critText = "";

if (crit.success){
  critText = `<p style="color:green"><strong>CRITICAL SUCCESS</strong></p>`;
}

if (crit.failure){
  critText = `<p style="color:red"><strong>CRITICAL FAILURE</strong></p>`;
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

  <button class="edit-roll">Edit</button>

  <p>Target: ${newTarget} (${oldTarget})</p>
  <p>Roll: ${newRoll} (${oldRoll})</p>
  <p>SL: ${SL} (${game.sdp.Roll.getSLLabel(SL)})</p>

  <p><strong>${success ? "SUCCESS" : "FAILURE"}</strong></p>

${critText}

  <button class="sdp-opposed">Oppose</button>
  <button class="sdp-stop-opposed">Stop Oppose</button>

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

      title: "Edit Attack",

      content: `
      ${(card.dataset.type === "ranged" || card.dataset.type === "spell") ? `
        <label>Target</label>
        <input type="number" name="target" value="${card.dataset.testtarget || 0}"/>
      ` : ""}

      <label>Roll</label>
      <input type="number" name="roll" value="${roll}"/>
      `,

      buttons: {
        apply: {
          label: "Apply",
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

let SL =
  Math.floor(target / 10) -
  Math.floor(newRoll / 10);

const success = newRoll <= target;

if (!success && SL === 0) {
  SL = -1;
}

// 🔥 APPLY SUCCESS BONUS
const selectedTalents = JSON.parse(card.dataset.talents || "[]");

SL = game.sdp.Roll.applySuccessBonus(SL, actor, selectedTalents);

const overcast = game.sdp.Roll.getOvercast(SL);

const spell = actor.items.get(card.dataset.weapon);
if (!spell) return;

const hasSkill = card.dataset.hasskill === "true";

const crit = {
  success: newRoll >= 1 && newRoll <= 5,
  failure: hasSkill
    ? newRoll >= 96
    : newRoll >= 81
};

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
  targetEl.innerHTML = `<strong>Target:</strong> ${target}`;
}

const rollEl = card.querySelector(".spell-roll");
if (rollEl){
  rollEl.innerHTML = `<strong>Roll:</strong> ${newRoll}`;
}

const slEl = card.querySelector(".spell-sl");
if (slEl){
  slEl.innerHTML =
    `<strong>SL:</strong> ${SL} (${game.sdp.Roll.getSLLabel(SL)})`;
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
      ? `<strong>Overcast:</strong> ${overcast}`
      : "";
}

const resultEl = card.querySelector(".spell-result");
if (resultEl){
  resultEl.innerHTML = `<strong>${success ? "SUCCESS" : "FAILURE"}</strong>`;
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
  consequenceEl.innerHTML =
    `<strong>Magical Consequence:</strong> ${magicConsequence.toUpperCase()}`;
} else {
  consequenceEl.innerHTML = "";
}

if (crit.success){
  critBlock.innerHTML = `
    <p>
      <strong class="spell-crit-success clickable">
        CRITICAL SUCCESS
      </strong>
    </p>`;
}

else if (crit.failure){
  critBlock.innerHTML = `
    <p>
      <strong class="spell-crit-failure clickable"
        data-severity="${magicConsequence || "minor"}">
        CRITICAL FAILURE
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

const success = newRoll <= finalTarget;

let SL =
  Math.floor(finalTarget / 10) -
  Math.floor(newRoll / 10);

if (!success && SL === 0) {
  SL = -1;
}

// 🔥 APPLY SUCCESS BONUS
const selectedTalents = JSON.parse(card.dataset.talents || "[]");

SL = game.sdp.Roll.applySuccessBonus(SL, actor, selectedTalents);

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

let crit = {
  success: newRoll >= 1 && newRoll <= 5,
  failure: newRoll >= critFailMin && newRoll <= 100
};

let critText = "";
              if(crit.success){
                critText = `<p><strong>CRITICAL SUCCESS</strong></p>`;
              }
              if(crit.failure){
                critText = `<p><strong>CRITICAL FAILURE</strong></p>`;
              }

const item = actor.items.get(card.dataset.weapon);
const itemTraits = item.system.itemTraits || [];

if (crit.failure && itemTraits.some(t => t.key === "flawed")) {

  await item.update({
    "system.durability.value": 0
  });

  critText += `<p><strong>${item.name} breaks due to its fragility!</strong></p>`;
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
                  Roll Damage
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
     data-critical="${crit.success}"
     data-brutal="${card.dataset.brutal}"
     data-traits='${JSON.stringify(traits)}'>

  <h3>${actor.name} shoots with ${weapon.name}</h3>

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

  <p>Target: ${finalTarget}</p>
  <p>Roll: ${newRoll} (${oldRoll})</p>
  <p>SL: ${SL} (${game.sdp.Roll.getSLLabel(SL)})</p>

  ${critText}

  <p>Hit Location: ${CONFIG.SDP.hitLocations[card.dataset.location]}</p>

  <p><strong>${success ? "HIT" : "MISS"}</strong></p>

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

let crit = {
  success: newRoll >= 1 && newRoll <= 5,
  failure: newRoll >= critFailMin && newRoll <= 100
};

              let critText = "";
              if(crit.success){
                critText = `<p><strong>CRITICAL SUCCESS</strong></p>`;
              }
              if(crit.failure){
                critText = `<p><strong>CRITICAL FAILURE</strong></p>`;
              }

const item = actor.items.get(card.dataset.weapon);
const itemTraits = item.system.itemTraits || [];

if (crit.failure && itemTraits.some(t => t.key === "flawed")) {

  await item.update({
    "system.durability.value": 0
  });

  critText += `<p><strong>${item.name} breaks due to its fragility!</strong></p>`;
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
     data-target="${card.dataset.target}"
     data-location="${card.dataset.location}"
     data-critical="${crit.success}"
     data-brutal="${card.dataset.brutal}"
     data-traits='${JSON.stringify(traits)}'>

  <h3>${actor.name} attacks with ${weapon.name}</h3>

  <button class="edit-attack">Edit</button>

  ${traitsData.length ? `
  <div class="weapon-traits">
    <strong>Traits:</strong>
    ${traitsData.map(t => `
      <span class="trait-tag"
        data-trait="${t.key}">
        ${t.label}${t.value ? ` (${t.value})` : ""}
      </span>
    `).join("")}
  </div>
` : ""}

  <p>Roll: ${newRoll} (${oldRoll})</p>
  <p>SL: ${SL}</p>
  <p>Attack Score: ${attackScore} (${oldAttack})</p>

  <p>Location: ${CONFIG.SDP.hitLocations[card.dataset.location]}</p>

  ${critText}

  <button class="apply-defense">Apply Defense</button>

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
      ${trait.label}
      ${traitValue ? `(${traitValue})` : ""}
    </h3>

    ${traitValue ? `
      <p><strong>Value:</strong> ${traitValue}</p>
    ` : ""}

    <p>${trait.description}</p>
  </div>
`;

  ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker()
  });

});

}