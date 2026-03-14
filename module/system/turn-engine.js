import { SDP } from "./config.js";
export class SdpTurnEngine {

  // =========================
  // START OF TURN
  // =========================

  static async startTurn(actor){

console.log("SDP | startTurn", actor.name);



    const conditions = actor.items.filter(i => i.type === "condition");

    const handled = new Set();

for(const condition of conditions){

  const key = condition.system.key;

  const config = SDP.conditionConfig[key];

  if(!config) continue;

  if(config.trigger !== "startTurn") continue;

  const stack = condition.system.stack || 1;

  if(config.damagePerStack){

    const damage = stack * config.damagePerStack;

    const current = actor.system.health.value;

    const newHealth = Math.max(current - damage,0);

    await actor.update({
      "system.health.value": newHealth
    });

    ChatMessage.create({
      content: `
      <h3>${condition.name}</h3>
      <p>${actor.name} suffers ${damage} damage.</p>
      `
    });

  }

  if(config.dicePerStack){

    const roll = await new Roll(`${stack}${config.dicePerStack}`).roll();

    const damage = roll.total;

    const current = actor.system.health.value;

    const newHealth = Math.max(current - damage,0);

    await actor.update({
      "system.health.value": newHealth
    });

    roll.toMessage({
      flavor: `${condition.name} damage`
    });

  }

}

  }

  // =========================
  // END OF TURN
  // =========================

  static async endTurn(actor){

    const conditions = actor.items.filter(i => i.type === "condition");

    const handled = new Set();

   for(const condition of conditions){

  const key = condition.system.key;

  const config = SDP.conditionConfig[key];

  if(!config) continue;

  if(config.trigger !== "endTurn") continue;

  if(config.test === "resistance"){

    const stack = condition.system.stack || 1;

    ChatMessage.create({

      speaker: ChatMessage.getSpeaker({actor}),

      content: `
      <div class="sdp-stunned-test"
           data-actor="${actor.id}"
           data-condition="${condition.id}">

        <h3>${condition.name}</h3>

        <p>${actor.name} is stunned (${stack})</p>

        <button class="stunned-roll">
        Roll Resistance
        </button>

      </div>
      `

    });

  }

}

  }

  // =========================
  // BLEEDING
  // =========================

  static async _bleeding(actor, condition){

    const stack = condition.system.stack || 1;

    const damage = stack;

    const current = actor.system.health.value;

    const newHealth = Math.max(current - damage,0);

    await actor.update({
      "system.health.value": newHealth
    });

    ChatMessage.create({
      content: `
      <h3>Bleeding</h3>

      <p>${actor.name} loses ${damage} health.</p>

      <p>Health: ${current} → ${newHealth}</p>
      `
    });

  }

  // =========================
  // BURNING
  // =========================

  static async _burning(actor, condition){

    const stack = condition.system.stack || 1;

    const roll = await (new Roll(`${stack}d6`)).roll();

    const damage = roll.total;

    const current = actor.system.health.value;

    const newHealth = Math.max(current - damage,0);

    await actor.update({
      "system.health.value": newHealth
    });

    roll.toMessage({
      flavor: `${actor.name} suffers burning damage`
    });

  }
// =========================
// STUNNED
// =========================

static async _stunned(actor, condition){

    console.log("SDP | stunned triggered", actor.name);

  const stack = condition.system.stack || 1;

await ChatMessage.create({

  speaker: ChatMessage.getSpeaker({actor}),

  content: `
  <div class="sdp-stunned-test"
       data-actor="${actor.id}"
       data-condition="${condition.id}">

    <h3>Stunned</h3>

    <p>${actor.name} is stunned (${stack})</p>

    <button class="stunned-roll">
    Roll Resistance
    </button>

  </div>
  `
});
}

}