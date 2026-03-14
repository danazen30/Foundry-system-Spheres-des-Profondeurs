import { SdpActor } from "./actors/actor.js";
import { SdpActorSheet } from "./actors/actor-sheet.js";

import { SdpItemSheet } from "./items/item-sheet.js";
import { SdpWeaponSheet } from "./items/weapon-sheet.js";
import { SdpTalentSheet } from "./items/talent-sheet.js";
import { SdpArmorSheet } from "./items/armor-sheet.js";
import { SdpItem } from "./items/item.js";
import { SdpConditionSheet } from "./items/condition-sheet.js";

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

  Items.registerSheet("sdp", SdpItemSheet, {
    types: ["skill"],
    makeDefault: true
  });

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

  Items.registerSheet("sdp", SdpConditionSheet, {
    types: ["condition"],
    makeDefault: true
  });

});


/* ========================================= */
/* CHAT OPPOSITION SYSTEM                    */
/* ========================================= */

Hooks.on("renderChatMessage", (message, html) => {

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

  html.find(".select-target").click(async ev => {

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

  html.find(".apply-defense").click(async ev => {

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

html.find(".roll-damage").click(async ev => {

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

  const newHealth = Math.max(current - damage, 0);

  await actor.update({
    "system.health.value": newHealth
  });

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
  const conditionId = card.dataset.condition;

  const actor = game.actors.get(actorId);
  const condition = actor.items.get(conditionId);

  const stack = condition.system.stack || 1;

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
    `
  });

  if(newStack <= 0){

    await actor.deleteEmbeddedDocuments("Item",[condition.id]);

    await game.sdp.conditions.applyCondition(actor,"exhausted",1);

  }
  else{

    await condition.update({
      "system.stack": newStack
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