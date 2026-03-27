import { SdpAttack } from "../combat/attack.js";

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

    let conditionModifier = 0;
    const conditions = actor.system.conditionTotals;

    for(const key in conditions){

      const val = conditions[key];
      if(!val) continue;

      const stack = val === true ? 1 : val;
      const config = CONFIG.SDP.conditionConfig?.[key];

      if(!config?.modifier) continue;

      conditionModifier += config.modifier * stack;
    }

    const globalModifier = actor.system.modifiers?.allTests ?? 0;

    const target = value + conditionModifier + globalModifier;

    const SL = this.getSuccessLevel(result, target);
    const crit = this.getCritical(result);

    let critText = "";

    if(crit.success) critText = `<p><strong>CRITICAL SUCCESS</strong></p>`;
    if(crit.failure) critText = `<p><strong>CRITICAL FAILURE</strong></p>`;

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

  }

  // =====================
  // DIALOG
  // =====================

  static async openDialog({ actor, type, label, target, weapon }){

  const isAttack = type === "attack";

  const talents = actor.items.filter(i => i.type === "talent");

  let conditionMod = 0;
  let conditionDetails = [];

  const conditions = actor.system.conditionTotals;

  for (const key in conditions) {

    const value = conditions[key];
    if (!value) continue;

    const stack = value === true ? 1 : value;

    const config = CONFIG.SDP.conditionConfig?.[key];
    if (!config?.modifier) continue;

    const mod = config.modifier * stack;

    conditionMod += mod;

    conditionDetails.push({
      name: key,
      value: mod
    });
  }

  const html = await renderTemplate(
    "systems/sdp/templates/dialogs/roll-dialog.hbs",
    {
      actor,
      label,
      isAttack,
      effects: actor.effects.contents,
      talents,
      conditionMod,
      conditionDetails
    }
  );

  new Dialog({

    title: label,
    content: html,

    buttons: {

      roll: {
        label: "Roll",

        callback: async (html) => {

          const form = html[0] ?? html;

          const difficulty = Number(form.querySelector('[name="difficulty"]').value);
          const customMod = Number(form.querySelector('[name="customMod"]').value);

          let totalMod = difficulty + customMod + conditionMod;

          // =========================
          // EFFECTS
          // =========================

          const selectedEffects = form.querySelectorAll('[name="effect"]:checked');

          for (let el of selectedEffects) {
            const effect = actor.effects.get(el.value);
            if (!effect) continue;

            for (let change of effect.changes) {
              totalMod += Number(change.value || 0);
            }
          }

          // =========================
          // TALENTS
          // =========================

          const selectedTalents = form.querySelectorAll('[name="talent"]:checked');

          for (let el of selectedTalents) {

            const talent = actor.items.get(el.value);
            if (!talent) continue;

            const level = Number(talent.system.advances || 1);

            for (let effect of talent.effects) {

              for (let change of effect.changes) {

                if (change.key !== "system.modifiers.dialog") continue;

                const value = Number(change.value || 0);

                totalMod += value * level;
              }
            }
          }

          // =========================
          // LOCATION
          // =========================

          let location = null;

          if (isAttack) {

            location = form.querySelector('[name="location"]').value;

            if (location === "body") totalMod -= 10;
            if (location === "arm") totalMod -= 20;
            if (location === "leg") totalMod -= 20;
            if (location === "head") totalMod -= 30;
          }

          // =========================
          // ATTACK
          // =========================

          if (isAttack) {

            game.sdp = game.sdp || {};

            game.sdp.dialogModifiers = {
              totalMod,
              location,
              brutal: form.querySelector('[name="brutal"]')?.checked || false
            };

            return SdpAttack.attackTest(actor, weapon);
          }

          // =========================
          // BASIC TEST
          // =========================

          const finalTarget = target + totalMod;

          const roll = await new Roll("1d100").roll();
          const result = roll.total;

          const success = result <= finalTarget;

          await roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor }),
            flavor: `
              <h3>${actor.name} — ${label}</h3>
              <p>Target: ${finalTarget}</p>
              <p>Roll: ${result}</p>
              <p><strong>${success ? "SUCCESS" : "FAILURE"}</strong></p>
            `
          });

        }
      }

    }

  }).render(true);

}
}