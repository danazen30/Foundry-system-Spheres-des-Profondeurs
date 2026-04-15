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

    const msg = game.messages.get(
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
     data-target="${targetId}"
     data-traits='${JSON.stringify(weapon.system.traits || [])}'>

      <h3>${actor.name} attacks with ${weapon.name}</h3>

      <button class="edit-attack">Edit</button>

      <p>Roll: ${roll}</p>
      <p>Attack Score: ${attackScore}</p>
      <p>Target: ${token.name}</p>
      <p>Location: ${CONFIG.SDP.hitLocations[location]}</p>

      <button class="apply-defense">Apply Defense</button>

    </div>
    `;

    await msg.update({ content: newHtml });

  });


  //===================
  // APPLY DEFENSE
  //===================

  html.find(".sdp-attack .apply-defense").click(async ev => {

    const card = ev.currentTarget.closest(".sdp-attack");
    const traits = JSON.parse(card.dataset.traits || "[]");
    console.log("POINTUE DEBUG - ATTACK TRAITS", traits);

let hasEntangling = traits.some(t => t?.key === "entangling");

    const attackScore = Number(card.dataset.attack);
    const targetId = card.dataset.target;
    const actorId = card.dataset.actor;
    const weaponId = card.dataset.weapon;
    const location = card.dataset.location;
    const critical = card.dataset.critical;

    const msg = game.messages.get(
      ev.currentTarget.closest(".message").dataset.messageId
    );

    const token = canvas.tokens.get(targetId);
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

if (defenseWeapon) {

  console.log("SDP | Defense weapon used", defenseWeapon.name);

  // 👉 exemple : base parry + weapon bonus
  const weaponParry = defenseWeapon.system.parry || 0;

parry += weaponParry;


if (hasEntangling) {
  parry -= 1;
  console.log("SDP | Entangling applied: -1 Parry");
}

}

    const evasion = target.system.derived.evasion.value;

    // ===== SIDESTEP CHECK =====
    const sidestepTalent = target.items.find(i =>
      i.type === "talent" &&
      i.name.toLowerCase().includes("sidestep")
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
             data-target="${targetId}"
             data-location="${location}"
             data-critical="${critical}"
             data-brutal="${card.dataset.brutal}"
             data-attack-message-id="${msg.id}">

          <h3>${target.name} chooses defense</h3>

          <p>Parry: ${parry}</p>
          <p>Evasion: ${evasion}</p>

          <button class="choose-defense" data-defense="parry">Parry</button>
          <button class="choose-defense" data-defense="evasion">Evasion</button>

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
    <h3>Defense Resolution</h3>

    <p>Target: ${target.name}</p>

    <p>Parry: ${parry}</p>
    <p>Evasion: ${evasion}</p>

    <p>Defense Used: ${selected.toUpperCase()}</p>

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
    const targetId = card.dataset.target;
    const actorId = card.dataset.actor;
    const weaponId = card.dataset.weapon;

    const attackMessageId = card.dataset.attackMessageId;

    const msg = game.messages.get(
      ev.currentTarget.closest(".message").dataset.messageId
    );

    const token = canvas.tokens.get(targetId);
    const target = token.actor;

    let parry = target.system.derived.parry.value;

// defense weapon
const defenseWeapon = target.items.find(i =>
  i.type === "weapon" &&
  i.system.equipped &&
  i.system.isDefenseWeapon
);

if (defenseWeapon) {
  const weaponParry = defenseWeapon.system.parry || 0;
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
    <h3>Defense Resolution</h3>

    <p>Target: ${target.name}</p>

    <p>Parry: ${parry}</p>
    <p>Evasion: ${evasion}</p>

    <p>Defense Used: ${selected.toUpperCase()}</p>

    <p><strong>${result}</strong></p>
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
  if (!card) return;

  // remove old buttons
  card.querySelector(".edit-attack")?.remove();
  card.querySelector(".apply-defense")?.remove();

  // add result
  const resultBlock = document.createElement("div");
  resultBlock.innerHTML = `
    <p>Defense Used: ${selected.toUpperCase()}</p>
    <p><strong>${result}</strong></p>
  `;
  card.appendChild(resultBlock);

  // add damage button
  if (result === "HIT") {
    const btn = document.createElement("button");
    btn.classList.add("roll-damage");
    btn.dataset.actor = actorId;
    btn.dataset.weapon = weaponId;
    btn.dataset.target = targetId;
    btn.innerText = "Roll Damage";

    card.appendChild(btn);
  }

  await attackMessage.update({
    content: card.outerHTML
  });
}