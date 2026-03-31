 export function registerAttackHandlers(html, message) {


 
 //================
 // SELECT TARGET
 //================

  html.find(".sdp-attack .select-target").click(async ev => {

  const targets = Array.from(game.user.targets);

  if(targets.length === 0){
    ui.notifications.warn("Please target a token first");
    return;
  }

  const card = ev.currentTarget.closest(".sdp-attack");

  // ✅ ON GARDE TOUT
  const attackScore = Number(card.dataset.attack);
  const roll = Number(card.dataset.roll);
  const baseAttack = Number(card.dataset.baseattack);
  const meleeBonus = Number(card.dataset.meleebonus || 0);


  const actorId = card.dataset.actor;
  const weaponId = card.dataset.weapon;
  const critical = card.dataset.critical;
  const location = card.dataset.location;
  const brutal = card.dataset.brutal;

  const targetId = targets[0].id;

  const message = game.messages.get(
    ev.currentTarget.closest(".message").dataset.messageId
  );

  const actor = game.actors.get(actorId);
const weapon = actor.items.get(weaponId);
const token = canvas.tokens.get(targetId);

const newHtml = `
<div class="sdp-attack"
     data-type="melee"
     data-roll="${roll}"
     data-attack="${attackScore}"
     data-baseattack="${baseAttack}"
     data-meleebonus="${meleeBonus}"
     data-critical="${critical}"
     data-location="${location}"
     data-brutal="${brutal}"
     data-actor="${actorId}"
     data-weapon="${weaponId}"
     data-target="${targetId}">

  <h3>${actor.name} attacks with ${weapon.name}</h3>

  <button class="edit-attack">Edit</button>

  <p>Roll: ${roll}</p>
<p>Attack Score: ${attackScore}</p>
<p>Target: ${token.name}</p>

<p>Location: ${CONFIG.SDP.hitLocations[location]}</p>

  <button class="apply-defense">Apply Defense</button>

</div>
`;

  await message.update({ content: newHtml });

});


  //===================
  // APPLY DEFENSE
  //===================

  html.find(".sdp-attack .apply-defense").click(async ev => {

    const card = ev.currentTarget.closest(".sdp-attack");

    const attackScore = Number(card.dataset.attack);
    const targetId = card.dataset.target;
    const actorId = card.dataset.actor;
    const weaponId = card.dataset.weapon;
    const location = card.dataset.location;
    const critical = card.dataset.critical;

    const message = game.messages.get(
      ev.currentTarget.closest(".message").dataset.messageId
    );

    const token = canvas.tokens.get(targetId);
    const target = token.actor;

    const parry = target.system.derived.parry.value;
    const evasion = target.system.derived.evasion.value;

    const defense = Math.max(parry, evasion);

    const result = attackScore > defense ? "HIT" : "MISS";

ChatMessage.create({

  content: `
  <h3>Defense Resolution</h3>

  <p>Target: ${target.name}</p>

  <p>Parry: ${parry}</p>
  <p>Evasion: ${evasion}</p>

  <p><strong>Defense Used: ${defense}</strong></p>

  <p>Attack Score: ${attackScore}</p>

  <p><strong>${result}</strong></p>
  `,

  whisper: ChatMessage.getWhisperRecipients("GM")

});

    const attacker = game.actors.get(actorId);
    const weapon = attacker.items.get(weaponId);

    let damageButton = "";

    if(result === "HIT"){

      damageButton = `
      <button
        class="roll-damage"
        data-actor="${actorId}"
        data-weapon="${weaponId}"
        data-target="${targetId}">
        Roll Damage
      </button>
      `;

    }

    const newHtml = `
 <div class="sdp-attack"
     data-attack="${attackScore}"
     data-critical="${critical}"
     data-actor="${actorId}"
     data-brutal="${card.dataset.brutal}"
     data-weapon="${weaponId}"
     data-target="${targetId}"
     data-location="${location}">

      <h3>${attacker.name} attacks with ${weapon.name}</h3>

      <p>Attack Score: ${attackScore}</p>

      <p>Location: ${CONFIG.SDP.hitLocations[location]}</p>

      <p><strong>${result}</strong></p>

      ${damageButton}

    </div>
    `;

    await message.update({
      content: newHtml
    }); 

  });
  }