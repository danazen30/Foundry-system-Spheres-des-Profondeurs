export class SdpRoll {

  // =====================
  // SUCCESS LEVEL
  // =====================

  static getSuccessLevel(roll, target){

    const rollTen = Math.floor(roll / 10);
    const targetTen = Math.floor(target / 10);

    return targetTen - rollTen;

  }

  // =====================
  // CRITICAL CHECK
  // =====================

  static getCritical(result){

    let criticalSuccess = false;
    let criticalFailure = false;

    if(result >= 1 && result <= 5){
      criticalSuccess = true;
    }

    if(result >= 96){
      criticalFailure = true;
    }

    return {
      success: criticalSuccess,
      failure: criticalFailure
    };

  }

  // =====================
  // BASIC TEST
  // =====================

  static async basicTest(actor, value, label){

    const roll = await (new Roll("1d100")).roll();

    const result = roll.total;

// =====================
// CONDITION MODIFIERS
// =====================

let conditionModifier = 0;

const conditions = actor.items.filter(i => i.type === "condition");

for(const condition of conditions){

  const key = condition.system.key;

  const config = CONFIG.SDP.conditionConfig?.[key];

  if(!config?.modifier) continue;

  const stack = condition.system.stack || 1;

  conditionModifier += config.modifier * stack;

}

// =====================
// GLOBAL MODIFIER
// =====================

const globalModifier = actor.system.modifiers?.allTests ?? 0;

// =====================
// FINAL TARGET
// =====================

const target = value + conditionModifier + globalModifier;

    const SL = this.getSuccessLevel(result, target);

    const crit = this.getCritical(result);

    let critText = "";

    if(crit.success){
      critText = `<p><strong>CRITICAL SUCCESS</strong></p>`;
    }

    if(crit.failure){
      critText = `<p><strong>CRITICAL FAILURE</strong></p>`;
    }

    const html = `
<div class="sdp-roll" 
     data-roll="${result}" 
     data-target="${target}" 
     data-sl="${SL}" 
     data-actor="${actor.name}">

  <h3>${actor.name} — ${label}</h3>

  <p>Target: ${target}</p>
  <p>Roll: ${result}</p>
  <p>SL: ${SL}</p>

  ${critText}

  <button class="sdp-opposed">Oppose</button>
  <button class="sdp-stop-opposed">Stop Opposition</button>

</div>
`;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor}),
      flavor: html
    });

    if(game.sdp?.opposed){

      const base = game.sdp.opposed;

      const baseSL = base.SL;

      let resultText;

      if(SL > baseSL) resultText = `${actor.name} wins`;
      else if(SL < baseSL) resultText = `${base.actor} wins`;
      else resultText = "Draw";

      ChatMessage.create({
        content: `
        <h3>Opposed Test</h3>

        <p>${base.actor} SL: ${baseSL}</p>
        <p>${actor.name} SL: ${SL}</p>

        <strong>${resultText}</strong>
        `
      });

    }

  }

}