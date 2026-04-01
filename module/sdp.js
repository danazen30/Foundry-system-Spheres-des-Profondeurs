import { SdpActor } from "./actors/actor.js";
import { SdpActorSheet } from "./actors/actor-sheet.js";

import { registerChatHandlers } from "./chat/chat-handlers.js";

import { SdpItemSheet } from "./items/item-sheet.js";
import { SdpWeaponSheet } from "./items/weapon-sheet.js";
import { SdpTalentSheet } from "./items/talent-sheet.js";
import { SdpArmorSheet } from "./items/armor-sheet.js";
import { SdpInjurySheet } from "./items/injury-sheet.js";
import { SdpSkillSheet } from "./items/skill-sheet.js";
import { SdpCareerSheet } from "./items/career-sheet.js";
import { SdpSpecieSheet } from "./items/specie-sheet.js";
import { SdpItem } from "./items/item.js";

import { SdpRoll } from "./rolls/roll.js";
import { SdpDamage } from "./combat/damage.js";

import { SDP } from "./system/config.js";
import { SdpConditionEngine } from "./system/condition-engine.js";
import { SdpTurnEngine } from "./system/turn-engine.js";

const difficultyMap = {
  light: 0,
  moderate: -10,
  severe: -20,
  critical: -30
};

async function getInjuryFromPack(location, severity, isConsequence = false) {

  const pack = game.packs.get("sdp.injuries");
  if (!pack) return null;

  // 🔥 charge les vrais documents (pas juste index)
  const docs = await pack.getDocuments();

  return docs.find(i =>
    i.system.location === location &&
    i.system.severity === severity &&
    i.system.consequence === isConsequence
  );

}

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

  Items.registerSheet("sdp", SdpSpecieSheet, {
  types: ["specie"],
  makeDefault: true
});

Items.registerSheet("sdp", SdpCareerSheet, {
  types: ["career"],
  makeDefault: true
});

Handlebars.registerHelper("gte", function(a, b) {
  return a >= b;
});

Handlebars.registerHelper("multiply", function(a, b) {
  return a * b;
});

Handlebars.registerHelper("includes", function(value, key) {

  if (!value) return false;

  // si string → split
  if (typeof value === "string") {
    return value.split(",").includes(key);
  }

  // si array
  if (Array.isArray(value)) {
    return value.includes(key);
  }

  return false;
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
    },
    "system.details.experience": {
      total: 0,
      spent: 0,
      log: []
    }
  });

});

});

registerChatHandlers();
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
Hooks.on("createItem", async (item) => {

  if (item.type !== "injury") return;

  const actor = item.parent;
  if (!actor) return;

  // 🔥 récupérer ton paramètre depuis l’item
  const removeOnDelete = item.system.removeOnDelete ?? true;

  for (const effect of item.effects) {

    for (const change of effect.changes) {

      // =========================
      // TON CODE EXISTANT
      // =========================
      if (!change.key?.startsWith("system.custom.conditionEffects")) continue;

      const key = change.key.split(".").pop();
      const value = Number(change.value || 0);

      const current = actor.system.conditions?.[key] ?? 0;

      await actor.update({
        [`system.conditions.${key}`]: current + value
      });

    }

  }

});

Hooks.on("deleteItem", async (item) => {

  if (item.type !== "injury") return;

  const actor = item.parent;
  if (!actor) return;

  for (const effect of item.effects) {

    for (const change of effect.changes) {

      if (!change.key?.startsWith("system.custom.conditionEffects")) continue;

      // 🔥 NOUVEAU : check ici
      if (item.system.removeOnDelete === false) continue;

      const key = change.key.split(".").pop();
      const value = Number(change.value || 0);

      const current = actor.system.conditions?.[key] ?? 0;

      await actor.update({
        [`system.conditions.${key}`]: Math.max(current - value, 0)
      });

    }

  }

});

Hooks.on("updateActor", async (actor, changes) => {

  const cond = changes.system?.conditions;
  if (!cond) return;

  const exhausted = actor.system.conditions?.exhausted ?? 0;
  const TB = actor.system.attributes.toughness.bonus;

  if(exhausted >= TB){
    if(!actor.system.conditions.unconscious){
      await actor.update({
        "system.conditions.unconscious": true,
        "system.conditions.prone": true
      });
    }
  }

  if (cond.dying === true) {
    await actor.update({
      "system.conditions.unconscious": true,
      "system.conditions.prone": true
    });
  }

  if (cond.unconscious === true) {
    await actor.update({
      "system.conditions.prone": true
    });
  }

});