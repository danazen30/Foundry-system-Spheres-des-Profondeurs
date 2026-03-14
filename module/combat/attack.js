import { SdpRoll } from "../rolls/roll.js";
import { rollHitLocation } from "./hit-location.js";

export class SdpAttack {

static async attackTest(actor, weapon, attackValue){

  // ======================
// STUNNED CHECK
// ======================

const stunned = actor.items.find(i =>
  i.type === "condition" && i.system.key === "stunned"
);

if(stunned){

  ui.notifications.warn(`${actor.name} is stunned and cannot attack`);

  return;

}

  const isRanged = weapon.system.category === "ranged";

  const targets = Array.from(game.user.targets);

  let targetId = null;
  let targetActor = null;

  if(targets.length > 0){
    targetId = targets[0].id;
    targetActor = targets[0].actor;
  }

  const hitLocation = await rollHitLocation();

  // ======================
  // RANGED ATTACK
  // ======================

  if(isRanged){

    const skillKey = weapon.system.skill;

    const skill = actor.items.find(i =>
      i.type === "skill" && i.system.key === skillKey
    );

    let targetValue;

    if(skill){
      targetValue = skill.system.value;
    }else{
      targetValue = actor.system.attributes.rangedAbility.value;
    }

    let source;

    if(skill){
      source = skill.name;
    }else{
      source = "Ranged Ability";
    }

    const roll = await (new Roll("1d100")).roll();

    const result = roll.total;

    const crit = SdpRoll.getCritical(result);

    const success = result <= targetValue;

    let critText = "";

if(crit.success){
  critText = `<p><strong>CRITICAL SUCCESS</strong></p>`;
}

if(crit.failure){
  critText = `<p><strong>CRITICAL FAILURE</strong></p>`;
}

    let damageButton = "";

    if(success){

      damageButton = `
      <button
        class="roll-damage"
        data-actor="${actor.id}"
        data-weapon="${weapon.id}"
        data-target="${targetId ?? ""}">
        Roll Damage
      </button>
      `;

    }

    const html = `
<div class="sdp-attack"
     data-actor="${actor.id}"
     data-critical="${crit.success}"
     data-weapon="${weapon.id}"
     data-target="${targetId ?? ""}"
     data-location="${hitLocation.location}">

  <h3>${actor.name} shoots with ${weapon.name}</h3>

  <p>Test: ${source}</p>
  <p>Target: ${targetValue}</p>
  <p>Roll: ${result}</p>
  ${critText}

  <p>Hit Location: ${CONFIG.SDP.hitLocations[hitLocation.location]} (${hitLocation.roll.total})</p>

  <p><strong>${success ? "HIT" : "MISS"}</strong></p>

  ${damageButton}

</div>
`;

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor}),
      flavor: html
    });

    return;

  }

  // ======================
  // MELEE ATTACK
  // ======================

  const roll = await (new Roll("1d100")).roll();

  const result = roll.total;

  const crit = SdpRoll.getCritical(result);

  let SL;

  if (result === 100) {

    SL = 0;

  } else {

    const tens = Math.floor(result / 10);

    SL = 10 - tens;

  }

 let bonus = 0;

if(targetActor){

  const stunned = targetActor.items.find(i =>
    i.type === "condition" && i.system.key === "stunned"
  );

  if(stunned){
    bonus = stunned.system.stack || 1;
  }

}

const attackScore = attackValue + SL + bonus;

  let critText = "";

if(crit.success){
  critText = `<p><strong>CRITICAL SUCCESS</strong></p>`;
}

if(crit.failure){
  critText = `<p><strong>CRITICAL FAILURE</strong></p>`;
}

  const html = `
<div class="sdp-attack"
     data-attack="${attackScore}"
     data-critical="${crit.success}"
     data-actor="${actor.id}"
     data-weapon="${weapon.id}"
     data-target="${targetId ?? ""}"
     data-location="${hitLocation.location}">

  <h3>${actor.name} attacks with ${weapon.name}</h3>

  <p>Roll: ${result}</p>
  <p>SL: ${SL}</p>
  ${critText}
 <p>Attack Score: ${attackScore}</p>
${bonus ? `<p>Bonus vs Stunned: +${bonus}</p>` : ""}

  <p>Hit Location: ${CONFIG.SDP.hitLocations[hitLocation.location]} (${hitLocation.roll.total})</p>

  ${targetId ?
    `<button class="apply-defense">Apply Defense</button>` :
    `<p>No target selected</p>
     <button class="select-target">Select Target</button>`
  }

</div>
`;

  roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: html
  });

}

}