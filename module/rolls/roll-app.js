import { SdpAttack } from "../combat/attack.js";
import { SdpSpell } from "../combat/spell.js";
import { SdpRoll } from "../rolls/roll.js";

const { ApplicationV2 } = foundry.applications.api;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class SdpRollApp extends HandlebarsApplicationMixin(ApplicationV2) {

  constructor({ actor, type, label, target, weapon, spellData = null }) {
    super();

    this.actor = actor;
    this.type = type;
    this.label = label;
    this.target = target;
    this.weapon = weapon;
    this.spellData = spellData;

    this.inspirationResult = 0;

    this.signEffects = actor.getSignEffects();
  }

  static DEFAULT_OPTIONS = {
  id: "sdp-roll-app",
  window: {
    title: "Roll",
    resizable: true
  },
  position: {
    width: 400,
    height: "auto",
    top: null,
left: null
  }
};

  static PARTS = {
    main: {
      template: "systems/sdp/templates/dialogs/roll-dialog.hbs"
    }
  };

  static LAYOUT = {
    template: "templates/applications/window.hbs",
    parts: ["main"]
  };

async _prepareContext() {

  const talents = this.actor.items.filter(i => i.type === "talent");

  let conditionMod = 0;
  let conditionDetails = [];
  const conditions = this.actor.system.conditionTotals;

  // =========================
  // CONDITIONS (FIX)
  // =========================

  for (const key in conditions) {

    const value = conditions[key];
    if (!value) continue;

    if (key === "deafened") continue;

    const stack = value === true ? 1 : value;
    const config = CONFIG.SDP.conditionConfig?.[key];
    if (!config?.modifier) continue;

    const mod = config.modifier * stack;

    conditionMod += mod;

    conditionDetails.push({
      name: key,
      value: mod
    });
  }

  // =========================
  // MODIFIERS (APRES CALCUL)
  // =========================

  const modifiers = [];
  this._conditionMod = conditionMod;
  // custom / difficulty (placeholder UI)
  modifiers.push({ label: "Custom", value: 0 });
  modifiers.push({ label: "Difficulty", value: 0 });

  // conditions réelles
  for (const c of conditionDetails) {
    modifiers.push({
      label: c.name,
      value: c.value
    });
  }

  // =========================
// WEAPON TRAITS → MODIFIERS
// =========================

if (this.weapon) {

  const weaponTraits = this.weapon.system.traits || [];
  const itemTraits = this.weapon.system.itemTraits || [];

  const allTraits = [...weaponTraits, ...itemTraits];

  for (const t of allTraits) {

    if (!t || !t.key) continue;

    const key = t.key;

    if (key === "precise") {
      modifiers.push({ label: "Precise", value: 10 });
    }

    if (key === "imprecise") {
      modifiers.push({ label: "Imprecise", value: -10 });
    }

    if (key === "practical") {
      modifiers.push({ label: "Practical", value: 10 });
    }

    if (key === "impractical") {
      modifiers.push({ label: "Impractical", value: -10 });
    }

  }
}
  this._modifiers = modifiers;

// 🔥 AJOUT ICI (JUSTE AVANT RETURN)
const isAttribute =
  this.type === "attribute" ||
  (
    this.type !== "attack" &&
    this.type !== "skill" &&
    !this.weapon &&
    !this.spellData
  );

return {
    actor: this.actor,
    label: this.label,
    target: this.target,
    isAttack: this.type === "attack",
    talents,
    effects: this.actor.effects.contents,
    conditionMod,
    conditionDetails,
    modifiers,
    inspirationDice: this.signEffects.inspirationDice,
    inspirationResult: this.inspirationResult,
    spellData: this.spellData,
    type: this.type,
    isAttribute
  };
}

 _onRender(context, options) {
  super._onRender(context, options);

  // 🔥 récup safe DOM (V2)
const root = this.element?.querySelector(".sdp-roll-dialog");
if (!root) return;

setTimeout(() => {
  this.setPosition({ left: null, top: null });
}, 10);

const updatePreview = () => {
  const mod = Number(root.querySelector('[name="customMod"]')?.value || 0);
  const diff = Number(root.querySelector('[name="difficulty"]')?.value || 0);

  let total = mod + diff;

  if (this.weapon) {

  const weaponTraits = this.weapon.system.traits || [];
  const itemTraits = this.weapon.system.itemTraits || [];

  const allTraits = [...weaponTraits, ...itemTraits];

  for (const t of allTraits) {

    const key = t?.key;
    if (!key) continue;

    if (key === "precise") total += 10;
    if (key === "imprecise") total -= 10;
    if (key === "practical") total += 10;
    if (key === "impractical") total -= 10;
  }
}

  const conditions = this.actor.system.conditionTotals || {};

  for (const key in conditions) {
    const value = conditions[key];
    if (!value) continue;

    const stack = value === true ? 1 : value;
    const config = CONFIG.SDP.conditionConfig?.[key];
    if (!config?.modifier) continue;

    total += config.modifier * stack;
  }

  if (this.weapon) {
    for (const t of this.weapon.system.traits || []) {
      const key = (t.key || "").toLowerCase();
      if (key === "unbalanced") total -= 10;
      if (key === "accurate") total += 10;
    }
  }

  const el = root.querySelector('#totalModifier');
  if (el) el.textContent = total;
};

root.addEventListener("input", (ev) => {
  if (ev.target.name === "customMod") updatePreview();
});

root.addEventListener("change", (ev) => {
  if (ev.target.name === "difficulty") updatePreview();
});

// 🔥 CRUCIAL
setTimeout(() => updatePreview(), 0);

root.addEventListener("input", (ev) => {
  if (ev.target.name === "customMod") updatePreview();
});

root.addEventListener("change", (ev) => {
  if (ev.target.name === "difficulty") updatePreview();
});

updatePreview();

    root.querySelector('[data-action="rollInspiration"]')?.addEventListener("click", async () => {

      const dice = this.signEffects.inspirationDice;
      if (!dice) return;

      const roll = new Roll(dice);
      await roll.evaluate();

      this.inspirationResult = roll.total;

      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: `Inspiration (${dice})`
      });

      this.render();
    });

    // =========================
    // MAIN ROLL
    // =========================

    root.querySelector('[data-action="roll"]')?.addEventListener("click", async () => {
      await this._roll();
    });
  }

async _roll() {

  // =========================
  // SAVE MODIFIERS (GLOBAL)
  // =========================

  game.sdp = game.sdp || {};

// =========================
// READ FORM VALUES
// =========================

const root = this.element?.querySelector(".window-content");
if (!root) return;

const modValue = Number(root.querySelector('[name="customMod"]')?.value || 0);
const diffValue = Number(root.querySelector('[name="difficulty"]')?.value || 0);
const attributeOverride = root.querySelector('[name="attributeOverride"]')?.value || null;

// talents
const selectedTalents = Array.from(
  root.querySelectorAll('input[name="talent"]:checked')
).map(el => el.value);

// autres inputs
const location = root.querySelector('[name="location"]')?.value || null;
const brutal = root.querySelector('[name="brutal"]')?.checked || false;
const charge = root.querySelector('[name="charge"]')?.checked || false;
const finesse = root.querySelector('[name="finesse"]')?.checked || false;

// =========================
// SAVE MODIFIERS
// =========================

game.sdp.dialogModifiers = {
  totalMod: modValue + diffValue,

  conditionMod: this.actor.system.conditionTotals
    ? Object.entries(this.actor.system.conditionTotals).reduce((acc, [key, value]) => {
        const config = CONFIG.SDP.conditionConfig?.[key];
        if (!config?.modifier) return acc;

        const stack = value === true ? 1 : value;
        return acc + (config.modifier * stack);
      }, 0)
    : 0,

  location,
  brutal,
  charge,
  finesse,
  talents: selectedTalents,
  inspiration: this.inspirationResult,
  attributeOverride
};

// DEBUG
console.log("=== FINAL MODS ===", game.sdp.dialogModifiers);

  // =========================
  // ATTACK
  // =========================

  if (this.type === "attack" && this.weapon) {

  if (this.weapon.type === "spell") {

    await SdpSpell.cast(
      this.actor,
      this.weapon,
      this.target
    );

  } else {

    await SdpAttack.attackTest(
      this.actor,
      this.weapon,
      this.target
    );

  }

} else {

// =========================
// SKILL TEST (PROPRE)
// =========================

const roll = await new Roll("1d100").roll();
const result = roll.total;

const dialogMods = game.sdp?.dialogModifiers || {};
let baseTarget = this.target || 0;

// =========================
// ATTRIBUTE OVERRIDE (SKILL ONLY)
// =========================

if (this.type === "skill" && dialogMods.attributeOverride) {

  const attr = dialogMods.attributeOverride;

  const attrValue =
    this.actor.system.attributes?.[attr]?.value || 0;

  // 👉 advances = target - caractéristique ORIGINALE
  // MAIS il faut connaître la stat de base utilisée

  const skill = this.actor.items.find(i =>
    i.type === "skill" && i.name === this.label
  );

  let advances = 0;

  if (skill) {
    advances = Number(skill.system.advances || 0);
  }

  baseTarget = attrValue + advances;

  console.log("ATTRIBUTE OVERRIDE FIX", {
    attr,
    attrValue,
    advances,
    final: baseTarget
  });
}

// =========================
// FINAL TARGET
// =========================

const target =
  baseTarget +
  (dialogMods.totalMod || 0) +
  (dialogMods.conditionMod || 0);

let success =
  result <= target ||
  (target <= 0 && result <= 5);

let SL =
  Math.floor(target / 10) -
  Math.floor(result / 10);

// 🔥 APPLY RULE
const adjusted = SdpRoll.applyDynamicResult(result, target, success, SL);
success = adjusted.success;
SL = adjusted.SL;

SL += this.inspirationResult;

// 🔥 APPLY SUCCESS BONUS
SL = game.sdp.Roll.applySuccessBonus(
  SL,
  this.actor,
  game.sdp?.dialogModifiers?.talents || []
);

const crit = SdpRoll.getCritical(result, target);

// 🔥 HARD OVERRIDE
if (result === 100) {
  success = false;
  crit.success = false;
  crit.failure = true;
}

// =========================
// CHAT CARD PROPRE
// =========================

await roll.toMessage({
  speaker: ChatMessage.getSpeaker({ actor: this.actor }),
  content: `
  <div class="sdp-roll"
       data-target="${target}"
       data-roll="${result}"
       data-sl="${SL}"
       data-actor="${this.actor.id}">

    <h3>${this.label}</h3>

    <button class="edit-roll">Edit</button>

    <p><strong>Target:</strong> ${target}</p>
    <p><strong>Roll:</strong> ${result}</p>
    ${this.inspirationResult ? `<p>Inspiration: +${this.inspirationResult}</p>` : ""}
    <p><strong>SL:</strong> ${SL} (${game.sdp.Roll.getSLLabel(SL)})</p>

    <p>
      <strong>Result:</strong> 
      ${success ? "SUCCESS" : "FAILURE"}
    </p>

    ${crit.success ? "<p style='color:green'>CRITICAL SUCCESS</p>" : ""}
    ${crit.failure ? "<p style='color:red'>CRITICAL FAILURE</p>" : ""}

    <button class="sdp-opposed">Oppose</button>
    <button class="sdp-stop-opposed">Stop Oppose</button>

  </div>
  `
});

// =========================
// AUTO OPPOSE
// =========================

if (game.sdp?.opposed) {

  const base = game.sdp.opposed;

  let resultText;
  let finalSL = Math.abs(SL - base.SL);

  if (SL > base.SL) {
    resultText = `${this.actor.name} wins`;
  } else if (SL < base.SL) {
    resultText = `${base.actor} wins`;
  } else {
    resultText = "Draw";
    finalSL = 0;
  }

  await ChatMessage.create({
    content: `
      <h3>Opposed Test</h3>

      <p>${base.actor} SL: ${base.SL}</p>
      <p>${this.actor.name} SL: ${SL}</p>

      <p><strong>Final SL: ${finalSL}</strong></p>

      <strong>${resultText}</strong>
    `
  });

}
  }

  // =========================
  // RESET
  // =========================

  this.inspirationResult = 0;

  this.close();
}

}