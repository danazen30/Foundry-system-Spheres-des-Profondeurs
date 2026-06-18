import { getHitLocationLabel } from "../combat/hit-location.js";
import { SdpSizeEngine } from "../system/size-engine.js";
import { findSdpRollTable } from "../system/roll-table-utils.js";

export function registerAttackHandlers(html, message) {

  //===================
  // APPLY DEFENSE
  //===================

  html.find(".sdp-attack .apply-defense").click(async ev => {

    const card = ev.currentTarget.closest(".sdp-attack");
    const traits = JSON.parse(card.dataset.traits || "[]");
    console.log("POINTUE DEBUG - ATTACK TRAITS", traits);

let hasEntangling = traits.some(t => t?.key === "entangling");

const attackScore = Number(card.dataset.attack);
const actorId = card.dataset.actor;
const weaponId = card.dataset.weapon;
const location = card.dataset.location;
const critical = card.dataset.critical;

const msg = game.messages.get(
  ev.currentTarget.closest(".message").dataset.messageId
);

// 🔥 NOUVEAU SYSTEME TARGET
const targets = Array.from(game.user.targets);

if (!targets.length) {
ui.notifications.warn(
  game.i18n.localize(
    "SDP.Warning.SelectTargetDefense"
  )
);
  return;
}

const token = targets[0];
const targetId = token.id;
const target = token.actor;

    // ======================
// DEFENSE WEAPON LOGIC
// ======================

const defenseWeapon = target.items.find(i =>
  i.type === "weapon" &&
  i.system.equipped &&
  i.system.isDefenseWeapon
);

let parry = target.system.derived.parry.value;

// ======================
// SIZE MODIFIER
// ======================

const attacker = game.actors.get(actorId);

if (attacker) {

  const sizeModifier =
    SdpSizeEngine.getParryModifier(
      target.system.size,
      attacker.system.size
    );

  parry += Math.floor(sizeModifier / 10);

  console.log("SDP | SIZE MODIFIER (DEFENSE)", {
    defender: target.name,
    attacker: attacker.name,
    modifier: sizeModifier,
    finalParry: parry
  });

}

if (defenseWeapon) {

  console.log("SDP | Defense weapon used", defenseWeapon.name);

  const weaponParry =
    defenseWeapon.system.parry || 0;

  parry += weaponParry;

}

if (hasEntangling) {

  parry -= 1;

  console.log(
    "SDP | Entangling applied: -1 Parry"
  );

}

    const evasion = target.system.derived.evasion.value;

    // ===== SIDESTEP CHECK =====
    const sidestepTalent = target.items.find(i =>
      i.type === "talent" &&
      (i.system.key || "").toLowerCase().trim() === "sidestep"
    );

    const hasSidestep = sidestepTalent && (sidestepTalent.system.advances || 0) > 0;

const weaponTraits = defenseWeapon?.system.traits || [];
console.log("DEFENSE WEAPON TRAITS", {
  weapon: defenseWeapon?.name,
  traits: weaponTraits
});

// shield classique
const hasShield = defenseWeapon &&
  defenseWeapon.system.weaponGroup === "shield";

// trap blade (NOUVEAU)
const hasTrapBlade = weaponTraits.some(t => {
  const key = (t.key || "")
    .replace(/([a-z])([A-Z])/g, "$1-$2") // camelCase → kebab-case
    .toLowerCase()
    .replace(/[\s_]/g, "-");

  return key === "trap-blade";
});

// fusion logique
const hasDefenseChoiceWeapon = hasShield || hasTrapBlade;

let canChoose = false;
let forcedChoice = null;

// ======================
// CREATURE DEFENSE MODE
// ======================

const defenseMode =
  target.system.combat?.defenseMode ||
  "auto";

console.log(
  "SDP | Defense mode",
  {
    actor: target.name,
    mode: defenseMode
  }
);

// ======================
// FORCED DEFENSE
// ======================

if (defenseMode === "evasion") {

  forcedChoice = "evasion";

}

else if (defenseMode === "parry") {

  forcedChoice = "parry";

}

// ======================
// AUTO MODE
// ======================

else {

// ======================
// SMART LOGIC (FINAL FIX)
// ======================

// CAS 1 — les deux → TOUJOURS choix
if (hasSidestep && hasDefenseChoiceWeapon) {
  canChoose = true;
}

// CAS 2 — sidestep dominant → AUTO EVASION
else if (hasSidestep && evasion >= parry) {
  forcedChoice = "evasion";
}

// CAS 3 — weapon défensif dominant → AUTO PARRY
else if (hasDefenseChoiceWeapon && parry >= evasion) {
  forcedChoice = "parry";
}

// CAS 4 — un seul des deux mais pas dominant → CHOIX
else if (hasSidestep || hasDefenseChoiceWeapon) {
  canChoose = true;
}

// CAS 5 — fallback
else {
  forcedChoice = parry >= evasion ? "parry" : "evasion";
}

}

console.log("SDP | Defense decision (FINAL)", {
  parry,
  evasion,
  hasSidestep,
  hasShield,
  hasTrapBlade,
  forcedChoice,
  canChoose
});
    // ===== CHOICE CARD =====
    if (canChoose) {

      await ChatMessage.create({
        content: `
        <div class="sdp-defense-choice"
             data-attack="${attackScore}"
             data-actor="${actorId}"
             data-weapon="${weaponId}"
             data-target=""
             data-location="${location}"
             data-critical="${critical}"
             data-brutal="${card.dataset.brutal}"
             data-attack-message-id="${msg.id}">

          <h3>
  ${target.name}
  ${game.i18n.localize(
    "SDP.ChoosesDefense"
  )}
</h3>

<p>
  ${game.i18n.localize("SDP.Parry")}
  : ${parry}
</p>

<p>
  ${game.i18n.localize("SDP.Evasion")}
  : ${evasion}
</p>

<button
  class="choose-defense"
  data-defense="parry">

  ${game.i18n.localize(
    "SDP.Parry"
  )}

</button>

<button
  class="choose-defense"
  data-defense="evasion">

  ${game.i18n.localize(
    "SDP.Evasion"
  )}

</button>

        </div>
        `
      });

      return;
    }

const selected = forcedChoice;

const defense = selected === "parry" ? parry : evasion;
const result = attackScore > defense ? "HIT" : "MISS";

// ======================
// CREATE DEFENSE CARD
// ======================

await ChatMessage.create({
  content: `
    <h3>
  ${game.i18n.localize(
    "SDP.DefenseResolution"
  )}
</h3>

<p>
  ${game.i18n.localize(
    "SDP.Target"
  )}: ${target.name}
</p>

<p>
  ${game.i18n.localize(
    "SDP.Parry"
  )}: ${parry}
</p>

<p>
  ${game.i18n.localize(
    "SDP.Evasion"
  )}: ${evasion}
</p>

<p>
  ${game.i18n.localize(
    "SDP.DefenseUsed"
  )}:
  ${game.i18n.localize(
    selected === "parry"
      ? "SDP.Parry"
      : "SDP.Evasion"
  )}
</p>

<p><strong>${result}</strong></p>
  `
});

// ======================
// UPDATE ATTACK CARD
// ======================

await updateAttackCard(msg.id, {
  defense,
  result,
  selected,
  actorId,
  weaponId,
  targetId
});

  });


  //===================
  // CHOOSE DEFENSE
  //===================

  html.find(".choose-defense").click(async ev => {

    const button = ev.currentTarget;
    const card = button.closest(".sdp-defense-choice");

    const attackMessage = game.messages.get(card.dataset.attackMessageId);
const attackCard = new DOMParser()
  .parseFromString(attackMessage.content, "text/html")
  .querySelector(".sdp-attack");

const traits = JSON.parse(attackCard.dataset.traits || []);
const hasEntangling = traits.some(t => t?.key === "entangling");

    if (!card) return;

    const selected = button.dataset.defense;

    const attackScore = Number(card.dataset.attack);
    const targets = Array.from(game.user.targets);

if (!targets.length) {

  ui.notifications.warn(
    game.i18n.localize(
      "SDP.Warning.SelectTargetDefense"
    )
  );

  return;
}

const token = targets[0];
const targetId = token.id;
const target = token.actor;

    const actorId = card.dataset.actor;
    const weaponId = card.dataset.weapon;

    const attackMessageId = card.dataset.attackMessageId;

    const msg = game.messages.get(
      ev.currentTarget.closest(".message").dataset.messageId
    );

    let parry = target.system.derived.parry.value;

// ======================
// SIZE MODIFIER
// ======================

const attacker = game.actors.get(actorId);

if (attacker) {

  const sizeModifier =
    SdpSizeEngine.getParryModifier(
      target.system.size,
      attacker.system.size
    );

  parry += Math.floor(sizeModifier / 10);

  console.log("SDP | SIZE MODIFIER (DEFENSE)", {
    defender: target.name,
    attacker: attacker.name,
    modifier: sizeModifier,
    finalParry: parry
  });

}

// defense weapon
const defenseWeapon = target.items.find(i =>
  i.type === "weapon" &&
  i.system.equipped &&
  i.system.isDefenseWeapon
);

if (defenseWeapon) {

  const weaponParry =
    defenseWeapon.system.parry || 0;

  parry += weaponParry;

}

// entangling à la fin
if (hasEntangling) {
  parry -= 1;
}
    const evasion = target.system.derived.evasion.value;
const defense = selected === "parry" ? parry : evasion;
const result = attackScore > defense ? "HIT" : "MISS";

    console.log("SDP | Defense selected", { selected, defense });

    // ===== UPDATE DEFENSE CARD =====
    await msg.update({
  content: `
    <h3>
  ${game.i18n.localize(
    "SDP.DefenseResolution"
  )}
</h3>

<p>
  ${game.i18n.localize(
    "SDP.Target"
  )}: ${target.name}
</p>

<p>
  ${game.i18n.localize(
    "SDP.Parry"
  )}: ${parry}
</p>

<p>
  ${game.i18n.localize(
    "SDP.Evasion"
  )}: ${evasion}
</p>

<p>
  ${game.i18n.localize(
    "SDP.DefenseUsed"
  )}:
  ${game.i18n.localize(
    selected === "parry"
      ? "SDP.Parry"
      : "SDP.Evasion"
  )}
</p>

<p>
  <strong>
    ${game.i18n.localize(
      result === "HIT"
        ? "SDP.Hit"
        : "SDP.Miss"
    )}
  </strong>
</p>
  `
});

    // ===== UPDATE ATTACK CARD =====
    await updateAttackCard(attackMessageId, {
      defense,
      result,
      selected,
      actorId,
      weaponId,
      targetId
    });

  });

//===================
// CRITICAL FAILURE
//===================

html.find(".roll-critical-failure").click(async ev => {

  const tableKey = ev.currentTarget.dataset.table;

 if (!tableKey) {

  ui.notifications.warn(
    game.i18n.localize(
      "SDP.Warning.MissingCriticalTable"
    )
  );

  return;
}

  // =========================
  // TABLE NAME
  // =========================

let tableConfig = null;

switch (tableKey) {

  case "critical-attack-failure":

    tableConfig =
      CONFIG.SDP.rollTables
        .criticalAttackFailure;

    break;

}

  if (!tableConfig) {
    ui.notifications.warn(
  game.i18n.localize(
    "SDP.Warning.CriticalTableNotConfigured"
  )
);
    return;
  }

  // =========================
  // FIND TABLE
  // =========================

  const localizedTableName =
  game.i18n.localize(
    tableConfig.label
  );

const pack =
  game.packs.get(
    "sdp.rolltables"
  );

const table =
  await findSdpRollTable(
    pack,
    tableKey
  );

  if (!table) {

    ui.notifications.warn(

  game.i18n.format(
    "SDP.Warning.TableNotFound",
    {
      table: localizedTableName
    }
  )

);

    return;
  }

  // =========================
  // ROLL TABLE
  // =========================

  await table.draw();

});

//===================
// RELOAD CRITICAL
//===================

html.on("click", ".roll-reload-critical", async ev => {

  await ChatMessage.create({

    speaker: ChatMessage.getSpeaker(),

    content: `
  <div class="sdp-reload-critical">

    <h3>
      ${game.i18n.localize(
        "SDP.ReloadMalfunction"
      )}
    </h3>

    <p>
      ${game.i18n.localize(
        "SDP.ReloadMalfunctionText1"
      )}
    </p>

    <p>
      ${game.i18n.localize(
        "SDP.ReloadMalfunctionText2"
      )}
    </p>

  </div>
`
  });

});

}

//===================
// UPDATE ATTACK CARD (PATCH STYLE)
//===================

async function updateAttackCard(messageId, { defense, result, selected, actorId, weaponId, targetId }) {

  const actor = game.actors.get(actorId);
const weapon = actor?.items.get(weaponId);

const weaponTraits = weapon?.system?.traits || [];

const hasEntangling = weaponTraits.some(t => {
  const key = (t.key || "")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[\s_]/g, "-");

  return key === "entangling";
});


if (result === "HIT" && hasEntangling) {

  const token = canvas.tokens.get(targetId);
  const target = token?.actor;

  if (target) {

    const current = target.system.conditions?.entangled || false;

    await target.update({
      "system.conditions.entangled": true
    });

    console.log("SDP | Entangled applied", {
      target: target.name,
      previous: current
    });

  }
}

  const attackMessage = game.messages.get(messageId);
  if (!attackMessage) return;

  const parser = new DOMParser();
  const doc = parser.parseFromString(attackMessage.content, "text/html");

  const card = doc.querySelector(".sdp-attack");
const traits = card.dataset.traits;
// =========================
// SHIELD DAMAGE (TAILLE)
// =========================

const attackTraits = JSON.parse(card.dataset.traits || "[]");

const hasTaille = attackTraits.some(t => t?.key === "size");

if (hasTaille && selected === "parry" && targetId) {

  const token = canvas.tokens.get(targetId);
  const target = token?.actor;

  if (target) {

    const shield = target.items.find(i =>
      i.type === "weapon" &&
      i.system.equipped &&
      i.system.isDefenseWeapon &&
      i.system.weaponGroup === "shield"
    );

    if (shield) {

      const current = shield.system.durability?.value ?? 0;
      const newValue = Math.max(current - 1, 0);

      await shield.update({
        "system.durability.value": newValue
      });

      ChatMessage.create({
  content: `
    <div class="sdp-armor-damage">
      <h4>
  ${game.i18n.localize(
    "SDP.ShieldDamaged"
  )}
</h4>
      <p>${shield.name} : ${current} → ${newValue}</p>
    </div>
  `
});

      console.log("SDP | SHIELD DAMAGED (TAILLE)", {
        shield: shield.name,
        before: current,
        after: newValue
      });

    }

  }
}

  if (!card) return;

  // remove old buttons
  card.querySelector(".edit-attack")?.remove();
  card.querySelector(".apply-defense")?.remove();

  // add result
  const resultBlock = document.createElement("div");
  resultBlock.innerHTML = `

  <p>

    ${game.i18n.localize(
      "SDP.DefenseUsed"
    )}:

    ${game.i18n.localize(
      selected === "parry"
        ? "SDP.Parry"
        : "SDP.Evasion"
    )}

  </p>

  <p>

    <strong>

      ${game.i18n.localize(
        result === "HIT"
          ? "SDP.Hit"
          : "SDP.Miss"
      )}

    </strong>

  </p>

`;
  card.appendChild(resultBlock);

  // add damage button
  if (result === "HIT") {
    const btn = document.createElement("button");
    btn.classList.add("roll-damage");
    btn.dataset.actor = actorId;
    btn.dataset.weapon = weaponId;
    btn.dataset.target = targetId;
    btn.dataset.defenseType = selected; // 🔥 IMPORTANT
    btn.dataset.traits = traits;
    btn.innerText =
  game.i18n.localize(
    "SDP.RollDamage"
  );

    card.appendChild(btn);
  }

  await attackMessage.update({
    content: card.outerHTML
  });
}