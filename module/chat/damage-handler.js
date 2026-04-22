import { SdpDamage } from "../combat/damage.js";

export function registerDamageHandlers(html, message) {

  // ===================
  // DAMAGE ROLL
  // ===================

 html.find(".sdp-attack .roll-damage, .sdp-spell .roll-damage").click(async ev => {

const card = ev.currentTarget.closest(".sdp-attack, .sdp-spell");
const button = ev.currentTarget;
const dataset = button.dataset;

// =========================
// GET TRAITS FROM ATTACK
// =========================

const rawTraits = button.dataset.traits;

let traits = [];

if (rawTraits && rawTraits !== "undefined") {
  try {
    traits = JSON.parse(rawTraits);
  } catch (e) {
    console.warn("TRAITS PARSE ERROR (TOP)", rawTraits);
  }
}

console.log("TAILLE DEBUG (DAMAGE)", traits);

if (!card) {
  console.error("No card found for damage button");
  return;
}

    const actorId = card.dataset.actor;
    const weaponId = card.dataset.weapon;
    let targetId = card.dataset.target;

// 🔥 NOUVEAU : inject target si absent
if (!targetId) {

  const targets = Array.from(game.user.targets);

  if (targets.length === 1) {
    targetId = targets[0].id;

    // 🔥 IMPORTANT → on injecte dans la card pour la suite
    card.dataset.target = targetId;
  }
}
    const location = card.dataset.location;
    const damageType = card.dataset.damagetype || "slashing";
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
  ammoId,
  damageType // 🔥 AJOUT
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

  const { roll, damage, finalDamage, armor, formula, devastating, weaponDetail, baseWeapon, SB } = result;

   if (!brutal) {

  // =========================
  // DEVASTATING MODE
  // =========================

  if (devastating) {

    const dice = [];

for (let d of roll.dice) {
  for (let r of d.results) {
    dice.push({
      result: r.result,
      faces: d.faces,
      rerolled: false
    });
  }
}

const diceHTML = dice.map((d, i) => `
  <button class="reroll-die"
          data-index="${i}"
          data-faces="${d.faces}"
          data-rerolled="false">
    ${d.result}
  </button>
`).join("");

await roll.toMessage({
  speaker: ChatMessage.getSpeaker({actor}),
  flavor: `
    <div class="sdp-damage-roll"
     data-formula="${formula}"
     data-dice='${JSON.stringify(dice)}'
     data-original-dice='${JSON.stringify(
       roll.dice.map(d => ({
         faces: d.faces,
         results: d.results.map(r => r.result)
       }))
     )}'
     data-total="${roll.total}"
     data-target="${targetId}"
     data-location="${location}">

      <h3>Damage Roll (Devastating)</h3>
      <p>Attacker: ${actor.name}</p>
      <p>Weapon: ${weapon.name}</p>

      <div class="dice-container">
        ${diceHTML}
      </div>

      <p class="damage-total"><strong>Total: ${damage}</strong></p>

      <button class="validate-damage">
        Validate Damage
      </button>

    </div>
  `
});

    return; // 🔥 STOP NORMAL FLOW
  }

  // =========================
  // NORMAL FLOW
  // =========================

  roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `
    <h3>Damage Roll</h3>
    <p>Attacker: ${actor.name}</p>
    <p>Weapon: ${weapon.name}</p>
    <p>Location: ${CONFIG.SDP.hitLocations[location]}</p>
    `
  });

}
    
    else {

  if (roll) {

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `
      <h3>Damage Roll (Brutal Strike)</h3>
      <p>Attacker: ${actor.name}</p>
      <p>Weapon: ${weapon.name}</p>
      <p><strong>Weapon:</strong> ${weaponDetail || "—"} (MAX)</p>
      <p><strong>Other damage:</strong>
  ${SB ? `${SB} (SB)` : ""}
  ${SB && baseWeapon ? " + " : ""}
  ${baseWeapon ? `${baseWeapon} (base)` : ""}
</p>
    `
  });

} else {

  // cas sans sign → pas de roll du tout
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({actor}),
    content: `
      <h3>Damage Roll (Brutal Strike)</h3>
      <p>Attacker: ${actor.name}</p>
      <p>Weapon: ${weapon.name}</p>
      <p><strong>Weapon Dice: MAX</strong></p>
      <p><strong>Total Damage: ${damage}</strong></p>
    `
  });

}

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

  // 🔥 NORMAL ATTACK (NEW LOGIC)

  if (targetId) {

    const token = canvas.tokens.get(targetId);
    if (token) targets.push(token);

  } else {

    // 🔥 fallback = target sélectionné maintenant
    targets = Array.from(game.user.targets);

    if (!targets.length) {
      ui.notifications.warn("Select a target before applying damage");
      return;
    }

  }

}

    ChatMessage.create({
      content: `
            <div class="damage-card"
           data-traits='${card.dataset.traits || "[]"}'>
      <h3>Damage Resolution</h3>
      <p>Location: ${CONFIG.SDP.hitLocations[location]}</p>
      <p>Raw Damage: ${damage}</p>
      <p>Armor: ${armor}</p>
      <p>Final Damage: ${finalDamage}</p>
      <button class="apply-damage"
        data-target="${card.classList.contains("sdp-spell") ? "" : targetId}"
        data-damage="${finalDamage}"
        data-location="${location}"
        data-critical="${critical}">
        Apply Damage
      </button>
      </div>
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

    // =========================
// FLAWED ARMOR (BREAK)
// =========================

const isCrit = button.dataset.critical === "true";

if (isCrit && targetId) {

  const token = canvas.tokens.get(targetId);
  const actorTarget = token?.actor;

  if (actorTarget) {

const armors = actorTarget.items.filter(i =>
  i.type === "armor" && i.system.worn?.value
) || [];

for (const armor of armors) {

  const itemTraits = armor.system.itemTraits || [];

  if (!itemTraits.some(t => t.key === "flawed")) continue;

  const AP = armor.system.AP || {};

  const protectsLocation = (AP[location] ?? 0) > 0;

  if (!protectsLocation) continue;

  await armor.update({
    "system.durability.value": 0
  });

  ChatMessage.create({
    content: `<p><strong>${armor.name} breaks due to its fragility!</strong></p>`
  });

  break;
}
  }
}

// 🔥 SPELL = prend les targets actuelles
if (!targetId) {

  const targets = Array.from(game.user.targets);

  if (!targets.length) {
    ui.notifications.warn("Select target(s) before applying damage");
    return;
  }

  // ⚠️ pour l’instant : 1 par 1
for (let token of targets) {

  // =========================
// TRAIT TAILLE (ARMOR DAMAGE)
// =========================

const attackCard = button.closest(".sdp-attack");
const traits = JSON.parse(attackCard?.dataset?.traits || "[]");

const hasTaille = traits.some(t => t?.key === "size");

if (hasTaille) {

  const armorLogs = [];
  const actorTarget = token?.actor;

  if (actorTarget) {

    const armors = actorTarget.items.filter(i =>
      i.type === "armor" &&
      i.system.worn?.value &&
      (i.system.AP?.[location] ?? 0) > 0
    );

    for (const armor of armors) {

      const currentAP = armor.system.AP?.[location] ?? 0;
      const newAP = Math.max(currentAP - 1, 0);

      await armor.update({
        [`system.AP.${location}`]: newAP
      });

      armorLogs.push({
        name: armor.name,
        before: currentAP,
        after: newAP
      });

      console.log("SDP | TAILLE ARMOR DAMAGE", {
        armor: armor.name,
        before: currentAP,
        after: newAP
      });
    }

    if (armorLogs.length) {

      ChatMessage.create({
        content: `
          <div class="sdp-armor-damage">
            <h4>Armor Damaged</h4>
            ${armorLogs.map(a => `
              <p>${a.name} : ${a.before} → ${a.after}</p>
            `).join("")}
          </div>
        `
      });

    }

  }

}

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

// =========================
// TRAIT TAILLE (ARMOR DAMAGE) — SINGLE TARGET
// =========================

const card = button.closest(".damage-card");

const rawTraits = button.dataset.traits;

let traits = [];

if (rawTraits && rawTraits !== "undefined") {
  try {
    traits = JSON.parse(rawTraits);
  } catch (e) {
    console.warn("TRAITS PARSE ERROR", rawTraits);
  }
}

const hasTaille = traits.some(t => t?.key === "size");
if (hasTaille && targetId) {

  const token = canvas.tokens.get(targetId);
  if (!token) return;

  const actorTarget = token.actor;
  const armorLogs = [];

  if (actorTarget) {

    const armors = actorTarget.items.filter(i =>
      i.type === "armor" &&
      i.system.worn?.value &&
      (i.system.AP?.[location] ?? 0) > 0
    );

    for (const armor of armors) {

      const currentAP = armor.system.AP?.[location] ?? 0;
      const newAP = Math.max(currentAP - 1, 0);

      await armor.update({
        [`system.AP.${location}`]: newAP
      });

      armorLogs.push({
        name: armor.name,
        before: currentAP,
        after: newAP
      });

    }

    if (armorLogs.length) {

      ChatMessage.create({
        content: `
          <div class="sdp-armor-damage">
            <h4>Armor Damaged</h4>
            ${armorLogs.map(a => `
              <p>${a.name} : ${a.before} → ${a.after}</p>
            `).join("")}
          </div>
        `
      });

    }

  }

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

  // =========================
// DEVASTATING REROLL
// =========================

html.on("click", ".reroll-die", async ev => {

  const button = ev.currentTarget;
  const card = button.closest(".sdp-damage-roll");

  const index = Number(button.dataset.index);
let dice = [];

try {
  dice = JSON.parse(card.dataset.dice || "[]");
} catch (e) {
  console.error("Invalid dice JSON", card.dataset.dice);
  return;
}

  // 🔥 bloque reroll multiple
  if (dice[index].rerolled) {
    ui.notifications.warn("This die has already been rerolled");
    return;
  }

  const faces = Number(button.dataset.faces);

  const reroll = new Roll(`1d${faces}`);
  await reroll.evaluate();

  await game.dice3d?.showForRoll(reroll);

  const newValue = reroll.total;

  dice[index].result = newValue;
  dice[index].rerolled = true;

  console.log("SDP | DEVASTATING REROLL", {
    index,
    newValue
  });

  // =========================
  // RECALCUL TOTAL
  // =========================

  const diceTotal = dice.reduce((a, d) => a + d.result, 0);

let originalDice = [];

try {
  originalDice = JSON.parse(card.dataset.originalDice || "[]");
} catch (e) {
  console.error("Invalid originalDice JSON", card.dataset.originalDice);
  return;
}
const originalTotal = Number(card.dataset.total);

// somme des dés d'origine
const originalDiceTotal = originalDice.reduce((a, d) => {
  return a + d.results.reduce((s, r) => s + r, 0);
}, 0);

// base = tout ce qui n'est PAS les dés
const base = originalTotal - originalDiceTotal;

// nouveau total
const newTotal = base + diceTotal;

  // =========================
  // UPDATE UI
  // =========================

const diceHTML = dice.map((d, i) => `
  <button class="reroll-die"
          data-index="${i}"
          data-faces="${d.faces}"
          data-rerolled="${d.rerolled}">
    ${d.result}
  </button>
`).join("");

card.dataset.dice = JSON.stringify(dice);

card.querySelector(".dice-container").innerHTML = diceHTML;
card.querySelector(".damage-total").innerHTML =
  `<strong>Total: ${newTotal}</strong>`;
})

html.on("click", ".validate-damage", async ev => {

  const card = ev.currentTarget.closest(".sdp-damage-roll");

  const totalText = card.querySelector(".damage-total").innerText;
  const damage = Number(totalText.replace(/\D/g, ""));

  const targetId = card.dataset.target;
  const location = card.dataset.location;

  // =========================
  // TARGET HANDLING (COPIE SAFE)
  // =========================

  let targets = [];

  if (!targetId) {
    targets = Array.from(game.user.targets);

    if (!targets.length) {
      ui.notifications.warn("Select at least one target");
      return;
    }

  } else {
    const token = canvas.tokens.get(targetId);
    if (token) targets.push(token);
  }

  // =========================
  // ARMOR
  // =========================

  let armor = 0;

  if (targets.length) {
    armor = SdpDamage.getArmorValue(targets[0].actor, location);
  }

  const finalDamage = Math.max(damage - armor, 0);

  // =========================
  // NORMAL DAMAGE RESOLUTION CARD
  // =========================

  await ChatMessage.create({
    content: `
      <h3>Damage Resolution</h3>
      <p>Location: ${CONFIG.SDP.hitLocations[location]}</p>
      <p>Raw Damage: ${damage}</p>
      <p>Armor: ${armor}</p>
      <p>Final Damage: ${finalDamage}</p>
      <button class="apply-damage"
        data-target="${targetId || ""}"
        data-damage="${finalDamage}"
        data-location="${location}">
        Apply Damage
      </button>
    `,
    whisper: ChatMessage.getWhisperRecipients("GM")
  });

});

}