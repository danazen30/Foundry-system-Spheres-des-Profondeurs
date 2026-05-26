import { SDP } from "./config.js";

export class SdpTurnEngine {

  // =========================
  // START OF TURN
  // =========================

  static async startTurn(actor){

    console.log("SDP | startTurn", actor.name);

    const conditions = actor.system.conditionTotals;

    for(const key in conditions){

      const value = conditions[key];

      if(!value) continue;

      const stack = typeof value === "number" ? value : 1;

      const config = SDP.conditionConfig[key];

      if(!config) continue;

      if(config.trigger !== "startTurn") continue;

      // =========================
      // RESISTANCE TEST
      // =========================

      if(config.test === "resistance"){

        await ChatMessage.create({

          speaker: ChatMessage.getSpeaker({actor}),

          content: `
          <div class="sdp-stunned-test"
               data-actor="${actor.id}"
               data-condition="${key}">

            <h3>${game.i18n.localize(config.label)}</h3>

<p>${game.i18n.format("SDP.ChatConditionSuffers", {
  actor: actor.name,
  condition: game.i18n.localize(config.label),
  stack: stack
})}</p>

<button class="stunned-roll">
  ${game.i18n.localize("SDP.RollResistance")}
</button>

          </div>
          `
        });

      }

      // =========================
      // STRENGTH TEST (ENTANGLED)
      // =========================

      if(config.test === "strength"){

        await ChatMessage.create({

          speaker: ChatMessage.getSpeaker({actor}),

          content: `
          <div class="sdp-strength-test"
               data-actor="${actor.id}"
               data-condition="${key}">

            <h3>${game.i18n.localize("SDP.ConditionEntangled")}</h3>

<p>${game.i18n.format("SDP.ChatActorEntangled", {
  actor: actor.name
})}</p>

<button class="strength-roll">
  ${game.i18n.localize("SDP.RollStrength")}
</button>

          </div>
          `
        });

      }

      // =========================
      // DYING TEST
      // =========================

      if(config.test === "dying"){

        await ChatMessage.create({

          speaker: ChatMessage.getSpeaker({actor}),

          content: `
          <div class="sdp-dying-test"
               data-actor="${actor.id}">

            <h3>${game.i18n.localize("SDP.ConditionDying")}</h3>

<p>${game.i18n.format("SDP.ChatActorDying", {
  actor: actor.name
})}</p>

<button class="dying-roll">
  ${game.i18n.localize("SDP.RollResistance")}
</button>

          </div>
          `
        });

      }

      // =========================
      // DAMAGE PER STACK
      // =========================

      if(config.damagePerStack){

        const damage = stack * config.damagePerStack;

        const current = actor.system.health.value;

        const newHealth = current - damage;

        await actor.update({
          "system.health.value": newHealth
        });

        await ChatMessage.create({

          speaker: ChatMessage.getSpeaker({actor}),

          content: `
          <h3>${game.i18n.localize(config.label)}</h3>

<p>${game.i18n.format("SDP.ChatActorSuffersDamage", {
  actor: actor.name,
  damage: damage
})}</p>

<p>${game.i18n.format("SDP.ChatHealthChange", {
  current: current,
  newHealth: newHealth
})}</p>
          `
        });

      }

      // =========================
      // DAMAGE DICE
      // =========================

      if(config.dicePerStack){

        const roll = await new Roll(`${stack}${config.dicePerStack}`).roll();

        const damage = roll.total;

        const current = actor.system.health.value;

        const newHealth = current - damage;

        await actor.update({
          "system.health.value": newHealth
        });

        await roll.toMessage({
          flavor: game.i18n.format("SDP.ChatConditionDamage", {
  condition: game.i18n.localize(config.label)
})
        });

      }

    }

    for (let item of actor.items.filter(i => i.type === "injury")) {

  let duration = item.system.duration;

  if (duration > 0) {

    await item.update({
      "system.duration": duration - 1
    });

    if (duration - 1 === 0) {

      ChatMessage.create({
       content: game.i18n.format("SDP.ChatInjuryEnds", {
  injury: item.name,
  actor: actor.name
})
      });

      await item.delete();

    }

  }

}

  }


  // =========================
  // END OF TURN
  // =========================

  static async endTurn(actor){

    console.log("SDP | endTurn", actor.name);

    const conditions = actor.system.conditionTotals;

    for(const key in conditions){

      const stack = conditions[key];

      if(stack <= 0) continue;

      const config = SDP.conditionConfig[key];

      if(!config) continue;

      if(config.trigger !== "endTurn") continue;

      // =========================
      // REMOVE STACK PER TURN
      // =========================

if(config.removePerTurn){

  // STATE condition
  if(config.type === "state"){

    await actor.update({
  [`system.conditions.${key}`]: false,
});

    await ChatMessage.create({

      speaker: ChatMessage.getSpeaker({actor}),

      content: `
      <h3>${game.i18n.localize(config.label)}</h3>

<p>${game.i18n.format("SDP.ChatNoLongerCondition", {
  actor: actor.name,
  condition: game.i18n.localize(config.label)
})}</p>
      `
    });

  }

  // STACK condition
  else{

    const remove = config.removePerTurn;

    const newStack = Math.max(stack - remove,0);

    if(newStack !== stack){

      await game.sdp.conditions.remove(actor, key, remove);

      await ChatMessage.create({

        speaker: ChatMessage.getSpeaker({actor}),

        content: `
        <h3>${game.i18n.localize(config.label)}</h3>

<p>${game.i18n.format("SDP.ChatRecoverCondition", {
  actor: actor.name,
  condition: game.i18n.localize(config.label)
})}</p>

<p>${game.i18n.format("SDP.ChatStacksChange", {
  old: stack,
  newValue: newStack
})}</p>
        `
      });

    }

  }

}

      // =========================
// RESISTANCE TEST
// =========================

if(config.test === "resistance"){

  await ChatMessage.create({

    speaker: ChatMessage.getSpeaker({actor}),

    content: `
    <div class="sdp-poison-test"
         data-actor="${actor.id}"
         data-condition="${key}"
         data-stack="${stack}">

      <h3>${game.i18n.localize(config.label)}</h3>

<p>${game.i18n.format("SDP.ChatConditionSuffers", {
  actor: actor.name,
  condition: game.i18n.localize(config.label),
  stack: stack
})}</p>

<button class="poison-roll">
  ${game.i18n.localize("SDP.RollResistance")}
</button>

    </div>
    `
  });

}

      // =========================
      // DAMAGE PER STACK
      // =========================

if(config.damagePerStack){

  const isDying = actor.system.conditions?.dying;

  if(isDying && (key === "bleeding" || key === "poisoned")){
    // skip damage but keep other mechanics
  } else {

    const damage = stack * config.damagePerStack;

    const current = actor.system.health.value;

    const newHealth = current - damage;

    await actor.update({
      "system.health.value": newHealth
    });

    await ChatMessage.create({

      speaker: ChatMessage.getSpeaker({actor}),

      content: `
      <h3>${game.i18n.localize(config.label)}</h3>

<p>${game.i18n.format("SDP.ChatActorLosesHealth", {
  actor: actor.name,
  damage: damage
})}</p>

<p>${game.i18n.format("SDP.ChatHealthChange", {
  current: current,
  newHealth: newHealth
})}</p>
      `
    });

  }
}

      // =========================
      // DAMAGE DICE
      // =========================

      if(config.dicePerStack){

        const roll = await new Roll(`${stack}${config.dicePerStack}`).roll();

        await roll.toMessage({
          speaker: ChatMessage.getSpeaker({actor}),
          flavor: `<h3>${game.i18n.format("SDP.ChatConditionDamage", {
  condition: game.i18n.localize(config.label)
})}</h3>`
        });

        const rawDamage = roll.total;

        let lowestArmor = Infinity;

        const armorItems = actor.items.filter(i =>
          i.type === "armor" && i.system.worn?.value === true
        );

        for(const armor of armorItems){

          const AP = armor.system.AP;

          const values = [
            AP.head,
            AP.body,
            AP.leftArm,
            AP.rightArm,
            AP.leftLeg,
            AP.rightLeg
          ];

          const min = Math.min(...values);

          if(min < lowestArmor){
            lowestArmor = min;
          }

        }

        if(!isFinite(lowestArmor)){
          lowestArmor = 0;
        }

        const finalDamage = Math.max(rawDamage - lowestArmor,0);

        const current = actor.system.health.value;

        const newHealth = current - finalDamage;

        await actor.update({
          "system.health.value": newHealth
        });

        await ChatMessage.create({

          content: `
<h3>${game.i18n.localize("SDP.BurningResolution")}</h3>

<p>${game.i18n.format("SDP.TargetLabel", {
  actor: actor.name
})}</p>

<p>${game.i18n.format("SDP.RawDamageLabel", {
  damage: rawDamage
})}</p>

<p>${game.i18n.format("SDP.LowestArmorLabel", {
  armor: lowestArmor
})}</p>

<p>
  <strong>
    ${game.i18n.format("SDP.FinalDamageLabel", {
      damage: finalDamage
    })}
  </strong>
</p>

<p>${game.i18n.format("SDP.ChatHealthChange", {
  current: current,
  newHealth: newHealth
})}</p>
`,

          whisper: ChatMessage.getWhisperRecipients("GM")

        });

      }

    }

  }

}