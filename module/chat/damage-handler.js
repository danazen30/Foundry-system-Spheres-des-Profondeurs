import { SdpDamage } from "../combat/damage.js";
import { getHitLocationLabel, resolveSpellHitLocation } from "../combat/hit-location.js";
import {
  getInjuryFromPack,
  buildInjuryKey,
  normalizeInjuryLocation
} from "../system/injury-utils.js";
import { SdpConditionEngine } from "../system/condition-engine.js";
import {
  resolveActorFromIds,
  resolveActorItem
} from "../system/actor-utils.js";
import {
  getActorItemDisplayName,
  getLocalizedItemDescription,
  getLocalizedItemName
} from "../system/item-localization.js";
import {
  combatRollMessageData,
  createCombatMessage,
  getCurrentRollMode,
  vis
} from "./combat-visibility.js";
import { SdpMount } from "../system/mount-utils.js";

function formatWoundSeverityKey(severity) {

  if (!severity) return "";

  return `SDP.Wound.${severity.charAt(0).toUpperCase() + severity.slice(1)}`;

}

/**
 * Human-readable lines for situational damage multipliers (size, head, charge…).
 */
function buildDamageModifierLines({
  actor,
  target = null,
  location = "",
  damageMultipliers = [],
  mountedCharge = false,
  counterCharge = false
} = {}) {

  const lines = [];

  const sizeKey = SdpDamage.resolveActorSize(actor);
  const sizeMult = Number(
    CONFIG.SDP.sizes?.[sizeKey]?.damageMultiplier || 1
  );

  if (sizeMult !== 1) {
    const sizeLabel = game.i18n.has(`SDP.Size${sizeKey.charAt(0).toUpperCase()}${sizeKey.slice(1)}`)
      ? game.i18n.localize(
          `SDP.Size${sizeKey.charAt(0).toUpperCase()}${sizeKey.slice(1)}`
        )
      : game.i18n.localize("SDP.Size");
    const pct = Math.round((sizeMult - 1) * 100);
    lines.push(
      `${sizeLabel}: ${pct >= 0 ? "+" : ""}${pct}%`
    );
  }

  if (location === "head" && target?.type !== "vehicle") {
    lines.push(
      `${game.i18n.localize("SDP.HitLocationHead")}: +50%`
    );
  }

  if (mountedCharge) {
    lines.push(
      `${game.i18n.localize("SDP.ChargeMounted")}: +50%`
    );
  }

  if (counterCharge) {
    lines.push(
      `${game.i18n.localize("SDP.CounterCharge")}: +100%`
    );
  }

  // Fallback if we have multipliers but no labeled line matched
  if (!lines.length && damageMultipliers?.some(m => Number(m) !== 1)) {
    let bonus = 0;
    for (const m of damageMultipliers) {
      const n = Number(m);
      if (Number.isFinite(n) && n !== 1) bonus += (n - 1);
    }
    if (bonus) {
      lines.push(
        `${game.i18n.localize("SDP.Modifiers")}: ${bonus >= 0 ? "+" : ""}${Math.round(bonus * 100)}%`
      );
    }
  }

  return lines;

}

/**
 * Shared summary under a damage roll (localized weapon + location + pre-armor damage).
 */
function buildDamageRollSummaryHtml({
  actor,
  weapon,
  target = null,
  location = "",
  locationProfile = "humanoid",
  damage,
  damageMultipliers = [],
  devastating = false,
  includeTotal = true
} = {}) {

  const dialogMods = game.sdp?.dialogModifiers || {};
  const weaponName = getActorItemDisplayName(weapon) || weapon?.name || "";
  const mountedCharge =
    !!dialogMods.mountedCharge
    || !!(dialogMods.charge && actor && SdpMount.isMounted(actor));
  const modifierLines = buildDamageModifierLines({
    actor,
    target,
    location,
    damageMultipliers,
    mountedCharge,
    counterCharge: !!dialogMods.counterCharge
  });

  const locationHtml = location
    ? `<p>
  ${game.i18n.localize("SDP.Location")}:
  ${getHitLocationLabel(locationProfile, location)}
</p>`
    : "";

  const modifiersHtml = modifierLines.length
    ? `<p class="sdp-damage-modifiers">
  <strong>${game.i18n.localize("SDP.Modifiers")}:</strong>
  ${modifierLines.join(" · ")}
</p>`
    : "";

  const devastatingHtml = devastating
    ? `<p><strong>${game.i18n.localize("SDP.WeaponTraitDevastating")}</strong></p>`
    : "";

  const totalHtml = includeTotal
    ? `<p class="damage-total">
  <strong>
    ${game.i18n.format("SDP.RawDamageLabel", { damage })}
  </strong>
</p>`
    : "";

  return `
<p>
  ${game.i18n.localize("SDP.Attacker")}: ${actor?.name || ""}
</p>
<p>
  ${game.i18n.localize("SDP.Weapon")}: ${weaponName}
</p>
${locationHtml}
${devastatingHtml}
${modifiersHtml}
${totalHtml}
`;

}

function getInjuryPreviewHtml(injury, {
  location = "",
  severity = "",
  consequence = false
} = {}) {

  if (!injury) return "";

  const key =
    (typeof injury.system?.key === "string"
      ? injury.system.key.trim()
      : "")
    || buildInjuryKey(
      severity || injury.system?.severity,
      normalizeInjuryLocation(
        location || injury.system?.location
      ),
      consequence || injury.system?.consequence
    );

  const name =
    getLocalizedItemName("injury", key, "")
    || getActorItemDisplayName(injury)
    || injury.name
    || "";

  const description =
    getLocalizedItemDescription(
      "injury",
      key,
      injury.system?.description || ""
    );

  return `
        <div class="injury-preview">
          <p><strong>${name}</strong></p>
          <p>${description}</p>
        </div>
    `;

}

function resolveAttackerFromButton(button) {

  const card =
    button.closest(".damage-card")
    || button.closest(".sdp-attack")
    || button.closest(".sdp-spell")
    || button.closest(".sdp-ability");

  return resolveActorFromIds(
    button.dataset.attacker
      || card?.dataset?.attacker
      || card?.dataset?.actor
      || "",
    button.dataset.token
      || card?.dataset?.token
      || ""
  );

}

function getAttackerInjurySeverityBonus(attacker) {

  return Number(
    attacker?.system?.custom?.injurySeverityBonus || 0
  );

}

async function applyBleedingFromDamageCard(actor, button) {
  if (!actor || actor.type === "vehicle") return 0;

  const stacks = Number(button.dataset.bleeding || 0);
  if (stacks <= 0) return 0;

  await SdpConditionEngine.add(actor, "bleeding", stacks);
  return stacks;
}

export async function processRollDamageClick(card, button) {

if (!card || !button) {
  console.error("SDP | processRollDamageClick missing card/button");
  return;
}

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
    const tokenId = button.dataset.token || card.dataset.token;
    const defenseType = button.dataset.defenseType;
    const weaponId = card.dataset.weapon;
    const isSpellCard = card.classList.contains("sdp-spell");
    let targetId = card.dataset.target;

    const liveTargets = Array.from(game.user.targets);

    if (isSpellCard) {
      if (liveTargets.length === 1) {
        targetId = liveTargets[0].id;
      } else if (liveTargets.length > 1) {
        ui.notifications.warn(
          game.i18n.localize("SDP.Warning.SelectTarget")
        );
        return;
      } else {
        ui.notifications.warn(
          game.i18n.localize("SDP.Warning.SelectTargetBeforeDamage")
        );
        return;
      }
      card.dataset.target = targetId;
    } else if (!targetId) {
      if (liveTargets.length === 1) {
        targetId = liveTargets[0].id;
        card.dataset.target = targetId;
      }
    }

    const damageType = card.dataset.damagetype || "slashing";
    const critical = String(card.dataset.critical) === "true";

    const actor = resolveActorFromIds(actorId, tokenId);
    const weapon = resolveActorItem(actor, weaponId);
    const brutal = card.dataset.brutal === "true";

    if (!actor || !weapon) {
      console.error("SDP | rollDamage missing actor/weapon", {
        actorId,
        tokenId,
        weaponId,
        actor: actor?.name
      });
      ui.notifications.warn(
        game.i18n.localize("SDP.Warning.UnlinkedActorWeapon")
      );
      return;
    }

    let location = card.dataset.location;
    let locationProfile =
      card.dataset.locationProfile || "humanoid";

    if (isSpellCard) {
      const defenderActor =
        canvas.tokens.get(targetId)?.actor
        ?? game.actors.get(targetId)
        ?? null;

      locationProfile =
        defenderActor?.system?.hitLocationProfile
        || card.dataset.locationProfile
        || "humanoid";

      const mode =
        card.dataset.hitLocationMode
        || weapon.system?.hitLocationMode?.value
        || "random";

      const fixedLocation =
        card.dataset.fixedHitLocation
        || weapon.system?.fixedHitLocation?.value
        || "body";

      const hit = await resolveSpellHitLocation({
        mode,
        fixedLocation,
        profileKey: locationProfile
      });

      location = hit.location;
      card.dataset.location = location;
      card.dataset.locationProfile = locationProfile;
    }

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

    const ignoreArmor =
      card.dataset.ignoreArmor === "true"
      || button.dataset.ignoreArmor === "true"
      || weapon?.system?.ignoreArmor === true
      || weapon?.system?.ignoreArmor?.value === true;

const result = await SdpDamage.rollDamage({
  actor,
  weapon,
  target: targetId ? canvas.tokens.get(targetId).actor : null,
  location,
  critical,
  brutal,
  ammoId,
  damageType,
  defenseType,
  ignoreArmor
});

  const { roll, damage, damageAfterArmor, finalDamage, armor, armorBase, armorMultiplierReason, formula, devastating, weaponDetail, baseWeapon, SB, bleedingStacks = 0, bleedingThreshold = 0, rolledDiceFormula = "", damageMultipliers = [] } = result;

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

const traitsJson = JSON.stringify(weapon?.system?.traits || traits || []);
const targetActor = targetId ? canvas.tokens.get(targetId)?.actor : null;

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
     data-multipliers='${JSON.stringify(damageMultipliers)}'
     data-ignore-armor="${ignoreArmor}"
     data-attacker="${actorId}"
     data-target="${targetId}"
     data-location="${location}"
     data-location-profile="${card.dataset.locationProfile || "humanoid"}"
     data-damagetype="${damageType || ""}"
     data-weapon-dice="${rolledDiceFormula || ""}"
     data-traits='${traitsJson}'>

      <h3>
  ${game.i18n.localize(
    "SDP.DamageRollDevastating"
  )}
</h3>

${buildDamageRollSummaryHtml({
  actor,
  weapon,
  target: targetActor,
  location,
  locationProfile: card.dataset.locationProfile || "humanoid",
  damage,
  damageMultipliers,
  devastating: true,
  includeTotal: false
})}

      <div class="dice-container">
        ${diceHTML}
      </div>

      <p class="damage-total">
  <strong>
    ${game.i18n.format("SDP.RawDamageLabel", { damage })}
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

  const defenderTokenNormal = targetId ? canvas.tokens?.get(targetId) : null;
  const defenderActorNormal = defenderTokenNormal?.actor
    ?? (targetId ? game.actors.get(targetId) : null);

  const damageRollMsg = combatRollMessageData({
    speaker: ChatMessage.getSpeaker({actor}),
    content: "",
    attackerActor: actor,
    defenderActor: defenderActorNormal,
    rollMode: getCurrentRollMode(),
    stage: "damage-roll",
    audience: "attacker"
  });
  delete damageRollMsg.content;

  roll.toMessage({
    ...damageRollMsg,
    flavor: `
    <div class="sdp-damage-roll-summary">
    <h3>
  ${game.i18n.localize(
    "SDP.DamageRoll"
  )}
</h3>

${buildDamageRollSummaryHtml({
  actor,
  weapon,
  target: defenderActorNormal,
  location,
  locationProfile: card.dataset.locationProfile || "humanoid",
  damage,
  damageMultipliers,
  devastating
})}
    </div>
    `
  });

}
    
    else {

  if (roll) {

  const brutalTarget = targetId ? canvas.tokens.get(targetId)?.actor : null;

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
      "SDP.WeaponDice"
    )}:

  </strong>

  ${game.i18n.localize(
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

${buildDamageRollSummaryHtml({
  actor,
  weapon,
  target: brutalTarget,
  location,
  locationProfile: card.dataset.locationProfile || "humanoid",
  damage,
  damageMultipliers,
  devastating
})}
    `
  });

} else {

  // cas sans sign → pas de roll du tout
  const brutalTargetNoSign = targetId ? canvas.tokens.get(targetId)?.actor : null;

  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({actor}),
    content: `
      <h3>
  ${game.i18n.localize(
    "SDP.DamageRollBrutalStrike"
  )}
</h3>

      <p>

  <strong>

    ${game.i18n.localize(
      "SDP.WeaponDice"
    )}: MAX

  </strong>

</p>

${buildDamageRollSummaryHtml({
  actor,
  weapon,
  target: brutalTargetNoSign,
  location,
  locationProfile: card.dataset.locationProfile || "humanoid",
  damage,
  damageMultipliers,
  devastating
})}
    `
  });

}

}

    // =========================
// TARGET HANDLING
// =========================

let targets = [];

if (card.classList.contains("sdp-spell") || card.classList.contains("sdp-ability")) {

  // 🔥 SPELL / ABILITY = MULTI TARGET
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

    const armorLabel = armorMultiplierReason === "inoffensive"
      ? `${armorBase} ×2 (${game.i18n.localize("SDP.WeaponTraitInoffensive")}) = ${armor}`
      : `${armor}`;

    const bleedingLine = bleedingStacks > 0
      ? `<p ${vis("defender", "gm")}><strong>${game.i18n.format("SDP.BleedingPending", {
          stacks: bleedingStacks,
          threshold: bleedingThreshold
        })}</strong></p>`
      : "";

    const attackerActor = resolveActorFromIds(actorId, null);
    const defenderToken = targetId ? canvas.tokens?.get(targetId) : null;
    const defenderActor = defenderToken?.actor
      ?? (targetId ? game.actors.get(targetId) : null);
    const rollMode = getCurrentRollMode();

    await createCombatMessage({
      content: `
            <div class="damage-card"
            data-attacker="${actorId}"
            data-location-profile="${card.dataset.locationProfile || "humanoid"}"
           data-traits='${card.dataset.traits || "[]"}'>
      <h3>
  ${game.i18n.localize(
    "SDP.DamageResolution"
  )}
</h3>
<p ${vis("attacker", "defender", "gm")}>
  ${game.i18n.localize(
    "SDP.Location"
  )}:
${getHitLocationLabel(
  card.dataset.locationProfile || "humanoid",
  location
)}
</p>
      <p ${vis("attacker", "gm")}>
  ${game.i18n.localize(
    "SDP.RawDamage"
  )}: ${damage}
</p>

<p ${vis("gm")}>
  ${game.i18n.localize(
    "SDP.Armor"
  )}: ${armorLabel}
</p>

<p ${vis("defender", "gm")}>
  ${game.i18n.localize(
    "SDP.FinalDamage"
  )}: ${finalDamage}
</p>
${bleedingLine}
      <button class="apply-damage"
        ${vis("attacker", "gm")}
        data-attacker="${actorId}"
        data-target="${(card.classList.contains("sdp-spell") || card.classList.contains("sdp-ability")) ? "" : targetId}"
        data-damage="${damageAfterArmor ?? finalDamage}"
        data-location="${location}"
        data-damagetype="${damageType || ""}"
        data-critical="${critical}"
        data-bleeding="${bleedingStacks}">
        ${game.i18n.localize(
  "SDP.ApplyDamage"
)}
      </button>
      </div>
      `,
      attackerActor,
      defenderActor,
      rollMode,
      stage: "damage-resolution",
      audience: "defender"
    });

}

export function registerDamageHandlers(html, message) {

  // ===================
  // DAMAGE ROLL
  // ===================

  html.find(".sdp-attack .roll-damage, .sdp-spell .roll-damage, .sdp-ability .roll-damage").click(async ev => {
    const card = ev.currentTarget.closest(".sdp-attack, .sdp-spell, .sdp-ability");
    const button = ev.currentTarget;
    await processRollDamageClick(card, button);
  });

  // =========================
  // APPLY DAMAGE
  // =========================

  html.find(".apply-damage").click(async ev => {

    const button = ev.currentTarget;
        const damage = Number(button.dataset.damage);
    const location = button.dataset.location;
        let targetId = button.dataset.target;
    const damageType = button.dataset.damagetype || null;
    const attacker = resolveAttackerFromButton(button);
    const severitySteps = getAttackerInjurySeverityBonus(attacker);

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

    const damageCard = button.closest(".damage-card");
    let loopTraits = [];
    try {
      loopTraits = JSON.parse(
        button.dataset.traits
        || damageCard?.dataset?.traits
        || "[]"
      );
    } catch (e) {
      loopTraits = [];
    }
    const hasTailleLoop = loopTraits.some(t => t?.key === "size");

    if (hasTailleLoop) {

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
      location,
      severitySteps,
      damageType
    });

    const {
      finalDamage,
      armor,
      newHealth,
      current,
      severity,
      criticalWounds,
      criticalWoundsMax,
      addedCritical,
      outOfService,
      destroyed
    } = result;
    const bleedingStacks = await applyBleedingFromDamageCard(token.actor, button);

    const attackerActor = resolveActorFromIds(button.dataset.attacker, null);
    const rollMode = getCurrentRollMode();
    const locationProfile =
      button.closest(".damage-card")?.dataset?.locationProfile || "humanoid";

    await createCombatMessage({
      content: `
    <div class="sdp-damage-result">
      <h4 ${vis("defender", "gm")}>${token.actor.name}</h4>
      <p ${vis("attacker", "defender", "gm")}>
  ${game.i18n.localize(
    "SDP.Location"
  )}:
${getHitLocationLabel(
  locationProfile,
  location
)}
</p>
      <p ${vis("attacker", "gm")}>
  ${game.i18n.localize(
    "SDP.Damage"
  )}: ${damage}
</p>

${armor
  ? `<p ${vis("gm")}>
  ${game.i18n.localize(
    "SDP.Armor"
  )}: ${armor}
</p>`
  : ""}

<p ${vis("defender", "gm")}>

  <strong>

    ${game.i18n.localize(
      "SDP.Final"
    )}: ${finalDamage}

  </strong>

</p>

<p ${vis("defender", "gm")}>
  ${game.i18n.localize(
    "SDP.HP"
  )}: ${current} → ${newHealth}
</p>
${bleedingStacks > 0
  ? `<p ${vis("defender", "gm")}><strong>${game.i18n.format("SDP.BleedingApplied", {
      stacks: bleedingStacks
    })}</strong></p>`
  : ""}
      ${
  severity
    ? `
<p ${vis("defender", "gm")}>

  <strong>

    ${game.i18n.localize(
  "SDP.InjurySeverity"
)}:
${game.i18n.localize(
  formatWoundSeverityKey(severity)
)}

  </strong>

</p>
`
    : ""
}
    </div>
    `,
      attackerActor,
      defenderActor: token.actor,
      rollMode,
      stage: "damage-applied",
      audience: "defender"
    });

    const actor = token.actor;

    if (actor.type === "vehicle") {

      const severityKey = formatWoundSeverityKey(severity);
      const crits = Number(
        criticalWounds ?? actor.system.criticalWounds?.value ?? 0
      );
      const critMax = Number(
        criticalWoundsMax ?? actor.system.criticalWounds?.max ?? 3
      );

      let vehicleExtra = "";

      if (addedCritical) {
        vehicleExtra += `
      <p><strong>${game.i18n.format(
        "SDP.VehicleCriticalWoundGained",
        { current: crits, max: critMax }
      )}</strong></p>
    `;
      }

      if (destroyed) {
        vehicleExtra += `
      <p><strong>${game.i18n.localize(
        "SDP.VehicleDestroyed"
      )}</strong></p>
    `;
      } else if (outOfService) {
        vehicleExtra += `
      <p><strong>${game.i18n.localize(
        "SDP.VehicleOutOfService"
      )}</strong></p>
    `;
      }

      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        whisper: ChatMessage.getWhisperRecipients("GM"),
        content: `
      <div class="sdp-injury-card" data-actor="${actor.id}">
        <h3>${game.i18n.localize("SDP.VehicleDamage")}</h3>
        <p>
          ${game.i18n.localize("SDP.Severity")}:
          ${severity
            ? game.i18n.localize(severityKey)
            : game.i18n.localize("SDP.None")}
        </p>
        <p>
          ${game.i18n.localize("SDP.VehicleCriticalWounds")}:
          ${crits} / ${critMax}
        </p>
        ${vehicleExtra}
      </div>
    `
      });

    } else if (severity) {

      const severityKey = formatWoundSeverityKey(severity);
      const injury = await getInjuryFromPack(location, severity);

      await createCombatMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
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
  locationProfile,
  location
)}
</p>
      <p>
  ${game.i18n.localize(
    "SDP.Severity"
  )}:
  ${game.i18n.localize(severityKey)}
</p>

      ${injury ? getInjuryPreviewHtml(injury, { location, severity }) : `
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
    `,
        attackerActor,
        defenderActor: actor,
        rollMode,
        stage: "injury",
        audience: "defender"
      });

    }

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
  location,
  severitySteps,
  damageType
});

const {
  newHealth,
  current,
  severity,
  criticalWounds,
  criticalWoundsMax,
  addedCritical,
  outOfService,
  destroyed
} = result;

const bleedingStacks = await applyBleedingFromDamageCard(actor, button);

if (actor.type === "vehicle") {

  const severityKey = formatWoundSeverityKey(severity);
  const crits = Number(
    criticalWounds ?? actor.system.criticalWounds?.value ?? 0
  );
  const critMax = Number(
    criticalWoundsMax ?? actor.system.criticalWounds?.max ?? 3
  );

  let vehicleExtra = "";

  if (addedCritical) {
    vehicleExtra += `
      <p><strong>${game.i18n.format(
        "SDP.VehicleCriticalWoundGained",
        { current: crits, max: critMax }
      )}</strong></p>
    `;
  }

  if (destroyed) {
    vehicleExtra += `
      <p><strong>${game.i18n.localize(
        "SDP.VehicleDestroyed"
      )}</strong></p>
    `;
  } else if (outOfService) {
    vehicleExtra += `
      <p><strong>${game.i18n.localize(
        "SDP.VehicleOutOfService"
      )}</strong></p>
    `;
  }

  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: ChatMessage.getWhisperRecipients("GM"),
    content: `
      <div class="sdp-injury-card" data-actor="${actor.id}">
        <h3>${game.i18n.localize("SDP.VehicleDamage")}</h3>
        <p>
          ${game.i18n.localize("SDP.Severity")}:
          ${severity
            ? game.i18n.localize(severityKey)
            : game.i18n.localize("SDP.None")}
        </p>
        <p>
          ${game.i18n.localize("SDP.VehicleCriticalWounds")}:
          ${crits} / ${critMax}
        </p>
        ${vehicleExtra}
      </div>
    `
  });

} else if (severity) {

  const severityKey =
    formatWoundSeverityKey(severity);

  console.log("SDP | SEVERITY DEBUG", {
    severity,
    severityKey,
    translated: game.i18n.localize(severityKey)
  });

  const injury =
    await getInjuryFromPack(
      location,
      severity
    );

  const attackerActor = resolveActorFromIds(button.dataset.attacker, null);

  await createCombatMessage({
    speaker: ChatMessage.getSpeaker({actor}),
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

      ${injury ? getInjuryPreviewHtml(injury, { location, severity }) : `
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
    `,
    attackerActor,
    defenderActor: actor,
    rollMode: getCurrentRollMode(),
    stage: "injury",
    audience: "defender"
  });

}

    const message = game.messages.get(
      button.closest(".message").dataset.messageId
    );

    await message.update({
  content: `
  <div class="damage-card">
  <h3>
  ${game.i18n.localize(
    "SDP.DamageResolution"
  )}
</h3>

<p ${vis("attacker", "defender", "gm")}>
  ${game.i18n.localize(
    "SDP.Target"
  )}: ${actor.name}
</p>
  ${
    severity
      ? `
<p ${vis("defender", "gm")}>

  <strong>

    ${game.i18n.localize(
  "SDP.InjurySeverity"
)}:
${game.i18n.localize(
  formatWoundSeverityKey(severity)
)}

  </strong>

</p>
`
      : ""
  }
  <p ${vis("defender", "gm")}><strong>${current} → ${newHealth}</strong></p>
  ${
    bleedingStacks > 0
      ? `<p ${vis("defender", "gm")}><strong>${game.i18n.format("SDP.BleedingApplied", {
          stacks: bleedingStacks
        })}</strong></p>`
      : ""
  }
  <p ${vis("attacker", "gm")}><em>${game.i18n.localize("SDP.DamageApplied")}</em></p>
  </div>
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

// base = tout ce qui n'est PAS les dés (avant multiplicateurs taille / tête / etc.)
const base = originalTotal - originalDiceTotal;

// nouveau total brut, puis réapplication des multiplicateurs (ex. Énorme ×2)
let multipliers = [];
try {
  multipliers = JSON.parse(card.dataset.multipliers || "[]");
} catch (e) {
  console.error("Invalid multipliers JSON", card.dataset.multipliers);
}

const newTotal = SdpDamage.applyAdditiveDamageMultipliers(
  base + diceTotal,
  multipliers
);

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

  ${game.i18n.format(
    "SDP.RawDamageLabel",
    { damage: newTotal }
  )}

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
  const damageType = card.dataset.damagetype || null;
  const ignoreArmor = card.dataset.ignoreArmor === "true";

  if (targets.length && !ignoreArmor) {
    armor = SdpDamage.getArmorValue(
      targets[0].actor,
      location,
      damageType
    );
  }

  const damageAfterArmor = Math.max(damage - armor, 0);

  const finalDamage = targets.length
    ? SdpDamage.resolveIncomingDamage(
      damageAfterArmor,
      targets[0].actor,
      damageType
    )
    : damageAfterArmor;

  let traits = [];
  try {
    traits = JSON.parse(card.dataset.traits || "[]");
  } catch (e) {
    traits = [];
  }

  let dice = [];
  try {
    dice = JSON.parse(card.dataset.dice || "[]");
  } catch (e) {
    dice = [];
  }

  const weaponDiceFormula = card.dataset.weaponDice || "";
  const neededFaces = [];
  const formulaMatches = String(weaponDiceFormula).match(/(\d+)d(\d+)/gi) || [];
  for (const match of formulaMatches) {
    const parts = match.match(/(\d+)d(\d+)/i);
    if (!parts) continue;
    const count = Number(parts[1]);
    const faces = Number(parts[2]);
    for (let i = 0; i < count; i++) neededFaces.push(faces);
  }

  const remaining = [...neededFaces];
  const weaponDieResults = [];
  for (const die of dice) {
    const faces = Number(die.faces);
    const idx = remaining.indexOf(faces);
    if (idx === -1) continue;
    remaining.splice(idx, 1);
    weaponDieResults.push(Number(die.result));
  }

  const bleeding = SdpDamage.countBleedingStacks(
    traits,
    weaponDieResults.length ? weaponDieResults : dice.map((d) => Number(d.result))
  );

  const bleedingLine = bleeding.stacks > 0
    ? `<p><strong>${game.i18n.format("SDP.BleedingPending", {
        stacks: bleeding.stacks,
        threshold: bleeding.threshold
      })}</strong></p>`
    : "";

  const attackerActor = resolveActorFromIds(card.dataset.attacker, null);
  const defenderToken = targetId ? canvas.tokens?.get(targetId) : null;
  const defenderActor = defenderToken?.actor
    ?? (targetId ? game.actors.get(targetId) : null);

  await createCombatMessage({
    content: `
      <div class="damage-card"
        data-attacker="${card.dataset.attacker || ""}"
        data-location-profile="${card.dataset.locationProfile || "humanoid"}">
      <h3>
  ${game.i18n.localize(
    "SDP.DamageResolution"
  )}
</h3>

<p ${vis("attacker", "defender", "gm")}>
  ${game.i18n.localize(
    "SDP.Location"
  )}:
${getHitLocationLabel(
  card.dataset.locationProfile || "humanoid",
  location
)}
</p>

<p ${vis("attacker", "gm")}>
  ${game.i18n.localize(
    "SDP.RawDamage"
  )}: ${damage}
</p>

<p ${vis("gm")}>
  ${game.i18n.localize(
    "SDP.Armor"
  )}: ${armor}
</p>

<p ${vis("defender", "gm")}>
  ${game.i18n.localize(
    "SDP.FinalDamage"
  )}: ${finalDamage}
</p>
${bleeding.stacks > 0
  ? `<p ${vis("defender", "gm")}><strong>${game.i18n.format("SDP.BleedingPending", {
      stacks: bleeding.stacks,
      threshold: bleeding.threshold
    })}</strong></p>`
  : ""}

<button class="apply-damage"
  ${vis("attacker", "gm")}
  data-attacker="${card.dataset.attacker || ""}"
  data-target="${targetId || ""}"
  data-damage="${damageAfterArmor}"
  data-location="${location}"
  data-damagetype="${damageType || ""}"
  data-bleeding="${bleeding.stacks}">

  ${game.i18n.localize(
    "SDP.ApplyDamage"
  )}

</button>
</div>
    `,
    attackerActor,
    defenderActor,
    rollMode: getCurrentRollMode(),
    stage: "damage-resolution",
    audience: "defender"
  });

});

}