import { SdpAttack } from "../combat/attack.js";
import { SdpSpell } from "../combat/spell.js";
import { SdpRoll } from "../rolls/roll.js";
import { getActorItemDisplayName } from "../system/item-localization.js";
import { SdpSizeEngine } from "../system/size-engine.js";

const { ApplicationV2 } = foundry.applications.api;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class SdpRollApp extends HandlebarsApplicationMixin(ApplicationV2) {

  constructor({ actor, type, label, target, weapon, spellData = null }) {
    super();

    this.actor = actor;
    this.type = type;
    this.label =
  typeof label === "string" && label.startsWith("SDP.")
    ? game.i18n.localize(label)
    : label;
    console.log("ROLL LABEL", {
  raw: label,
  localized: this.label
});
    this.target = target;
    this.weapon = weapon;
    this.spellData = spellData;

    this.inspirationResult = 0;

    this.signEffects = actor.getSignEffects();
    this.options.window.title =
  game.i18n.localize("SDP.Roll");
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

  const talents = this.actor.items
    .filter(i => i.type === "talent")
    .map(item => ({
      id: item.id,
      name: getActorItemDisplayName(item),
      advances: item.system.advances ?? 0
    }));

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
  modifiers.push({
  label: game.i18n.localize("SDP.Custom"),
  value: 0
});

modifiers.push({
  label: game.i18n.localize("SDP.Difficulty"),
  value: 0
});

  // conditions réelles
  for (const c of conditionDetails) {
    modifiers.push({
      label: c.name,
      value: c.value
    });
  }

  // =========================
// SIZE / RANGE MODIFIERS
// =========================

const targets = Array.from(game.user.targets);
const targetActor = targets[0]?.actor;

// -------------------------
// MELEE SIZE
// -------------------------

if (
  this.type === "attack" &&
  this.weapon &&
  this.weapon.system.category === "melee" &&
  targetActor
) {

  const attackerSize =
  this.actor.system.details?.size?.value ||
  this.actor.system.size ||
  "average";

const defenderSize =
  targetActor.system.details?.size?.value ||
  targetActor.system.size ||
  "average";

const sizeModifier =
  SdpSizeEngine.getAttackModifier(
    attackerSize,
    defenderSize
  );

  if (sizeModifier !== 0) {

    modifiers.push({
      label: game.i18n.localize("SDP.Size"),
      value: sizeModifier
    });

  }

}

// -------------------------
// RANGED SIZE
// -------------------------

if (
  this.type === "attack" &&
  this.weapon &&
  this.weapon.system.category === "ranged" &&
  targetActor
) {

  const defenderSize =
  targetActor.system.details?.size?.value ||
  targetActor.system.size ||
  "average";

const sizeModifier =
  SdpSizeEngine.getRangedAttackModifier(
    defenderSize
  );

  if (sizeModifier !== 0) {

    modifiers.push({
      label: game.i18n.localize("SDP.TargetSize"),
      value: sizeModifier
    });

  }

}

// -------------------------
// RANGE MODIFIER
// -------------------------

if (
  this.type === "attack" &&
  this.weapon &&
  this.weapon.system.category === "ranged" &&
  targetActor
) {

  const sourceToken =
    this.actor.getActiveTokens()[0];

  const targetToken = targets[0];

  if (sourceToken && targetToken) {

    const path = [
      sourceToken.center,
      targetToken.center
    ];

    const distance =
      canvas.grid.measurePath(path).distance;

    const baseRange =
  Number(this.weapon.system.range || 0);

// =========================
// AMMO RANGE MODIFIER
// =========================

let ammoRangeModifier = 0;

if (this.weapon.system.currentAmmo) {

  const ammo =
    this.actor.items.get(
      this.weapon.system.currentAmmo
    );

  if (ammo) {

    ammoRangeModifier =
      Number(ammo.system.rangeModifier || 0);

  }

}

const finalRange =
  Math.max(
    0,
    baseRange + ammoRangeModifier
  );

    const bands = CONFIG.SDP.rangeBands;

    let rangeModifier = 0;
    let rangeLabel = "";

    if (distance <= finalRange * bands.pointBlank.multiplier) {

      rangeModifier = bands.pointBlank.modifier;
      rangeLabel = bands.pointBlank.label;

    }
    else if (distance <= finalRange * bands.short.multiplier) {

      rangeModifier = bands.short.modifier;
      rangeLabel = bands.short.label;

    }
    else if (distance <= finalRange * bands.normal.multiplier) {

      rangeModifier = bands.normal.modifier;
      rangeLabel = bands.normal.label;

    }
    else if (distance <= finalRange * bands.long.multiplier) {

      rangeModifier = bands.long.modifier;
      rangeLabel = bands.long.label;

    }
    else if (distance <= finalRange * bands.extreme.multiplier) {

      rangeModifier = bands.extreme.modifier;
      rangeLabel = bands.extreme.label;

    }

    modifiers.push({
      label: `${game.i18n.localize("SDP.Range")} (${rangeLabel})`,
      value: rangeModifier
    });

  }

}

// =========================
// WEAPON TRAITS → MODIFIERS
// =========================

if (this.weapon) {

  const weaponTraits = this.weapon.system.traits || [];
  const itemTraits = this.weapon.system.itemTraits || [];

  const allTraits = [...weaponTraits, ...itemTraits];

  // =========================
  // NORMALIZE
  // =========================

  const normalizedTraits = allTraits
    .filter(t => t)
    .map(t => {
      if (typeof t === "string") {
        return { key: t };
      }

      return t;
    });

  // =========================
  // SKILL CHECK
  // =========================

  const weaponSkills = (this.weapon.system.skill || "")
    .split(",")
    .map(s => s.trim().toLowerCase());

  const actorSkills =
    this.actor.items.filter(i => i.type === "skill");

  let bestSkill = null;

  for (const group of weaponSkills) {

    const skill = actorSkills.find(s =>
      (s.system.key || "").toLowerCase() === group ||
      (s.name || "").toLowerCase() === group
    );

    if (!skill) continue;

    if (
      !bestSkill ||
      skill.system.value > bestSkill.system.value
    ) {
      bestSkill = skill;
    }
  }

  const hasValidSkill = !!bestSkill;

  // =========================
  // POSITIVE / NEGATIVE
  // =========================

  const positiveTraitKeys = [
    "precise",
    "practical",
    "fast",
    "accurate"
  ];

  const negativeTraitKeys = [
    "imprecise",
    "impractical",
    "slow",
    "unbalanced"
  ];

  // =========================
  // FINAL ACTIVE TRAITS
  // =========================

  const activeTraits = normalizedTraits.filter(t => {

    if (!t?.key) return false;

    // négatifs toujours actifs
    if (negativeTraitKeys.includes(t.key)) {
      return true;
    }

    // positifs seulement si compétence valide
    if (positiveTraitKeys.includes(t.key)) {
      return hasValidSkill;
    }

    return true;
  });

  // =========================
  // APPLY MODIFIERS
  // =========================

  for (const t of activeTraits) {

    const key = t.key;

    if (key === "precise") {
      modifiers.push({
        label: game.i18n.localize("SDP.Precise"),
        value: 10
      });
    }

    if (key === "imprecise") {
      modifiers.push({
        label: game.i18n.localize("SDP.Imprecise"),
        value: -10
      });
    }

    if (key === "practical") {
      modifiers.push({
        label: game.i18n.localize("SDP.Practical"),
        value: 10
      });
    }

    if (key === "impractical") {
      modifiers.push({
        label: game.i18n.localize("SDP.Impractical"),
        value: -10
      });
    }

    if (key === "fast") {
      modifiers.push({
        label: game.i18n.localize("SDP.Fast"),
        value: 10
      });
    }

    if (key === "slow") {
      modifiers.push({
        label: game.i18n.localize("SDP.Slow"),
        value: -10
      });
    }

    if (key === "accurate") {
      modifiers.push({
        label: game.i18n.localize("SDP.Accurate"),
        value: 10
      });
    }

    if (key === "unbalanced") {
      modifiers.push({
        label: game.i18n.localize("SDP.Unbalanced"),
        value: -10
      });
    }

  }

  console.log("SDP | ACTIVE DIALOG TRAITS", {
    weapon: this.weapon.name,
    hasValidSkill,
    activeTraits
  });


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

const hitProfileKey = "humanoid";

const hitProfile =
  CONFIG.SDP.hitLocationProfiles?.[hitProfileKey];

const hitLocations = Object.entries(
  hitProfile?.locations || {}
).map(([key, data]) => ({

  key,

  label: game.i18n.localize(
    data.label || key
  ),

  modifier:
    data.modifier >= 0
      ? `+${data.modifier}`
      : data.modifier

}));

const hasFinesseTrait =
  this.weapon &&
  (
    this.weapon.system.traits || []
  ).some(t => {

    if (!t) return false;

    if (typeof t === "string") {
      return t.toLowerCase() === "finesse";
    }

    return (t.key || "").toLowerCase() === "finesse";

  });

return {
    actor: this.actor,
    label: this.label,
    hasFinesseTrait,
    target: this.target,
    isAttack: this.type === "attack",
    talents,
    effects: this.actor.effects.contents,
    conditionMod,
    conditionDetails,
    modifiers,
    hitLocations,
    inspirationDice: this.signEffects.inspirationDice,
    inspirationResult: this.inspirationResult,
    spellData: this.spellData,
    type: this.type,
    isAttribute,
    isSpell: !!this.spellData,
    hitProfiles: CONFIG.SDP.hitLocationProfiles,
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

  for (const modifier of this._modifiers || []) {

  if (
    modifier.label === "Custom" ||
    modifier.label === "Difficulty"
  ) continue;

  total += Number(modifier.value || 0);

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

const profileSelect =
  root.querySelector('[name="hitLocationProfile"]');

const locationSelect =
  root.querySelector('[name="location"]');

profileSelect?.addEventListener("change", (ev) => {

  const profileKey = ev.target.value;

  const profile =
    CONFIG.SDP.hitLocationProfiles?.[profileKey];

  if (!profile || !locationSelect) return;

  locationSelect.innerHTML = "";

  const randomOption = document.createElement("option");
  randomOption.value = "";
  randomOption.textContent =
  game.i18n.localize("SDP.Random");

  locationSelect.appendChild(randomOption);

  for (const [key, data] of Object.entries(profile.locations)) {

    const option = document.createElement("option");

    option.value = key;

    option.textContent =
  `${game.i18n.localize(data.label || key)} (${data.modifier})`;

    locationSelect.appendChild(option);
  }

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
        flavor: `${game.i18n.localize("SDP.Inspiration")} (${dice})`
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

const hitLocationProfile =
  root.querySelector('[name="hitLocationProfile"]')?.value
  || "humanoid";

const modValue = Number(root.querySelector('[name="customMod"]')?.value || 0);
const diffValue = Number(root.querySelector('[name="difficulty"]')?.value || 0);
const attributeOverride = root.querySelector('[name="attributeOverride"]')?.value || null;

// talents
const selectedTalents = Array.from(
  root.querySelectorAll('input[name="talent"]:checked')
).map(el => el.value);

// =========================
// TALENT OBJECTS
// =========================

const selectedTalentObjects = selectedTalents
  .map(id => this.actor.items.get(id))
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

// autres inputs
const location = root.querySelector('[name="location"]')?.value || null;
const brutal = root.querySelector('[name="brutal"]')?.checked || false;
const charge = root.querySelector('[name="charge"]')?.checked || false;
const finesse = root.querySelector('[name="finesse"]')?.checked || false;

// =========================
// SAVE MODIFIERS
// =========================

game.sdp.dialogModifiers = {
  dynamicModifiers:
  (this._modifiers || [])
    .filter(m =>
      m.label !== "Custom" &&
      m.label !== "Difficulty"
    ),
  totalMod: modValue + diffValue,
  hitLocationProfile,

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
SL = game.sdp.Roll.applyTalentSLModifiers(
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

    <button class="edit-roll">
  ${game.i18n.localize("SDP.Edit")}
</button>

    <p>
  <strong>${game.i18n.localize("SDP.Target")}:</strong>
  ${target}
</p>
    <p>
  <strong>${game.i18n.localize("SDP.Roll")}:</strong>
  ${result}
</p>
   ${this.inspirationResult ? `
<p>
  ${game.i18n.localize("SDP.Inspiration")}:
  +${this.inspirationResult}
</p>
` : ""}
    <p>
<strong>${game.i18n.localize("SDP.SuccessLevel")}:</strong>
${SL} (${game.sdp.Roll.getSLLabel(SL)})</p>
    ${talentsHTML}

    <p>
      <strong>${game.i18n.localize("SDP.Result")}:</strong>
      ${success
  ? game.i18n.localize("SDP.Success")
  : game.i18n.localize("SDP.Failure")}
    </p>

    ${crit.success ? "<p style='color:green'>CRITICAL SUCCESS</p>" : ""}
    ${crit.failure ? "<p style='color:red'>CRITICAL FAILURE</p>" : ""}

    <button class="sdp-opposed">
  ${game.i18n.localize("SDP.Oppose")}
</button>
    <button class="sdp-stop-opposed">
  ${game.i18n.localize("SDP.StopOppose")}
</button>

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
    resultText =
  `${this.actor.name} ${game.i18n.localize("SDP.Wins")}`;
  } else if (SL < base.SL) {
    resultText =
  `${base.actor} ${game.i18n.localize("SDP.Wins")}`;
  } else {
    resultText =
  game.i18n.localize("SDP.Draw");
    finalSL = 0;
  }

  await ChatMessage.create({
    content: `
      <h3>${game.i18n.localize("SDP.OpposedTest")}</h3>

      <p>${base.actor} SL: ${base.SL}</p>
      <p>${this.actor.name} SL: ${SL}</p>

      <p>
<strong>
${game.i18n.localize("SDP.FinalSL")}:
${finalSL}
</strong>
</p>

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