import { SDP } from "./config.js";

export class SdpTurnEngine {

  // =========================
  // START OF TURN
  // =========================

  static async startTurn(actor){

    console.log("SDP | startTurn", actor.name);

    const conditions = actor.system.conditions;

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

            <h3>${key}</h3>

            <p>${actor.name} suffers ${key} (${stack})</p>

            <button class="stunned-roll">
              Roll Resistance
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

            <h3>Entangled</h3>

            <p>${actor.name} is entangled.</p>

            <button class="strength-roll">
              Roll Strength
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

            <h3>Dying</h3>

            <p>${actor.name} is dying.</p>

            <button class="dying-roll">
              Roll Resistance
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
          <h3>${key}</h3>

          <p>${actor.name} suffers ${damage} damage.</p>

          <p>Health: ${current} → ${newHealth}</p>
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
          flavor: `${key} damage`
        });

      }

    }

  }


  // =========================
  // END OF TURN
  // =========================

  static async endTurn(actor){

    console.log("SDP | endTurn", actor.name);

    const conditions = actor.system.conditions;

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
  [`system.conditionOverride.-=${key}`]: null
});

    await ChatMessage.create({

      speaker: ChatMessage.getSpeaker({actor}),

      content: `
      <h3>${key}</h3>
      <p>${actor.name} is no longer ${key}.</p>
      `
    });

  }

  // STACK condition
  else{

    const remove = config.removePerTurn;

    const newStack = Math.max(stack - remove,0);

    if(newStack !== stack){

      await actor.update({
  [`system.conditions.${key}`]: newStack,
  [`system.conditionOverride.-=${key}`]: null
});

      await ChatMessage.create({

        speaker: ChatMessage.getSpeaker({actor}),

        content: `
        <h3>${key}</h3>
        <p>${actor.name} recovers from ${key}</p>
        <p>Stacks: ${stack} → ${newStack}</p>
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

      <h3>${key}</h3>

      <p>${actor.name} suffers ${key} (${stack})</p>

      <button class="poison-roll">
        Roll Resistance
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
      <h3>${key}</h3>

      <p>${actor.name} loses ${damage} health.</p>

      <p>Health: ${current} → ${newHealth}</p>
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
          flavor: `<h3>${key} damage</h3>`
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
          <h3>Burning Resolution</h3>

          <p>Target: ${actor.name}</p>

          <p>Raw Damage: ${rawDamage}</p>
          <p>Lowest Armor: ${lowestArmor}</p>

          <p><strong>Final Damage: ${finalDamage}</strong></p>

          <p>Health: ${current} → ${newHealth}</p>
          `,

          whisper: ChatMessage.getWhisperRecipients("GM")

        });

      }

    }

  }

}