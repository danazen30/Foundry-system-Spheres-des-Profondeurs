import { SdpDamage } from "../combat/damage.js";
import { getHitLocationLabel } from "../combat/hit-location.js";

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
    const defenseType = button.dataset.defenseType;
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
         content: `<p><strong>${game.i18n.format(
  "SDP.WeaponBreaks",
  {
    weapon: weapon.name
  }
)}</strong></p>`
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
  damageType,
  defenseType
});

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

      <h3>
  ${game.i18n.localize(
    "SDP.DamageRollDevastating"
  )}
</h3>

<p>
  ${game.i18n.localize(
    "SDP.Attacker"
  )}: ${actor.name}
</p>

<p>
  ${game.i18n.localize(
    "SDP.Weapon"
  )}: ${weapon.name}
</p>

      <div class="dice-container">
        ${diceHTML}
      </div>

      <p class="damage-total">

  <strong>

    ${game.i18n.localize(
      "SDP.Total"
    )}: ${damage}

  </strong>

</p>

<button class="validate-damage">

  ${game.i18n.localize(
    "SDP.ValidateDamage"
  )}

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
    <h3>
  ${game.i18n.localize(
    "SDP.DamageRoll"
  )}
</h3>

<p>
  ${game.i18n.localize(
    "SDP.Attacker"
  )}: ${actor.name}
</p>

<p>
  ${game.i18n.localize(
    "SDP.Weapon"
  )}: ${weapon.name}
</p>

<p>
  ${game.i18n.localize(
    "SDP.Location"
  )}:
${getHitLocationLabel(
  card.dataset.locationProfile || "humanoid",
  location
)}
</p>
    `
  });

}
    
    else {

  if (roll) {

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `
      <h3>
  ${game.i18n.localize(
    "SDP.DamageRollBrutalStrike"
  )}
</h3>
      <p>

  <strong>

    ${game.i18n.localize(
      "SDP.Weapon"
    )}:

  </strong>

  ${game.i18n.localize(
  "SDP.WeaponDice"
)}: ${game.i18n.localize(
  "SDP.Max"
)}
</p>

<p>

  <strong>

    ${game.i18n.localize(
      "SDP.OtherDamage"
    )}:

  </strong>

  ${SB ? `${SB} (${game.i18n.localize(
  "SDP.StrengthBonusShort"
)})` : ""}
  ${SB && baseWeapon ? " + " : ""}
  ${baseWeapon ? `${baseWeapon} (${game.i18n.localize(
  "SDP.Base"
)})` : ""}

</p>
    `
  });

} else {

  // cas sans sign → pas de roll du tout
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({actor}),
    content: `
      <h3>
  ${game.i18n.localize(
    "SDP.DamageRollBrutalStrike"
  )}
</h3>

<p>
  ${game.i18n.localize(
    "SDP.Attacker"
  )}: ${actor.name}
</p>

<p>
  ${game.i18n.localize(
    "SDP.Weapon"
  )}: ${weapon.name}
</p>
      <p>

  <strong>

    ${game.i18n.localize(
      "SDP.WeaponDice"
    )}: MAX

  </strong>

</p>

<p>

  <strong>

    ${game.i18n.localize(
      "SDP.TotalDamage"
    )}: ${damage}

  </strong>

</p>
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
    ui.notifications.warn(
  game.i18n.localize(
    "SDP.Warning.SelectTarget"
  )
);
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
      ui.notifications.warn(
  game.i18n.localize(
    "SDP.Warning.SelectTargetBeforeDamage"
  )
);
      return;
    }

  }

}

    ChatMessage.create({
      content: `
            <div class="damage-card"
            data-location-profile="${card.dataset.locationProfile || "humanoid"}"
           data-traits='${card.dataset.traits || "[]"}'>
      <h3>
  ${game.i18n.localize(
    "SDP.DamageResolution"
  )}
</h3>
<p>
  ${game.i18n.localize(
    "SDP.Location"
  )}:
${getHitLocationLabel(
  card.dataset.locationProfile || "humanoid",
  location
)}
</p>
</p>
      <p>
  ${game.i18n.localize(
    "SDP.RawDamage"
  )}: ${damage}
</p>

<p>
  ${game.i18n.localize(
    "SDP.Armor"
  )}: ${armor}
</p>

<p>
  ${game.i18n.localize(
    "SDP.FinalDamage"
  )}: ${finalDamage}
</p>
      <button class="apply-damage"
        data-target="${card.classList.contains("sdp-spell") ? "" : targetId}"
        data-damage="${finalDamage}"
        data-location="${location}"
        data-critical="${critical}">
        ${game.i18n.localize(
  "SDP.ApplyDamage"
)}
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
    content: `<p><strong>${game.i18n.format(
  "SDP.ArmorBreaksFragility",
  {
    armor: armor.name
  }
)}</strong></p>`
  });

  break;
}
  }
}

// 🔥 SPELL = prend les targets actuelles
if (!targetId) {

  const targets = Array.from(game.user.targets);

  if (!targets.length) {
    ui.notifications.warn(
  game.i18n.localize(
    "SDP.Warning.SelectTargetBeforeDamage"
  )
);
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
            <h4>
  ${game.i18n.localize(
    "SDP.ArmorDamaged"
  )}
</h4>
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

const { finalDamage, armor, newHealth, current, severity } = result;

  ChatMessage.create({
    content: `
    <div class="sdp-damage-result">
      <h4>${token.actor.name}</h4>
      <p>
  ${game.i18n.localize(
    "SDP.Location"
  )}:
${getHitLocationLabel(
  "humanoid",
  location
)}
</p>
      <p>
  ${game.i18n.localize(
    "SDP.Damage"
  )}: ${damage}
</p>

<p>
  ${game.i18n.localize(
    "SDP.Armor"
  )}: ${armor}
</p>

<p>

  <strong>

    ${game.i18n.localize(
      "SDP.Final"
    )}: ${finalDamage}

  </strong>

</p>

<p>
  ${game.i18n.localize(
    "SDP.HP"
  )}: ${current} → ${newHealth}
</p>
      ${
  severity
    ? `
<p>

  <strong>

    ${game.i18n.localize(
  "SDP.InjurySeverity"
)}:
${game.i18n.localize(
  `SDP.Wound.${severity.charAt(0).toUpperCase() + severity.slice(1)}`
)}

  </strong>

</p>
`
    : ""
}
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
            <h4>
  ${game.i18n.localize(
    "SDP.ArmorDamaged"
  )}
</h4>
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

const {
  newHealth,
  current,
  severity
} = result;

const severityKey =
  `SDP.Wound.${severity.charAt(0).toUpperCase() + severity.slice(1)}`;

console.log("SDP | SEVERITY DEBUG", {
  severity,
  severityKey,
  translated: game.i18n.localize(severityKey)
});


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

      <h3>
  ${game.i18n.localize(
    "SDP.InjurySustained"
  )}
</h3>

      <p>
  ${game.i18n.localize(
    "SDP.Location"
  )}:
${getHitLocationLabel(
  "humanoid",
  location
)}
</p>
      <p>
  ${game.i18n.localize(
    "SDP.Severity"
  )}:
  ${game.i18n.localize(severityKey)}
</p>

      ${injury ? `
        <div class="injury-preview">
          <p><strong>${injury.name}</strong></p>
          <p>${injury.system.description || ""}</p>
        </div>
      ` : `
<p>
  ${game.i18n.localize(
    "SDP.NoInjuryFound"
  )}
</p>
`}

      <button class="apply-injury">${game.i18n.localize(
  "SDP.ApplyInjury"
)}</button>
      <button class="roll-resistance">${game.i18n.localize(
  "SDP.RollResistance"
)}</button>

    </div>
    `
  });

}

    const message = game.messages.get(
      button.closest(".message").dataset.messageId
    );

    await message.update({
  content: `
  <h3>
  ${game.i18n.localize(
    "SDP.DamageResolution"
  )}
</h3>

<p>
  ${game.i18n.localize(
    "SDP.Target"
  )}: ${actor.name}
</p>
  ${
    severity
      ? `
<p>

  <strong>

    ${game.i18n.localize(
  "SDP.InjurySeverity"
)}:
${game.i18n.localize(
  `SDP.Wound.${severity.charAt(0).toUpperCase() + severity.slice(1)}`
)}

  </strong>

</p>
`
      : ""
  }
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
    ui.notifications.warn(game.i18n.localize(
  "SDP.Warning.DieAlreadyRerolled"
));
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
  `
<strong>

  ${game.i18n.localize(
    "SDP.Total"
  )}: ${newTotal}

</strong>
`;
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
      ui.notifications.warn(
  game.i18n.localize(
    "SDP.Warning.SelectTarget"
  )
);
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
      <h3>
  ${game.i18n.localize(
    "SDP.DamageResolution"
  )}
</h3>

<p>
  ${game.i18n.localize(
    "SDP.Location"
  )}:
${getHitLocationLabel(
  card.dataset.locationProfile || "humanoid",
  location
)}
</p>

<p>
  ${game.i18n.localize(
    "SDP.RawDamage"
  )}: ${damage}
</p>

<p>
  ${game.i18n.localize(
    "SDP.Armor"
  )}: ${armor}
</p>

<p>
  ${game.i18n.localize(
    "SDP.FinalDamage"
  )}: ${finalDamage}
</p>

<button class="apply-damage"
  data-target="${targetId || ""}"
  data-damage="${finalDamage}"
  data-location="${location}">

  ${game.i18n.localize(
    "SDP.ApplyDamage"
  )}

</button>
    `,
    whisper: ChatMessage.getWhisperRecipients("GM")
  });

});

}