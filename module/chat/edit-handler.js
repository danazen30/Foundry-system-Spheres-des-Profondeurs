export function registerEditHandlers(html, message) {

html.find(".edit-roll").click(async ev => {

  const card = ev.currentTarget.closest(".sdp-roll");

  const currentTarget = Number(card.dataset.target);
  const currentRoll = Number(card.dataset.roll);

  new Dialog({

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
        callback: async (htmlDialog) => {

          const newTarget = Number(htmlDialog.find('[name="target"]').val());
          const newRoll = Number(htmlDialog.find('[name="roll"]').val());

          const SL =
            Math.floor(newTarget / 10) -
            Math.floor(newRoll / 10);

          const success = newRoll <= newTarget;

          const message = game.messages.get(
            ev.currentTarget.closest(".message").dataset.messageId
          );

          const newHtml = `
          <div class="sdp-roll"
               data-roll="${newRoll}"
               data-target="${newTarget}"
               data-sl="${SL}">

            <h3>Edited Roll</h3>

            <p>Target: ${newTarget}</p>
            <p>Roll: ${newRoll}</p>
            <p>SL: ${SL}</p>

            <p><strong>${success ? "SUCCESS" : "FAILURE"}</strong></p>

          </div>
          `;

          await message.update({ content: newHtml });

        }
      }

    }

  }).render(true);

});

html.find(".edit-attack").click(async ev => {

  const card = ev.currentTarget.closest(".sdp-attack");

  const roll = Number(card.dataset.roll);
const baseAttack = Number(card.dataset.baseattack);

new Dialog({

  title: "Edit Attack",

  content: `
    <label>Roll</label>
    <input type="number" name="roll" value="${roll}"/>
  `,

    buttons: {

      apply: {
        label: "Apply",
        callback: async (htmlDialog) => {

          const type = card.dataset.type;

const newRoll = Number(htmlDialog.find('[name="roll"]').val());
const target = type === "ranged"
  ? Number(card.dataset.testtarget)
  : Number(card.dataset.baseattack);

let newHtml = "";

if(type === "ranged"){

  const SL = Math.floor(target / 10) - Math.floor(newRoll / 10);
  const success = newRoll <= target;

  newHtml = `
<div class="sdp-attack"
     data-type="ranged"
     data-roll="${newRoll}"
     data-target="${card.dataset.target}"
     data-actor="${card.dataset.actor}"
     data-weapon="${card.dataset.weapon}"
     data-target="${card.dataset.target}"
     data-location="${card.dataset.location}"
     data-critical="${card.dataset.critical}"
     data-brutal="${card.dataset.brutal}">

  <h3>Edited Ranged Attack</h3>

  <button class="edit-attack">Edit</button>

  <p>Target: ${target}</p>
  <p>Roll: ${newRoll}</p>
  <p>SL: ${SL}</p>

  <p><strong>${success ? "HIT" : "MISS"}</strong></p>

</div>
`;

}else{

  const tens = Math.floor(newRoll / 10);
const SL = (newRoll === 100) ? 0 : 10 - tens;

const baseAttack = Number(card.dataset.baseattack);
const meleeBonus = Number(card.dataset.meleebonus || 0);

const attackScore = baseAttack + meleeBonus + SL;
const roll = Number(card.dataset.roll);

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
     data-critical="${card.dataset.critical}"
     data-brutal="${card.dataset.brutal}">

  <h3>Edited Melee Attack</h3>

  <button class="edit-attack">Edit</button>

  <p>Roll: ${newRoll}</p>
  <p>SL: ${SL}</p>
  <p>Attack Score: ${attackScore}</p>

  <button class="apply-defense">Apply Defense</button>

</div>
`;

}

await message.update({ content: newHtml });

        }
      }

    }

  }).render(true);

});
}