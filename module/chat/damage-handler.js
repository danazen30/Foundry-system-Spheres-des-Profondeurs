import { SdpDamage } from "../combat/damage.js";

export function registerDamageHandlers(html, message) {

  // ===================
  // DAMAGE ROLL
  // ===================

  html.find(".sdp-attack .roll-damage").click(async ev => {

    const card = ev.currentTarget.closest(".sdp-attack");

    const actorId = card.dataset.actor;
    const weaponId = card.dataset.weapon;
    const targetId = card.dataset.target;
    const location = card.dataset.location;
    const critical = String(card.dataset.critical) === "true";

    const actor = game.actors.get(actorId);
    const weapon = actor.items.get(weaponId);
    const brutal = card.dataset.brutal === "true";

    if (brutal && weapon) {

      const current = weapon.system.durability?.value ?? 0;
      const newValue = Math.max(current - 1, 0);

      await weapon.update({
        "system.durability.value": newValue
      });

      if (newValue === 0) {
        ChatMessage.create({
          content: `<p><strong>${weapon.name} breaks!</strong></p>`
        });
      }
    }

    const result = await SdpDamage.rollDamage({
      actor,
      weapon,
      target: targetId ? canvas.tokens.get(targetId).actor : null,
      location,
      critical,
      brutal
    });

    const { roll, damage, finalDamage, armor, formula } = result;

    if (!brutal) {

      roll.toMessage({
        speaker: ChatMessage.getSpeaker({actor}),
        flavor: `
        <h3>Damage Roll</h3>
        <p>Attacker: ${actor.name}</p>
        <p>Weapon: ${weapon.name}</p>
        <p>Location: ${CONFIG.SDP.hitLocations[location]}</p>
        `
      });

    } else {

      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({actor}),
        content: `
        <h3>Damage Roll (Brutal Strike)</h3>
        <p>Attacker: ${actor.name}</p>
        <p>Weapon: ${weapon.name}</p>
        <p><strong>Max Damage Applied</strong></p>
        <p>Formula: ${formula} → MAX</p>
        <p><strong>Total Damage: ${damage}</strong></p>
        `
      });

    }

    if(!targetId) return;

    ChatMessage.create({
      content: `
      <h3>Damage Resolution</h3>
      <p>Location: ${CONFIG.SDP.hitLocations[location]}</p>
      <p>Raw Damage: ${damage}</p>
      <p>Armor: ${armor}</p>
      <p>Final Damage: ${finalDamage}</p>
      <button class="apply-damage"
        data-target="${targetId}"
        data-damage="${finalDamage}"
        data-location="${location}">
        Apply Damage
      </button>
      `,
      whisper: ChatMessage.getWhisperRecipients("GM")
    });

  });

  // =========================
  // APPLY DAMAGE
  // =========================

  html.find(".apply-damage").click(async ev => {

    const button = ev.currentTarget;

    const targetId = button.dataset.target;
    const damage = Number(button.dataset.damage);
    const location = button.dataset.location;

    const token = canvas.tokens.get(targetId);
    if(!token) return;

    const actor = token.actor;

    const result = await SdpDamage.applyFullDamage({
      actor,
      damage,
      location
    });

    const { newHealth, current } = result;

    const message = game.messages.get(
      button.closest(".message").dataset.messageId
    );

    await message.update({
      content: `
      <h3>Damage Resolution</h3>
      <p>Target: ${actor.name}</p>
      <p><strong>${current} → ${newHealth}</strong></p>
      `
    });

  });

}