import { SdpDamage } from "../combat/damage.js";

export function registerDamageHandlers(html, message) {

  // ===================
  // DAMAGE ROLL
  // ===================

 html.find(".sdp-attack .roll-damage, .sdp-spell .roll-damage").click(async ev => {

const card = ev.currentTarget.closest(".sdp-attack, .sdp-spell");
const button = ev.currentTarget;
const dataset = button.dataset;

if (!card) {
  console.error("No card found for damage button");
  return;
}

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

    const ammoId = card.dataset.ammo || dataset.ammo;

const result = await SdpDamage.rollDamage({
  actor,
  weapon,
  target: targetId ? canvas.tokens.get(targetId).actor : null,
  location,
  critical,
  brutal,
  ammoId
});

// =========================
// AMMO / WEAPON CONSUMPTION (ON HIT)
// =========================

console.log("SDP | CONSUMPTION CHECK", {
  weapon: weapon.name,
  consumesAmmo: weapon.system.consumesAmmo,
  ammoId
});

if (weapon.system.category === "ranged") {

  // 🔥 CAS 1 : utilise munition
  if (weapon.system.consumesAmmo) {

    if (ammoId) {

      const ammo = actor.items.get(ammoId);

      if (ammo) {

        const current = ammo.system.quantity?.value ?? 0;
        const newValue = Math.max(current - 1, 0);

        await ammo.update({
          "system.quantity.value": newValue
        });

        console.log("SDP | Ammo consumed", {
          ammo: ammo.name,
          before: current,
          after: newValue
        });

      } else {
        console.warn("SDP | Ammo not found");
      }

    } else {
      console.warn("SDP | No ammoId");
    }

  }

  // 🔥 CAS 2 : arme lancée
  else {

    const current = weapon.system.quantity?.value ?? 0;
    const newValue = Math.max(current - 1, 0);

    await weapon.update({
      "system.quantity.value": newValue
    });

    console.log("SDP | Weapon consumed", {
      weapon: weapon.name,
      before: current,
      after: newValue
    });

  }

}

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

    // =========================
// TARGET HANDLING
// =========================

let targets = [];

if (card.classList.contains("sdp-spell")) {

  // 🔥 SPELL = MULTI TARGET
  targets = Array.from(game.user.targets);

  if (!targets.length) {
    ui.notifications.warn("Select at least one target");
    return;
  }

} else {

  // 🔥 NORMAL ATTACK
  if (!targetId) return;

  const token = canvas.tokens.get(targetId);
  if (token) targets.push(token);

}

    ChatMessage.create({
      content: `
      <h3>Damage Resolution</h3>
      <p>Location: ${CONFIG.SDP.hitLocations[location]}</p>
      <p>Raw Damage: ${damage}</p>
      <p>Armor: ${armor}</p>
      <p>Final Damage: ${finalDamage}</p>
      <button class="apply-damage"
        data-target="${card.classList.contains("sdp-spell") ? "" : targetId}"
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
        const damage = Number(button.dataset.damage);
    const location = button.dataset.location;

    let targetId = button.dataset.target;

// 🔥 SPELL = prend les targets actuelles
if (!targetId) {

  const targets = Array.from(game.user.targets);

  if (!targets.length) {
    ui.notifications.warn("Select target(s) before applying damage");
    return;
  }

  // ⚠️ pour l’instant : 1 par 1
for (let token of targets) {

  const result = await SdpDamage.applyFullDamage({
    actor: token.actor,
    damage,
    location
  });

  const { finalDamage, armor, newHealth, current } = result;

  ChatMessage.create({
    content: `
    <div class="sdp-damage-result">
      <h4>${token.actor.name}</h4>
      <p>Location: ${CONFIG.SDP.hitLocations[location]}</p>
      <p>Damage: ${damage}</p>
      <p>Armor: ${armor}</p>
      <p><strong>Final: ${finalDamage}</strong></p>
      <p>HP: ${current} → ${newHealth}</p>
    </div>
    `
  });

}

  return;
}

    const token = canvas.tokens.get(targetId);
    if(!token) return;

    const actor = token.actor;

    const result = await SdpDamage.applyFullDamage({
      actor,
      damage,
      location
    });

    const { newHealth, current } = result;

    const severity = result.severity;

if(severity){

  const pack = game.packs.get("sdp.injuries");
  const docs = await pack.getDocuments();

  const injury = docs.find(i =>
    i.system.location === location &&
    i.system.severity === severity &&
    !i.system.consequence
  );

  ChatMessage.create({

    speaker: ChatMessage.getSpeaker({actor}),
    whisper: ChatMessage.getWhisperRecipients("GM"),

    content: `
    <div class="sdp-injury-card"
         data-actor="${actor.id}"
         data-location="${location}"
         data-severity="${severity}">

      <h3>Injury Sustained</h3>

      <p>Location: ${CONFIG.SDP.hitLocations[location]}</p>
      <p>Severity: ${severity}</p>

      ${injury ? `
        <div class="injury-preview">
          <p><strong>${injury.name}</strong></p>
          <p>${injury.system.description || ""}</p>
        </div>
      ` : "<p>No injury found</p>"}

      <button class="apply-injury">Apply Injury</button>
      <button class="roll-resistance">Roll Resistance</button>

    </div>
    `
  });

}

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