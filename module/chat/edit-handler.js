import { SimpleDialog } from "../apps/simple-dialog.js";

export function registerEditHandlers(html, message) {

  // =========================
  // EDIT ROLL
  // =========================

  html.find(".edit-roll").click(async ev => {

    const card = ev.currentTarget.closest(".sdp-roll");

    const currentTarget = Number(card.dataset.target);
    const currentRoll = Number(card.dataset.roll);

    new SimpleDialog({

      title: "Edit Roll",

      content: `
        <label>Target</label>
        <input type="number" name="target" value="${currentTarget}"/>

        <label>Roll</label>
        <input type="number" name="roll" value="${currentRoll}"/>
      `,

      buttons: {
        apply: {
          label: "Apply",
          callback: async (app) => {

            const newTarget = Number(
              app.element.querySelector('[name="target"]').value
            );

            const newRoll = Number(
              app.element.querySelector('[name="roll"]').value
            );

            const SL =
              Math.floor(newTarget / 10) -
              Math.floor(newRoll / 10);

            const success = newRoll <= newTarget;

            const message = game.messages.get(
              ev.currentTarget.closest(".message").dataset.messageId
            );

            const oldTarget = Number(card.dataset.target);
            const oldRoll = Number(card.dataset.roll);

            const actor = game.actors.get(card.dataset.actor);
            const label = card.querySelector("h3")?.textContent || actor.name;

            const newHtml = `
<div class="sdp-roll"
     data-target="${newTarget}"
     data-roll="${newRoll}"
     data-sl="${SL}"
     data-actor="${card.dataset.actor}">

  <h3>${label}</h3>

  <button class="edit-roll">Edit</button>

  <p>Target: ${newTarget} (${oldTarget})</p>
  <p>Roll: ${newRoll} (${oldRoll})</p>
  <p>SL: ${SL}</p>

  <p><strong>${success ? "SUCCESS" : "FAILURE"}</strong></p>

  <button class="sdp-opposed">Oppose</button>
  <button class="sdp-stop-opposed">Stop Oppose</button>

</div>
`;

            await message.update({ content: newHtml });

          }
        }
      }

    }).render(true);

  });

  // =========================
  // EDIT ATTACK
  // =========================

  html.find(".edit-attack").click(async ev => {

    const card = ev.currentTarget.closest(".sdp-attack");

    const oldRoll = Number(card.dataset.roll);
    const oldAttack = Number(card.dataset.attack);

    const roll = Number(card.dataset.roll);

    new SimpleDialog({

      title: "Edit Attack",

      content: `
      ${card.dataset.type === "ranged" ? `
        <label>Target</label>
        <input type="number" name="target" value="${card.dataset.testtarget || 0}"/>
      ` : ""}

      <label>Roll</label>
      <input type="number" name="roll" value="${roll}"/>
      `,

      buttons: {
        apply: {
          label: "Apply",
          callback: async (app) => {

            const type = card.dataset.type;

            const newRoll = Number(
              app.element.querySelector('[name="roll"]').value
            );

            let target;

            if(type === "ranged"){
              target = Number(
                app.element.querySelector('[name="target"]').value
              );
            } else {
              target = Number(card.dataset.baseattack);
            }

            let newHtml = "";

            if(type === "ranged"){

              const SL = Math.floor(target / 10) - Math.floor(newRoll / 10);
              const success = newRoll <= target;

              const actor = game.actors.get(card.dataset.actor);
              const weapon = actor.items.get(card.dataset.weapon);

              const crit = {
                success: newRoll >= 1 && newRoll <= 5,
                failure: newRoll >= 96
              };

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
                <button class="roll-damage"
                  data-actor="${card.dataset.actor}"
                  data-weapon="${card.dataset.weapon}"
                  data-target="${card.dataset.target}">
                  Roll Damage
                </button>
                `;
              }

              newHtml = `
<div class="sdp-attack"
     data-type="ranged"
     data-roll="${newRoll}"
     data-testtarget="${target}"
     data-actor="${card.dataset.actor}"
     data-weapon="${card.dataset.weapon}"
     data-target="${card.dataset.target}"
     data-location="${card.dataset.location}"
     data-critical="${crit.success}"
     data-brutal="${card.dataset.brutal}">

  <h3>${actor.name} shoots with ${weapon.name}</h3>

  <button class="edit-attack">Edit</button>

  <p>Target: ${target}</p>
  <p>Roll: ${newRoll} (${oldRoll})</p>
  <p>SL: ${SL}</p>

  ${critText}

  <p>Hit Location: ${CONFIG.SDP.hitLocations[card.dataset.location]}</p>

  <p><strong>${success ? "HIT" : "MISS"}</strong></p>

  ${damageButton}

</div>
`;

            } else {

              const tens = Math.floor(newRoll / 10);
              const SL = (newRoll === 100) ? 0 : 10 - tens;

              const baseAttack = Number(card.dataset.baseattack);
              const meleeBonus = Number(card.dataset.meleebonus || 0);

              const attackScore = baseAttack + meleeBonus + SL;

              const actor = game.actors.get(card.dataset.actor);
              const weapon = actor.items.get(card.dataset.weapon);

              const crit = {
                success: newRoll >= 1 && newRoll <= 5,
                failure: newRoll >= 96
              };

              let critText = "";
              if(crit.success){
                critText = `<p><strong>CRITICAL SUCCESS</strong></p>`;
              }
              if(crit.failure){
                critText = `<p><strong>CRITICAL FAILURE</strong></p>`;
              }

              newHtml = `
<div class="sdp-attack"
     data-type="melee"
     data-roll="${newRoll}"
     data-attack="${attackScore}"
     data-baseattack="${baseAttack}"
     data-meleebonus="${meleeBonus}"
     data-actor="${card.dataset.actor}"
     data-weapon="${card.dataset.weapon}"
     data-target="${card.dataset.target}"
     data-location="${card.dataset.location}"
     data-critical="${crit.success}"
     data-brutal="${card.dataset.brutal}">

  <h3>${actor.name} attacks with ${weapon.name}</h3>

  <button class="edit-attack">Edit</button>

  <p>Roll: ${newRoll} (${oldRoll})</p>
  <p>SL: ${SL}</p>
  <p>Attack Score: ${attackScore} (${oldAttack})</p>

  <p>Location: ${CONFIG.SDP.hitLocations[card.dataset.location]}</p>

  ${critText}

  <button class="apply-defense">Apply Defense</button>

</div>
`;

            }

            const message = game.messages.get(
              ev.currentTarget.closest(".message").dataset.messageId
            );

            await message.update({ content: newHtml });

          }
        }
      }

    }).render(true);

  });

}