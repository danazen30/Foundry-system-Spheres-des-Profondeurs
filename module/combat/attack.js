import { SdpRoll } from "../rolls/roll.js";
import { rollHitLocation } from "./hit-location.js";

export class SdpAttack {

static async attackTest(actor, weapon, attackValue){
const dialogMods = game.sdp?.dialogModifiers || {};
  // ======================
// STUNNED CHECK
// ======================

const stunned = actor.system.conditions?.stunned || 0;

if(stunned > 0){

  ui.notifications.warn(`${actor.name} is stunned and cannot attack`);
  return;

}

  const isRanged = weapon.system.category === "ranged";

  const targets = Array.from(game.user.targets);

let targetId = null;
let targetActor = null;

let conditionText = "";
let bonus = 0;

if(targets.length > 0){

  targetId = targets[0].id;
  targetActor = targets[0].actor;

if(targetActor){

  const stunned = targetActor.system.conditionTotals?.stunned || 0;
const deafened = targetActor.system.conditionTotals?.deafened || 0;
const prone = targetActor.system.conditionTotals?.prone || false;
const surprised = targetActor.system.conditionTotals?.surprised ? 3 : 0;

  if(stunned > 0){

    bonus += stunned;
    conditionText += `<p>Bonus vs Stunned: +${stunned}</p>`;

  }

  if(deafened > 0){

    bonus += deafened;
    conditionText += `<p>Bonus vs Deafened: +${deafened}</p>`;

  }

  if(surprised){

  bonus += surprised;
  conditionText += `<p>Bonus vs Surprised: +3</p>`;

}

  if(prone){

  bonus += 2;
  conditionText += `<p>Bonus vs Prone: +2</p>`;

  }
}

}

  let hitLocation;

if (dialogMods.location) {

  hitLocation = {
    location: dialogMods.location,
    roll: { total: "manual" }
  };

} else {

  hitLocation = await rollHitLocation();

}

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
  targetValue = skill.system.value + (dialogMods.totalMod || 0);
}else{
  targetValue = actor.system.attributes.rangedAbility.value + (dialogMods.totalMod || 0);
}

    // ======================
// DEAFENED MODIFIER
// ======================

const deafenedStacks = actor.system.conditionTotals?.deafened || 0;

if(deafenedStacks > 0){

  targetValue -= deafenedStacks * 10;

}

    // ======================
// POISON MODIFIER (RANGED)
// ======================

const poisonStacks = actor.system.conditionTotals?.poisoned || 0;
const exhaustedStacks = actor.system.conditionTotals?.exhausted || 0;
const shaken = actor.system.conditionTotals?.shaken ? 1 : 0;
const frightened = actor.system.conditionTotals?.frightened ? 3 : 0;

const penalty = (poisonStacks + exhaustedStacks + shaken + frightened) * 10;

if(penalty > 0){
  targetValue -= penalty;
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
      <button type="button" type="button" class="roll-damage"
        data-actor="${actor.id}"
        data-weapon="${weapon.id}"
        data-target="${targetId ?? ""}">
        Roll Damage
      </button>
      `;

    }

    const html = `
<div class="sdp-attack" data-sdp-safe="true"
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
const meleeBonus = Math.floor((dialogMods.totalMod || 0) / 10);

const baseAttack = actor.system.derived.attack.value;

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

// 🎯 attack score final
const attackScore = baseAttack + meleeBonus + SL + bonus;



  let critText = "";

if(crit.success){
  critText = `<p><strong>CRITICAL SUCCESS</strong></p>`;
}

if(crit.failure){
  critText = `<p><strong>CRITICAL FAILURE</strong></p>`;
}

  const html = `
<div class="sdp-attack" data-sdp-safe="true"
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
 ${conditionText}

  <p>Hit Location: ${CONFIG.SDP.hitLocations[hitLocation.location]} (${hitLocation.roll.total})</p>

  ${targetId ?
    `<button type="button" class="apply-defense">Apply Defense</button>` :
    `<p>No target selected</p>
     <button type="button" class="select-target">Select Target</button>`
  }

</div>
`;

  roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: html
  });

}

}