import { SdpAttack } from "../combat/attack.js";

export class SdpRoll {

  static getSuccessLevel(roll, target){
    const rollTen = Math.floor(roll / 10);
    const targetTen = Math.floor(target / 10);
    return targetTen - rollTen;
  }

  static getCritical(result){
    return {
      success: result >= 1 && result <= 5,
      failure: result >= 96
    };
  }

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

    const target = value + conditionModifier;

    const SL = this.getSuccessLevel(result, target);
    const crit = this.getCritical(result);

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor}),
      flavor: `
      <h3>${actor.name} — ${label}</h3>
      <p>Target: ${target}</p>
      <p>Roll: ${result}</p>
      <p>SL: ${SL}</p>
      ${crit.success ? "<p><strong>CRIT SUCCESS</strong></p>" : ""}
      ${crit.failure ? "<p><strong>CRIT FAILURE</strong></p>" : ""}
      `
    });
  }

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
        target, // 🔥 FIX
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

      // =========================
      // 🔥 PREVIEW LIVE FIX
      // =========================

      render: (html) => {

        const form = html[0];

        const updatePreview = () => {

          let totalMod = 0;

          const difficulty = Number(form.querySelector('[name="difficulty"]').value);
          const customMod = Number(form.querySelector('[name="customMod"]').value);

          totalMod += difficulty + customMod + conditionMod;

          // TALENTS
          const selectedTalents = form.querySelectorAll('[name="talent"]:checked');

          for (let el of selectedTalents) {

            const talent = actor.items.get(el.value);
            if (!talent) continue;

            const level = Number(talent.system.advances || 1);

            for (let effect of talent.effects) {
              for (let change of effect.changes) {

                if (change.key !== "system.modifiers.dialog") continue;

                totalMod += Number(change.value || 0) * level;
              }
            }
          }

          const final = target + totalMod;

          form.querySelector("#totalMod").textContent = totalMod;
          form.querySelector("#finalTarget").textContent = final;
        };

        form.querySelectorAll("input, select").forEach(el => {
          el.addEventListener("change", updatePreview);
        });

        updatePreview();
      },

      // =========================
      // ROLL
      // =========================

      buttons: {

        roll: {
          label: "Roll",

          callback: async (html) => {

            const form = html[0];

            const difficulty = Number(form.querySelector('[name="difficulty"]').value);
            const customMod = Number(form.querySelector('[name="customMod"]').value);

            let totalMod = difficulty + customMod + conditionMod;

            // TALENTS
            const selectedTalents = form.querySelectorAll('[name="talent"]:checked');

            for (let el of selectedTalents) {

              const talent = actor.items.get(el.value);
              if (!talent) continue;

              const level = Number(talent.system.advances || 1);

              for (let effect of talent.effects) {
                for (let change of effect.changes) {

                  if (change.key !== "system.modifiers.dialog") continue;

                  totalMod += Number(change.value || 0) * level;
                }
              }
            }

            if (isAttack) {

              game.sdp = game.sdp || {};

              game.sdp.dialogModifiers = {
                totalMod,
                location: form.querySelector('[name="location"]')?.value,
                brutal: form.querySelector('[name="brutal"]')?.checked || false
              };

              return SdpAttack.attackTest(actor, weapon);
            }

            const finalTarget = target + totalMod;

            const roll = await new Roll("1d100").roll();
            const result = roll.total;

            await roll.toMessage({
              speaker: ChatMessage.getSpeaker({ actor }),
              flavor: `
                <h3>${actor.name} — ${label}</h3>
                <p>Target: ${finalTarget}</p>
                <p>Roll: ${result}</p>
                <p><strong>${result <= finalTarget ? "SUCCESS" : "FAILURE"}</strong></p>
              `
            });
          }
        }

      }

    }).render(true);
  }
}