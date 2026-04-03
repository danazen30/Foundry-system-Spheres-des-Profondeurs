import { SdpAttack } from "../combat/attack.js";

const { ApplicationV2 } = foundry.applications.api;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class SdpRollApp extends HandlebarsApplicationMixin(ApplicationV2) {

  constructor({ actor, type, label, target, weapon }) {
    super();

    this.actor = actor;
    this.type = type;
    this.label = label;
    this.target = target;
    this.weapon = weapon;

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
      height: 500
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

    return {
      actor: this.actor,
      label: this.label,
      target: this.target,
      isAttack: this.type === "attack",
      talents,
      effects: this.actor.effects.contents,
      conditionMod,
      conditionDetails,
      inspirationDice: this.signEffects.inspirationDice,
      inspirationResult: this.inspirationResult
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const root = this.element;

    // =========================
    // INSPIRATION
    // =========================

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

  game.sdp.dialogModifiers = {
    totalMod: 0,
    location: this.element.querySelector('[name="location"]')?.value || null,
    brutal: this.element.querySelector('[name="brutal"]')?.checked || false,
    inspiration: this.inspirationResult
  };

  // =========================
  // ATTACK
  // =========================

  if (this.type === "attack" && this.weapon) {

    await SdpAttack.attackTest(
      this.actor,
      this.weapon,
      this.target
    );

  } else {

// =========================
// SKILL TEST (PROPRE)
// =========================

const roll = await new Roll("1d100").roll();
const result = roll.total;

const target = this.target;

// SL
let SL =
  Math.floor(target / 10) -
  Math.floor(result / 10);

// inspiration
SL += this.inspirationResult;

// success
const success = result <= target;

// crit
const crit = game.sdp?.roll?.getCritical
  ? game.sdp.roll.getCritical(result)
  : {
      success: result % 11 === 0 && result <= 55,
      failure: result % 11 === 0 && result >= 66
    };


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

    <p><strong>SL:</strong> ${SL}</p>

    <p>
      <strong>Result:</strong> 
      ${success ? "SUCCESS" : "FAILURE"}
    </p>

    ${this.inspirationResult ? `<p>Inspiration: +${this.inspirationResult}</p>` : ""}

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