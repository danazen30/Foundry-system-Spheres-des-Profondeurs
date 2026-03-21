import { SdpActor } from "./actors/actor.js";
import { SdpActorSheet } from "./actors/actor-sheet.js";

import { SdpItemSheet } from "./items/item-sheet.js";
import { SdpWeaponSheet } from "./items/weapon-sheet.js";
import { SdpTalentSheet } from "./items/talent-sheet.js";
import { SdpArmorSheet } from "./items/armor-sheet.js";
import { SdpInjurySheet } from "./items/injury-sheet.js";
import { SdpSkillSheet } from "./items/skill-sheet.js";
import { SdpItem } from "./items/item.js";

import { SdpRoll } from "./rolls/roll.js";
import { SdpDamage } from "./combat/damage.js";

import { SDP } from "./system/config.js";
import { SdpConditionEngine } from "./system/condition-engine.js";
import { SdpTurnEngine } from "./system/turn-engine.js";


/* ========================================= */
/* INIT                                      */
/* ========================================= */

Hooks.once("init", () => {

  console.log("SDP | Initializing Spheres of the Depths system");

  CONFIG.SDP = SDP;

  CONFIG.Actor.documentClass = SdpActor;
  CONFIG.Item.documentClass = SdpItem;


Actors.unregisterSheet("core", ActorSheet);

Actors.registerSheet("sdp", SdpActorSheet, {
  types: ["character"],
  makeDefault: true
});

  Items.unregisterSheet("core", ItemSheet);

  Items.registerSheet("sdp", SdpWeaponSheet, {
    types: ["weapon"],
    makeDefault: true
  });

  Items.registerSheet("sdp", SdpTalentSheet, {
    types: ["talent"],
    makeDefault: true
  });

  Items.registerSheet("sdp", SdpArmorSheet, {
    types: ["armor"],
    makeDefault: true
  });

  Items.registerSheet("sdp", SdpInjurySheet, {
  types: ["injury"],
  makeDefault: true
});

Items.registerSheet("sdp", SdpSkillSheet, {
    types: ["skill"],
    makeDefault: true
  });

  Hooks.on("createActor", async (actor) => {

  if(actor.system.conditions) return;

  await actor.update({
    "system.conditions": {
      stunned:0,
      bleeding:0,
      burning:0,
      poisoned:0,
      exhausted:0,
      deafened: 0,
      slowed: 0,
      entangled:0,
      staggered:0,
      shaken:0,
      frightened:0,
      prone:0,
      unconscious:0,
      dying:0,
      surprised:0
    }
  });

});

});


/* ========================================= */
/* CHAT OPPOSITION SYSTEM                    */
/* ========================================= */

Hooks.on("renderChatMessage", (message, html) => {

  html[0].querySelectorAll(".sdp-attack button").forEach(btn => {

    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

  });

  html.find(".sdp-opposed").click(ev => {

    const card = ev.currentTarget.closest(".sdp-roll");

    const sl = Number(card.dataset.sl);
    const actor = card.dataset.actor;

    game.sdp = game.sdp || {};

    if(!game.sdp.opposed){

      game.sdp.opposed = {
        SL: sl,
        actor: actor,
        messageId: message.id
      };

      ui.notifications.info(`${actor}'s roll is now the opposed reference`);
      return;

    }

    const base = game.sdp.opposed;

    let resultText;

    if(sl > base.SL){
      resultText = `${actor} wins`;
    }else if(sl < base.SL){
      resultText = `${base.actor} wins`;
    }else{
      resultText = "Draw";
    }

    ChatMessage.create({
      content: `
      <h3>Opposed Test</h3>
      <p>${base.actor} SL: ${base.SL}</p>
      <p>${actor} SL: ${sl}</p>
      <strong>${resultText}</strong>
      `
    });

  });


  html.find(".sdp-stop-opposed").click(ev => {

    if(!game.sdp?.opposed){
      ui.notifications.warn("No opposition active");
      return;
    }

    game.sdp.opposed = null;

    ui.notifications.info("Opposition cleared");

  });


 //================
 // SELECT TARGET
 //================

  html.find(".sdp-attack .select-target").click(async ev => {

    const targets = Array.from(game.user.targets);

    if(targets.length === 0){
      ui.notifications.warn("Please target a token first");
      return;
    }

    const card = ev.currentTarget.closest(".sdp-attack");

    const attackScore = Number(card.dataset.attack);
    const actorId = card.dataset.actor;
    const weaponId = card.dataset.weapon;
    const critical = card.dataset.critical;
    const location = card.dataset.location;

    const targetId = targets[0].id;

    const message = game.messages.get(
      ev.currentTarget.closest(".message").dataset.messageId
    );

    const actor = game.actors.get(actorId);
    const token = canvas.tokens.get(targetId);

    const newHtml = `
    <div class="sdp-attack"
     data-attack="${attackScore}"
     data-critical="${critical}"
     data-location="${location}"
     data-actor="${actorId}"
     data-weapon="${weaponId}"
     data-target="${targetId}">

      <h3>${actor.name} attack</h3>

      <p>Attack Score: ${attackScore}</p>

      <p>Target: ${token.name}</p>

      <button class="apply-defense">
        Apply Defense
      </button>

    </div>
    `;

    await message.update({
      content: newHtml
    }); 

  });


  //===================
  // APPLY DEFENSE
  //===================

  html.find(".sdp-attack .apply-defense").click(async ev => {

    const card = ev.currentTarget.closest(".sdp-attack");

    const attackScore = Number(card.dataset.attack);
    const targetId = card.dataset.target;
    const actorId = card.dataset.actor;
    const weaponId = card.dataset.weapon;
    const location = card.dataset.location;
    const critical = card.dataset.critical;

    const message = game.messages.get(
      ev.currentTarget.closest(".message").dataset.messageId
    );

    const token = canvas.tokens.get(targetId);
    const target = token.actor;

    const parry = target.system.derived.parry.value;
    const evasion = target.system.derived.evasion.value;

    const defense = Math.max(parry, evasion);

    const result = attackScore > defense ? "HIT" : "MISS";

ChatMessage.create({

  content: `
  <h3>Defense Resolution</h3>

  <p>Target: ${target.name}</p>

  <p>Parry: ${parry}</p>
  <p>Evasion: ${evasion}</p>

  <p><strong>Defense Used: ${defense}</strong></p>

  <p>Attack Score: ${attackScore}</p>

  <p><strong>${result}</strong></p>
  `,

  whisper: ChatMessage.getWhisperRecipients("GM")

});

    const attacker = game.actors.get(actorId);
    const weapon = attacker.items.get(weaponId);

    let damageButton = "";

    if(result === "HIT"){

      damageButton = `
      <button
        class="roll-damage"
        data-actor="${actorId}"
        data-weapon="${weaponId}"
        data-target="${targetId}">
        Roll Damage
      </button>
      `;

    }

    const newHtml = `
 <div class="sdp-attack"
     data-attack="${attackScore}"
     data-critical="${critical}"
     data-actor="${actorId}"
     data-weapon="${weaponId}"
     data-target="${targetId}"
     data-location="${location}">

      <h3>${attacker.name} attacks with ${weapon.name}</h3>

      <p>Attack Score: ${attackScore}</p>

      <p>Location: ${CONFIG.SDP.hitLocations[location]}</p>

      <p><strong>${result}</strong></p>

      ${damageButton}

    </div>
    `;

    await message.update({
      content: newHtml
    }); 

  });


/* =================== */
/* DAMAGE ROLL         */
/* =================== */

html.find(".sdp-attack .roll-damage").click(async ev => {

  const card = ev.currentTarget.closest(".sdp-attack");

  const actorId = card.dataset.actor;
  const weaponId = card.dataset.weapon;
  const targetId = card.dataset.target;
  const location = card.dataset.location;
  const critical = String(card.dataset.critical) === "true";

  const actor = game.actors.get(actorId);
  const weapon = actor.items.get(weaponId);

  let armor = 0;

  if(targetId){
    const token = canvas.tokens.get(targetId);
    if(token){
      armor = SdpDamage.getArmorValue(token.actor, location);
    }
  }

  const SB = actor.system.attributes.strength.bonus;

  let baseWeapon = 0;
  let diceFormula = weapon.system.damageDice || "";
  let baseFormula = weapon.system.damage || "0";

  let useSB = baseFormula.includes("SB");

  baseFormula = baseFormula.replace("SB", "").replace("+", "").trim();

  baseWeapon = Number(baseFormula) || 0;

  if(critical){

    baseWeapon *= 2;

    if(diceFormula){

      const match = diceFormula.match(/(\d+)d(\d+)/);

      if(match){

        const diceCount = Number(match[1]) * 2;
        const diceSize = match[2];

        diceFormula = `${diceCount}d${diceSize}`;

      }

    }

  }

  let formula = "";

  if(useSB){
    formula += `${SB}`;
  }

  if(baseWeapon > 0){
    formula += (formula ? " + " : "") + baseWeapon;
  }

  if(diceFormula){
    formula += (formula ? " + " : "") + diceFormula;
  }

  const roll = await (new Roll(formula)).roll();

  let damage = roll.total;

  if(location === "head"){
    damage = Math.floor(damage * 1.5);
  }

  let finalDamage = Math.max(damage - armor, 0);

  roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `
    <h3>Damage Roll</h3>
    <p>Attacker: ${actor.name}</p>
    <p>Weapon: ${weapon.name}</p>
    <p>Location: ${CONFIG.SDP.hitLocations[location]}</p>
    `
  });

  if(!targetId) return;

  ChatMessage.create({

    content: `
    <h3>Damage Resolution</h3>

    <p>Location: ${CONFIG.SDP.hitLocations[location]}</p>

    <p>Raw Damage: ${damage}</p>
    <p>Armor: ${armor}</p>

    <p>Final Damage: ${finalDamage}</p>

    <button class="apply-damage"
      data-target="${targetId}"
      data-damage="${finalDamage}">
      Apply Damage
    </button>
    `,

    whisper: ChatMessage.getWhisperRecipients("GM")

  });

});


/* ========================= */
/* APPLY DAMAGE              */
/* ========================= */

html.find(".apply-damage").click(async ev => {

  const button = ev.currentTarget;

  const targetId = button.dataset.target;
  const damage = Number(button.dataset.damage);

  const token = canvas.tokens.get(targetId);

  if(!token) return;

  const actor = token.actor;

  const current = actor.system.health.value;

const newHealth = current - damage;

await actor.update({
  "system.health.value": newHealth
});

// =========================
// DEATH CHECK
// =========================

const WT = actor.system.derived.woundThreshold.value;

// mort instantanée
if(newHealth <= -WT){

  await actor.update({
    "system.conditions.dying": false
  });

  ChatMessage.create({

    content: `
    <h3>Instant Death</h3>

    <p>${actor.name} suffers catastrophic wounds.</p>

    <p>Health: ${newHealth}</p>
    <p>Threshold: ${WT}</p>

    <strong>${actor.name} dies instantly.</strong>
    `
  });

}

// =========================
// DYING TRIGGER
// =========================

else if(newHealth < 0){

  await actor.update({
    "system.conditions.dying": true
  });

  ChatMessage.create({

    content: `
    <h3>Dying</h3>

    <p>${actor.name} falls unconscious.</p>

    <p>Health: ${newHealth}</p>
    `
  });

}

  const message = game.messages.get(
    button.closest(".message").dataset.messageId
  );

  const newHtml = `
  <h3>Damage Resolution</h3>

  <p>Target: ${actor.name}</p>

  <p><strong>Health: ${current} - ${damage} = ${newHealth}</strong></p>
  `;

  await message.update({
    content: newHtml
  }); 

});


/* ========================= */
/* STUNNED TEST              */
/* ========================= */

html.find(".stunned-roll").click(async ev => {

  const card = ev.currentTarget.closest(".sdp-stunned-test");

  const actorId = card.dataset.actor;
  const conditionKey = card.dataset.condition;

  const actor = game.actors.get(actorId);

  const stack = actor.system.conditionTotals?.[conditionKey] ?? 0;

  const resistance = actor.items.find(i =>
    i.type === "skill" && i.system.key === "resistance"
  );

  const target = resistance?.system.value ?? actor.system.attributes.toughness.value;

  const roll = await (new Roll("1d100")).roll();

  const result = roll.total;

  const SL = Math.floor(target / 10) - Math.floor(result / 10);

  let removed = 0;

  if(result <= target){
    removed = Math.max(SL,1);
  }

  const newStack = Math.max(stack - removed,0);

  roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `
    <h3>Stunned Test</h3>

    <p>Target: ${target}</p>
    <p>Roll: ${result}</p>
    <p>SL: ${SL}</p>

    <p><strong>Stacks removed: ${removed}</strong></p>
    ${newStack === 0 ? "<p><strong>Exhausted gained</strong></p>" : ""}
    `
  });
const effect = actor._getConditionEffects(conditionKey);
const newBase = newStack - effect;
  await actor.update({
  [`system.conditions.${conditionKey}`]: newBase
});

// =========================
// APPLY EXHAUSTED IF RECOVERED
// =========================

if(newStack === 0){

  await actor.update({
  "system.conditions.exhausted":
    (actor.system.conditions.exhausted || 0) + 1,
  "system.conditionOverride.-=exhausted": null
});

}

});


/* ========================= */
/* POISON TEST               */
/* ========================= */

html.find(".poison-roll").click(async ev => {

  const button = ev.currentTarget;

  if(button.dataset.used) return;
  button.dataset.used = true;

  const card = button.closest(".sdp-poison-test");

  const actorId = card.dataset.actor;
  const conditionKey = card.dataset.condition;

  const actor = game.actors.get(actorId);

  // ✅ BASE + EFFECT
  const base = actor.system.conditions?.[conditionKey] ?? 0;
  const effect = actor._getConditionEffects(conditionKey);
  const total = base + effect;

  if(total <= 0) return;

  const resistance = actor.items.find(i =>
    i.type === "skill" && i.system.key === "resistance"
  );

  const target = resistance?.system.value ?? actor.system.attributes.toughness.value;

  const roll = await (new Roll("1d100")).roll();

  const result = roll.total;

  const SL = Math.floor(target / 10) - Math.floor(result / 10);

  let removed = 0;

  if(result <= target){
    removed = Math.max(SL,1);
  }

  // ✅ recalcul propre
  const newTotal = Math.max(total - removed, 0);
  const newBase = Math.max(newTotal - effect, 0);

  roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `
    <h3>Poison Test</h3>
    <p>Target: ${target}</p>
    <p>Roll: ${result}</p>
    <p>SL: ${SL}</p>
    <p><strong>Stacks removed: ${removed}</strong></p>
    ${newTotal === 0 ? "<p><strong>Exhausted gained</strong></p>" : ""}
    `
  });

  await actor.update({
    [`system.conditions.${conditionKey}`]: newBase
  });

  if(newTotal === 0){
    await actor.update({
      "system.conditions.exhausted":
        (actor.system.conditions.exhausted || 0) + 1
    });
  }

});

html.find(".calm-roll").click(async ev => {

 const card = ev.currentTarget.closest(".sdp-calm-test");

const actorId = card.dataset.actor;

const actor = game.actors.get(actorId);

const calmSkill = actor.items.find(i =>
  i.type === "skill" && i.system.key === "calm"
);

const target = calmSkill?.system.value ?? actor.system.attributes.willpower.value;

const roll = await new Roll("1d100").roll();

const result = roll.total;

const rollTen = Math.floor(result / 10);
const targetTen = Math.floor(target / 10);

const SL = targetTen - rollTen;

const success = result <= target;

let consequenceText = "";

if(success){

  await actor.update({
    "system.conditions.frightened": false,
    "system.conditions.shaken": true
  });

  consequenceText = `
  <p><strong>Frightened removed</strong></p>
  <p>Shaken applied</p>
  `;

}else{

  consequenceText = `<p>Frightened remains</p>`;

}

await roll.toMessage({

  speaker: ChatMessage.getSpeaker({actor}),

  flavor: `
  <h3>Calm Test</h3>

  <p>Target: ${target}</p>
  <p>Roll: ${result}</p>
  <p>SL: ${SL}</p>

  <p><strong>${success ? "SUCCESS" : "FAILURE"}</strong></p>

  ${consequenceText}
  `

});

});

/* ========================= */
/* ENTANGLED TEST            */
/* ========================= */

html.find(".strength-roll").click(async ev => {

  const card = ev.currentTarget.closest(".sdp-strength-test");

  const actorId = card.dataset.actor;

  const actor = game.actors.get(actorId);

  const target = actor.system.attributes.strength.value;

  const roll = await new Roll("1d100").roll();

  const result = roll.total;

  const SL =
    Math.floor(target / 10) -
    Math.floor(result / 10);

  let success = result <= target;

  let consequenceText = "";

  if(success){

    let slowed = actor.system.conditions.slowed ?? 0;

    let removed = Math.min(slowed, SL);

    if(removed > 0){

      await actor.update({
        "system.conditions.slowed": slowed - removed
      });

    }

    await actor.update({
      "system.conditions.entangled": false
    });

    consequenceText = `
    <p><strong>Entangled removed</strong></p>
    <p>Slowed removed: ${removed}</p>
    `;

  }else{

    consequenceText = `<p>Still entangled</p>`;

  }

  await roll.toMessage({

    speaker: ChatMessage.getSpeaker({actor}),

    flavor: `
    <h3>Strength Test</h3>

    <p>Target: ${target}</p>
    <p>Roll: ${result}</p>
    <p>SL: ${SL}</p>

    <p><strong>${success ? "SUCCESS" : "FAILURE"}</strong></p>

    ${consequenceText}
    `

  });

});

/* ========================= */
/* DYING TEST                */
/* ========================= */

html.find(".dying-roll").click(async ev => {

  const card = ev.currentTarget.closest(".sdp-dying-test");

  const actor = game.actors.get(card.dataset.actor);

  const resistance = actor.items.find(i =>
    i.type === "skill" && i.system.key === "resistance"
  );

  const target =
    resistance?.system.value ??
    actor.system.attributes.toughness.value;

  const roll = await new Roll("1d100").roll();

  const result = roll.total;

  const success = result <= target;

  let hpLossText = "";

  if(!success){

    const newHP = actor.system.health.value - 1;

    await actor.update({
      "system.health.value": newHP
    });

    hpLossText = `<p>Lose 1 Health</p>`;

  }

  // =========================
  // DEATH CHANCE (BLEEDING + POISON)
  // =========================

  const bleeding = actor.system.conditions.bleeding ?? 0;
  const poisoned = actor.system.conditions.poisoned ?? 0;

  const stacks = bleeding + poisoned;

  let deathText = "";

  if(stacks > 0){

    const deathChance = stacks * 10;

    const deathRoll = await new Roll("1d100").roll();

    if(deathRoll.total <= deathChance){

      deathText = `
      <p><strong>Death Check</strong></p>
      <p>Chance: ${deathChance}%</p>
      <p>Roll: ${deathRoll.total}</p>
      <p><strong>${actor.name} dies in agony.</strong></p>
      `;

    }else{

      deathText = `
      <p>Death Check: ${deathChance}%</p>
      <p>Roll: ${deathRoll.total}</p>
      <p>Survived</p>
      `;

    }

  }

  await roll.toMessage({

    speaker: ChatMessage.getSpeaker({actor}),

    flavor: `
    <h3>Dying Test</h3>

    <p>Target: ${target}</p>
    <p>Roll: ${result}</p>

    <p><strong>${success ? "SUCCESS" : "FAILURE"}</strong></p>

    ${hpLossText}

    ${deathText}
    `

  });



// =========================
// WOUND THRESHOLD DEATH
// =========================

const threshold = actor.system.derived.woundThreshold.value;

if(Math.abs(actor.system.health.value) > threshold){

  await ChatMessage.create({

    content: `
    <h3>Death</h3>

    <p>${actor.name} dies from their wounds.</p>
    `
  });

}

});

});


/* ========================================= */
/* READY                                     */
/* ========================================= */

Hooks.once("ready", () => {

  game.sdp = game.sdp || {};
  game.sdp.conditions = SdpConditionEngine;
  game.sdp.turn = SdpTurnEngine;

});


Hooks.on("updateCombat", async (combat, changed) => {

  if(!("turn" in changed)) return;

  // =========================
  // IGNORE COMBAT START
  // =========================

  if(combat.round === 0) return;

  // ignore first activation of combat
  if(combat.round === 1 && combat.turn === 0 && changed.turn === 0) return;

  const newTurn = combat.turn;

  const previousTurn =
    newTurn === 0
      ? combat.turns.length - 1
      : newTurn - 1;

  const previousCombatant = combat.turns[previousTurn];
  const currentCombatant = combat.turns[newTurn];

  if(previousCombatant?.actor){
    await game.sdp.turn.endTurn(previousCombatant.actor);
  }

  if(currentCombatant?.actor){
    await game.sdp.turn.startTurn(currentCombatant.actor);
  }

});

Hooks.on("updateActor", (actor, changed, options) => {
  // 🔥 TEMPORAIRE : désactivé pour debug
});