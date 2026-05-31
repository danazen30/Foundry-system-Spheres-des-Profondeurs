const { ApplicationV2 } = foundry.applications.api;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class LevelUpApp extends HandlebarsApplicationMixin(ApplicationV2) {


  constructor(actor, level) {
  super();
  this.options.window.title =
  game.i18n.localize("SDP.LevelUp");
  this.actor = actor;
  this.level = level;
  this.baseHP = 0;
this.hasRolledBase = false;

  this.signHP = 0;

// 🔥 récup sign dès le début
const sign = actor.getSign();
const levelData = sign?.system.levels?.[level];

this.signDice = levelData?.hp || null;
}

  static DEFAULT_OPTIONS = {
    id: "level-up-app",
    window: {
      title: "Level Up",
      resizable: true
    },
    position: {
      width: 400,
      height: 400
    }
  };

  static PARTS = {
    main: {
      template: "systems/sdp/templates/dialogs/level-up.hbs"
    }
  };

  static LAYOUT = {
    template: "templates/applications/window.hbs",
    parts: ["main"]
  };

  async _prepareContext() {

    const dice = this._getHealthDice(this.level);
const average = Math.floor(this._getDiceMax(dice) / 2);

// 🔥 SIGN
const sign = this.actor.getSign();

console.log("SIGN DEBUG:", sign);
console.log("LEVEL:", this.level);
console.log("LEVELS RAW:", sign?.system.levels);

const levelData = sign?.system.levels?.[this.level];

console.log("LEVEL DATA:", levelData);

let signDice = this.signDice;
let signAverage = null;

if (signDice) {
  const max = Number(signDice.split("d")[1]);
  signAverage = Math.floor(max / 2);
}
console.log("SIGN DICE TEMPLATE:", signDice);
return {
  level: this.level,
  dice,
  average,
  signDice,
  signAverage
};
  }

  _onRender(context, options) {
  super._onRender(context, options);

  const root = this.element;

  root.querySelector('[data-action="roll"]').addEventListener("click", async () => {

  const dice = this._getHealthDice(this.level);

  const roll = new Roll(dice);
  await roll.evaluate();

  this.baseHP = roll.total;
  this.hasRolledBase = true;

  roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    flavor: `${game.i18n.localize("SDP.LevelHP")} (${dice})`
  });

});

  root.querySelector('[data-action="average"]').addEventListener("click", () => {

  const dice = this._getHealthDice(this.level);

  this.baseHP = Math.floor(this._getDiceMax(dice) / 2);
  this.hasRolledBase = true;

});

root.querySelector('[data-action="sign-roll"]')?.addEventListener("click", async () => {

  const roll = new Roll(this.signDice);
  await roll.evaluate();

  this.signHP = roll.total;

  roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    flavor: `${game.i18n.localize("SDP.SignHP")} (${this.signDice})`
  });

});

root.querySelector('[data-action="sign-average"]')?.addEventListener("click", () => {

  const max = Number(this.signDice.split("d")[1]);
  this.signHP = Math.floor(max / 2);

});

root.querySelector('[data-action="confirm"]').addEventListener("click", async () => {
  await this._applyLevel("confirm");
});

}

  _getHealthDice(level) {
    if (level === 0) return "1d4";
    if (level === 1) return "1d4";
    if (level === 2) return "1d6";
    if (level === 3) return "1d8";
    if (level === 4) return "2d4";
    if (level === 5) return "2d6";
    return "1d4";
  }

  _getDiceMax(dice) {
    return Number(dice.split("d")[1]);
  }

async _applyLevel(choice) {

  const actor = game.actors.get(this.actor.id);
  const level = this.level;

  if (choice !== "confirm") return;

  if (!this.hasRolledBase) {
    ui.notifications.warn(
  game.i18n.localize("SDP.ChooseBaseHPFirst")
);
    return;
  }

  if (this.signDice && this.signHP === 0) {
    ui.notifications.warn(
  game.i18n.localize("SDP.ChooseSignHPFirst")
);
    return;
  }

  const baseHP = this.baseHP;
  const signHP = this.signHP || 0;

  console.log("BASE HP:", baseHP);
  console.log("SIGN HP:", signHP);

  const hpGain = baseHP + signHP;

  const updates = {};

  updates["system.health.levelBonus"] =
    (actor.system.health?.levelBonus ?? 0) + hpGain;

  updates["system.details.level"] = level;

  const progression = foundry.utils.deepClone(
    actor.system.details?.levelProgression ?? []
  );

const sign = this.actor.getSign();
const levelData = sign?.system.levels?.[level];

progression.push({
  level,

  hp: hpGain,

  hitDice: this._getHealthDice(level),
  hpRoll: baseHP,

  // 🔥 AJOUT ICI
  damageBonus: levelData?.damageBonus || 0,
  inspirationDice: levelData?.inspirationDice || null

});

  updates["system.details.levelProgression"] = progression;

  console.log("UPDATES:", updates);

  await actor.update(updates);

  console.log("LEVEL APPLIED:", level);
}

}