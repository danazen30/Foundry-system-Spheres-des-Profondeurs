import { SdpRoll } from "../rolls/roll.js";
import { rollHitLocation, getHitLocationProfile} from "./hit-location.js";
import { SdpTraitEngine } from "../system/trait-engine.js";
import { WEAPON_TRAITS } from "../system/config.js";
import { ITEM_TRAITS } from "../system/config.js";
import { SdpSizeEngine } from "../system/size-engine.js";

export class SdpAttack {

static async attackTest(actor, weapon, attackValue){

const dialogMods = game.sdp?.dialogModifiers || {};
const inspiration = dialogMods.inspiration || 0;
const useFinesse = dialogMods.finesse;
const hitProfileKey =
  dialogMods.hitLocationProfile ||
  actor.system.hitLocationProfile ||
  "humanoid";

const hitProfile =
  getHitLocationProfile(hitProfileKey);

  // ======================
// STUNNED CHECK
// ======================

const stunned = actor.system.conditions?.stunned || 0;

if(stunned > 0){

  ui.notifications.warn(
  game.i18n.format("SDP.StunnedCannotAttack", {
    actor: actor.name
  })
);
  return;

}

  const isRanged = weapon.system.category === "ranged";

const weaponTraitsBase = Array.isArray(weapon.system.traits)
  ? weapon.system.traits
  : [];

const itemTraitsBase = Array.isArray(weapon.system.itemTraits)
  ? weapon.system.itemTraits
  : [];

const allReloadTraits = [
  ...weaponTraitsBase,
  ...itemTraitsBase
];

const hasReload = allReloadTraits.some(t => {

  if (!t) return false;

  if (typeof t === "string") {
    return t.toLowerCase() === "reload";
  }

  if (typeof t === "object") {
    return (t.key || "").toLowerCase() === "reload";
  }

  return false;

});

const forceReload = weapon.system.forceReload;

console.log("SDP | RELOAD CHECK", {
  weapon: weapon.name,
  hasReload,
  forceReload,
  loaded: weapon.system.loaded
});

// =========================
// FORCE RELOAD
// considère l'arme comme chargée
// =========================

if (hasReload && forceReload) {

  console.log("SDP | FORCE RELOAD ACTIVE", {
    weapon: weapon.name
  });

  // force loaded
  if (!weapon.system.loaded) {

    await weapon.update({
      "system.loaded": true,
      "system.reloadProgress": 0
    });

    // IMPORTANT
    weapon.system.loaded = true;
  }

}
else if (hasReload && !weapon.system.loaded) {

  console.log("SDP | RELOAD REQUIRED", {
    weapon: weapon.name
  });

  return await this.reloadTest(actor, weapon);

}

const targets = Array.from(game.user.targets);
let targetId = targets.length ? targets[0].id : null;

let conditionText = "";
let bonus = 0;



  let hitLocation;

if (dialogMods.location) {

  hitLocation = {
    location: dialogMods.location,
    roll: { total: "manual" }
  };

  } else {

  hitLocation = await rollHitLocation(hitProfileKey);

}

  // ======================
  // RANGED ATTACK
  // ======================

  if(isRanged){

    // =========================
// AMMO
// =========================

let ammo = null;

if (weapon.system.currentAmmo) {
  ammo = actor.items.get(weapon.system.currentAmmo);

  if (!ammo) {
    ui.notifications.warn(
  game.i18n.localize("SDP.InvalidAmmunitionSelected")
);
    return;
  }
} else if (weapon.system.consumesAmmo) {
  ui.notifications.warn(
  game.i18n.localize("SDP.NoAmmunitionSelected")
);
  return;
}

console.log("SDP | Ammo used", {
  weapon: weapon.name,
  ammo: ammo?.name
});

const base = actor._getBestWeaponSkill(weapon);

// =========================
// RANGE CALCULATION
// =========================

let rangeModifier = 0;
let rangeLabel =
  game.i18n.localize("SDP.Unknown");
let measuredDistance = 0;

const targetToken = targets[0];
const sourceToken = actor.getActiveTokens()[0];

if (sourceToken && targetToken) {

const path = [
  sourceToken.center,
  targetToken.center
];

measuredDistance = canvas.grid.measurePath(path).distance;

// =========================
// FINAL RANGE (WEAPON + AMMO)
// =========================

const baseRange =
  Number(weapon.system.range || 0);

let ammoRangeModifier = 0;

if (ammo) {
  ammoRangeModifier =
    Number(ammo.system.rangeModifier || 0);
}

const weaponRange = Math.max(
  0,
  baseRange + ammoRangeModifier
);

const bands = CONFIG.SDP.rangeBands;

  if (measuredDistance <= weaponRange * bands.pointBlank.multiplier) {

    rangeModifier = bands.pointBlank.modifier;
    rangeLabel = bands.pointBlank.label;

  } else if (measuredDistance <= weaponRange * bands.short.multiplier) {

    rangeModifier = bands.short.modifier;
    rangeLabel = bands.short.label;

  } else if (measuredDistance <= weaponRange * bands.normal.multiplier) {

    rangeModifier = bands.normal.modifier;
    rangeLabel = bands.normal.label;

  } else if (measuredDistance <= weaponRange * bands.long.multiplier) {

    rangeModifier = bands.long.modifier;
    rangeLabel = bands.long.label;

  } else if (measuredDistance <= weaponRange * bands.extreme.multiplier) {

    rangeModifier = bands.extreme.modifier;
    rangeLabel = bands.extreme.label;

  } else {

    ui.notifications.warn(
  game.i18n.localize("SDP.TargetOutOfRange")
);
    return;

  }

  console.log("SDP | RANGE BAND", {
    weapon: weapon.name,
    distance: measuredDistance,
    range: weaponRange,
    band: rangeLabel,
    modifier: rangeModifier
  });

}

// =========================
// TRAIT : IMPALING
// =========================

const weaponTraits = weapon.system.traits || [];
const itemTraits = weapon.system.itemTraits || [];

const allTraits = [...weaponTraits, ...itemTraits];

let ammoTraits = [];

if (ammo) {
  ammoTraits = ammo.system.traits || [];
}

const traits = [...weaponTraits, ...itemTraits, ...ammoTraits];

const normalizedTraits = traits
  .filter(t => t)
  .map(t => {
    if (typeof t === "string") return { key: t };
    return t;
  });

// =========================
// SPLIT TRAITS (IMPORTANT)
// =========================

const getTraitConfig = (key) =>
  WEAPON_TRAITS?.[key] || ITEM_TRAITS?.[key];

const positiveTraits = normalizedTraits.filter(t =>
  getTraitConfig(t.key)?.type === "positive"
);

const negativeTraits = normalizedTraits.filter(t =>
  getTraitConfig(t.key)?.type === "negative"
);

// =========================
// SKILL CHECK
// =========================

const weaponSkills = (weapon.system.skill || "")
  .split(",")
  .map(s => s.trim().toLowerCase());

const actorSkills = actor.items.filter(i => i.type === "skill");

let bestSkill = null;

for (const group of weaponSkills) {
  const skill = actorSkills.find(s =>
    (s.system.key || "").toLowerCase() === group ||
    (s.name || "").toLowerCase() === group
  );

  if (!skill) continue;

  if (!bestSkill || skill.system.value > bestSkill.system.value) {
    bestSkill = skill;
  }
}

const hasValidSkill = !!bestSkill;

// =========================
// FINAL TRAITS
// =========================

const activePositiveTraits = hasValidSkill ? positiveTraits : [];
const finalTraits = [...activePositiveTraits, ...negativeTraits];

// =========================
// TRAITS DISPLAY
// =========================

const displayTraits = [
  ...activePositiveTraits.map(t => {

    const labelKey =
      getTraitConfig(t.key)?.label || t.key;

    return {
      ...t,
      label: game.i18n.localize(labelKey),
      type: "positive"
    };

  }),

  ...negativeTraits.map(t => {

    const labelKey =
      getTraitConfig(t.key)?.label || t.key;

    return {
      ...t,
      label: game.i18n.localize(labelKey),
      type: "negative"
    };

  })
];

const traitsHTML = displayTraits.map(t => {
  return `<span class="trait-tag"
    data-trait="${t.key}"
    data-value="${t.value || ""}">
    ${t.label}${t.value ? ` (${t.value})` : ""}
  </span>`;
}).join("");

// =========================
// TRAIT : FAST
// =========================

let fastBonus = 0;

if (finalTraits.some(t => t.key === "fast")) {
  fastBonus = 10;
}

let locationMod = 0;

if (dialogMods.location) {

  locationMod =
    hitProfile.locations?.[hitLocation.location]?.modifier || 0;

}

const dynamicModifierTotal =
  (dialogMods.dynamicModifiers || [])
    .reduce((acc, m) => {
      return acc + Number(m.value || 0);
    }, 0);

let targetValue =
  base +
  (dialogMods.totalMod || 0) +
  (dialogMods.conditionMod || 0) +
  dynamicModifierTotal +
  locationMod;

  // =========================
// OFFHAND (RANGED)
// =========================

if (weapon.system.offhand) {

  const reduction = actor.system.custom.offhandReduction || 0;

  const OFFHAND_PENALTY = 20;

  const penalty = Math.max(0, OFFHAND_PENALTY - reduction);

  targetValue -= penalty;

  console.log("SDP | OFFHAND RANGED", {
    penalty,
    reduction,
    finalTarget: targetValue
  });

}

// 🔥 juste pour affichage
let source =
  game.i18n.localize("SDP.RangedAbility");

if (bestSkill) {
  source = bestSkill.name;
}
    const roll = await (new Roll("1d100")).roll();

    const result = roll.total;

    // =========================
// AMMO / WEAPON CONSUMPTION (ON ROLL)
// =========================

if (weapon.system.category === "ranged") {

  console.log("SDP | CONSUMPTION ON ATTACK ROLL", {
    weapon: weapon.name,
    consumesAmmo: weapon.system.consumesAmmo,
    ammo: ammo?.name
  });

  // =========================
  // NORMAL AMMO
  // =========================

  if (weapon.system.consumesAmmo) {

    if (ammo) {

      const current = ammo.system.quantity?.value ?? 0;

      // 🔥 SECURITE
      if (current <= 0) {

        ui.notifications.warn(
  game.i18n.format("SDP.AmmoEmpty", {
    ammo: ammo.name
  })
);
        return;

      }

      const newValue = Math.max(current - 1, 0);

      await ammo.update({
        "system.quantity.value": newValue
      });

      console.log("SDP | Ammo consumed on roll", {
        ammo: ammo.name,
        before: current,
        after: newValue
      });

    } else {

      ui.notifications.warn(
  game.i18n.localize("SDP.NoAmmunitionSelected")
);
      return;

    }

  }

  // =========================
  // THROWN WEAPON
  // =========================

  else {

    const current = weapon.system.quantity?.value ?? 0;

    if (current <= 0) {

      ui.notifications.warn(
  game.i18n.format("SDP.WeaponDepleted", {
    weapon: weapon.name
  })
);
      return;

    }

    const newValue = Math.max(current - 1, 0);

    await weapon.update({
      "system.quantity.value": newValue
    });

    console.log("SDP | Thrown weapon consumed on roll", {
      weapon: weapon.name,
      before: current,
      after: newValue
    });

  }

}

let critFailBase = 96;

// trait dangerous
if (finalTraits.some(t => t.key === "dangerous")) {
  critFailBase = 86;
}

    let success =
  result <= targetValue ||
  (targetValue <= 5 && result <= 5)

const crit = SdpRoll.getCritical(result, targetValue);

// 🔥 HARD OVERRIDE
if (result === 100) {
  success = false;
  crit.success = false;
  crit.failure = true;
}

// =========================
// FLAWED ITEM TRAIT (BREAK)
// =========================

let breakText = "";

if (crit.failure && itemTraits.some(t => t.key === "flawed")) {

  await weapon.update({
    "system.durability.value": 0
  });

  console.log("SDP | WEAPON BROKEN (FLAWED)", {
    weapon: weapon.name
  });

  breakText = `
<p>
  <strong>
    ${game.i18n.format("SDP.WeaponBreaksFragility", {
      weapon: weapon.name
    })}
  </strong>
</p>`;
}

const isImpaling = finalTraits.some(t => t.key === "impaling");

const isRound = result % 10 === 0;

if (isImpaling && isRound && result <= targetValue) {
  crit.success = true;
}

    let SL =
  Math.floor(targetValue / 10) -
  Math.floor(result / 10);

  const adjusted = SdpRoll.applyDynamicResult(result, targetValue, success, SL);
success = adjusted.success;
SL = adjusted.SL;

  // =========================
// INSPIRATION → SL BONUS
// =========================

const inspiration = dialogMods.inspiration || 0;

SL += inspiration;

console.log("SDP | INSPIRATION APPLIED (RANGED)", {
  inspiration,
  finalSL: SL
});

// 🔥 APPLY SUCCESS BONUS
const selectedTalents = dialogMods.talents || [];

SL = SdpRoll.applyTalentSLModifiers(SL, actor, selectedTalents);

// =========================
// TALENTS HTML
// =========================

const selectedTalentObjects = selectedTalents
  .map(id => actor.items.get(id))
  .filter(Boolean);

const talentsHTML =
  selectedTalentObjects.length > 0
    ? `
      <div class="roll-talents">

        <ul>
          ${selectedTalentObjects.map(t => `
            <li>
              ${t.name}
              ${t.system.advances
                ? `(${t.system.advances})`
                : ""}
            </li>
          `).join("")}
        </ul>
      </div>
    `
    : "";

let critText = "";

if (crit.success) {
  critText = `<p><strong>${game.i18n.localize("SDP.CriticalSuccess")}</strong></p>`;
}

if (crit.failure) {

  critText = `
    <p><strong>${game.i18n.localize("SDP.CriticalFailure")}</strong></p>

    <button class="roll-critical-failure"
      data-table="critical-attack-failure">
      ${game.i18n.localize("SDP.RollCriticalFailure")}
    </button>
  `;
}


    let damageButton = "";

 if(success){

      damageButton = `
      <button type="button" type="button" class="roll-damage"
        data-actor="${actor.id}"
        data-weapon="${weapon.id}"
        data-ammo="${ammo?.id || ""}"
        data-target="${targetId ?? ""}">
        ${game.i18n.localize("SDP.RollDamage")}
      </button>
      `;

    }

    // 🔥 UNLOAD TOUJOURS SI RELOAD (SAFE)
if (finalTraits.some(t => t.key === "reload")) {

  await weapon.update({
  "system.loaded": false,
  "system.forceReload": false
});

  console.log("SDP | WEAPON UNLOADED (RANGED)", {
    weapon: weapon.name,
    success
  });

}

    const html = `
<div class="sdp-attack" data-sdp-safe="true"
     data-actor="${actor.id}"
     data-ammo="${ammo?.id || ""}"
     data-roll="${result}"
     data-type="ranged"
     data-testtarget="${targetValue}"
     data-critical="${crit.success}"
     data-brutal="${dialogMods.brutal}"
     data-weapon="${weapon.id}"
     data-target="${targetId ?? ""}"
     data-location="${hitLocation.location}"
     data-location-profile="${hitProfileKey}"
     data-talents='${JSON.stringify(dialogMods.talents || [])}'
     data-traits='${JSON.stringify(normalizedTraits)}'
     data-damagetype="${weapon.system.damageType || "slashing"}">

  <h3>
  ${game.i18n.format("SDP.ShootsWith", {
    actor: actor.name,
    weapon: weapon.name
  })}
</h3>

  <button class="edit-attack">${game.i18n.localize("SDP.Edit")}</button>

${displayTraits.length ? `
<div class="weapon-traits">

  ${displayTraits.some(t => t.type === "positive") ? `
    <div><strong>${game.i18n.localize("SDP.Advantages")}:</strong>
      ${displayTraits
        .filter(t => t.type === "positive")
        .map(t => `<span class="trait-tag">${t.label}</span>`)
        .join("")}
    </div>
  ` : ""}

  ${displayTraits.some(t => t.type === "negative") ? `
    <div><strong>${game.i18n.localize("SDP.Drawbacks")}:</strong>
      ${displayTraits
        .filter(t => t.type === "negative")
        .map(t => `<span class="trait-tag negative">${t.label}</span>`)
        .join("")}
    </div>
  ` : ""}

</div>
` : ""}

  <p>${game.i18n.localize("SDP.Test")}: ${source}</p>
  <p>${game.i18n.localize("SDP.Target")}: ${targetValue}</p>
  <p>
  ${game.i18n.localize("SDP.Range")}:
  ${game.i18n.localize(rangeLabel)}
  (${Math.round(measuredDistance)}m)
</p>
  <p>${game.i18n.localize("SDP.Roll")}: ${result}</p>
  ${inspiration > 0 ? `<p>${game.i18n.localize("SDP.Inspiration")}: +${inspiration}</p>` : ""}
  <p>
  ${game.i18n.localize("SDP.SuccessLevel")}:
  ${SL}
  (${SdpRoll.getSLLabel(SL)})
</p>
  
  ${critText}
  ${breakText}

  <p>
${game.i18n.localize("SDP.HitLocation")}:
${game.i18n.localize(
  hitProfile.locations?.[hitLocation.location]?.label
    || hitLocation.location
)}
(${hitLocation.roll.total})
</p>
${talentsHTML}
  <p><strong>${success
  ? game.i18n.localize("SDP.Hit")
  : game.i18n.localize("SDP.Miss")}</strong></p>

  ${damageButton}

</div>
`;

    roll.toMessage({
  speaker: ChatMessage.getSpeaker({actor}),
  content: html
});

    return;

  }

  // =========================
// TRAITS (MELEE FIX)
// =========================

const weaponTraits = weapon.system.traits || [];
const itemTraits = weapon.system.itemTraits || [];

const allTraits = [...weaponTraits, ...itemTraits];

const normalizedTraits = allTraits
  .filter(t => t)
  .map(t => {
    if (typeof t === "string") return { key: t };
    return t;
  });

// =========================
// SPLIT TRAITS
// =========================

const positiveTraits = normalizedTraits.filter(t =>
  WEAPON_TRAITS?.[t.key]?.type === "positive"
);

const negativeTraits = normalizedTraits.filter(t =>
  WEAPON_TRAITS?.[t.key]?.type === "negative"
);

// =========================
// SKILL CHECK
// =========================

const weaponSkills = (weapon.system.skill || "")
  .split(",")
  .map(s => s.trim().toLowerCase());

const actorSkills = actor.items.filter(i => i.type === "skill");

let bestSkill = null;

for (const group of weaponSkills) {
  const skill = actorSkills.find(s =>
    (s.system.key || "").toLowerCase() === group ||
    (s.name || "").toLowerCase() === group
  );

  if (!skill) continue;

  if (!bestSkill || skill.system.value > bestSkill.system.value) {
    bestSkill = skill;
  }
}

const hasValidSkill = !!bestSkill;

// =========================
// FINAL TRAITS
// =========================

const activePositiveTraits = hasValidSkill ? positiveTraits : [];
const finalTraits = [...activePositiveTraits, ...negativeTraits];

  // ======================
  // MELEE ATTACK
  // ======================

  const isMelee = true;

let chargeBonus = 0;

if (dialogMods.charge) {
  chargeBonus = 1;
}

let baseAttack = actor.getWeaponAttack(weapon) / 10;

// =========================
// FINESSE OVERRIDE
// =========================

if (useFinesse && weapon.system.traits?.some(t => t.key === "finesse")) {

  const DEX = actor.system.attributes.dexterity.value;

  const bestSkill = actor.items.find(i =>
    i.type === "skill" &&
    weapon.system.skill?.toLowerCase().includes(i.name.toLowerCase())
  );

  const advances = bestSkill?.system?.advances || 0;

  baseAttack =
    Math.floor(DEX / 10) +
    Math.floor(advances / 10);
}

// =========================
// WEAPON BONUS (SAFE)
// =========================

const weaponAttack =
  Number(weapon.system.attack) ||
  Number(weapon.system.attackBonus) ||
  0;

// ⚠️ seulement en finesse (sinon déjà inclus)
if (useFinesse && weapon.system.traits?.some(t => t.key === "finesse")) {
  baseAttack += weaponAttack;
}

baseAttack += Number(actor.system.custom.meleeActionBonus || 0);

const roll = await (new Roll("1d100")).roll();
const result = roll.total;

let critFailMin = 96;

if (finalTraits.some(t => t.key === "dangerous")) {
  critFailMin = 86;

  console.log("SDP | DANGEROUS (MELEE)", {
    weapon: weapon.name,
    critFailMin
  });
}

let critFailBase = 96;

if (finalTraits.some(t => t.key === "dangerous")) {
  critFailBase = 86;

  console.log("SDP | DANGEROUS (MELEE)", {
    weapon: weapon.name,
    critFailMin: critFailBase
  });
}

const crit = SdpRoll.getCritical(
  result,
  baseAttack * 10,
  {
    critFailBase
  }
);

// 🔥 melee : désactive uniquement les crit success natifs
crit.success = false;

// =========================
// FLAWED ITEM TRAIT (BREAK)
// =========================

let breakText = "";

if (crit.failure && itemTraits.some(t => t.key === "flawed")) {

  await weapon.update({
    "system.durability.value": 0
  });

  console.log("SDP | WEAPON BROKEN (FLAWED)", {
    weapon: weapon.name
  });

  breakText = `
<p>
  <strong>
    ${game.i18n.format("SDP.WeaponBreaksFragility", {
      weapon: weapon.name
    })}
  </strong>
</p>`;
}
const traitsData = normalizedTraits.map(t => {

  const labelKey =
    WEAPON_TRAITS?.[t.key]?.label || t.key;

  return {
    key: t.key,
    label: game.i18n.localize(labelKey),
    value: t.value
  };

});

let fastBonus = 0;

if (finalTraits.some(t => t.key === "fast")) {
  fastBonus = 1; // ⚠️ ici c’est en "points"
}

const isImpaling = finalTraits.some(t => t.key === "impaling");

// chiffre rond (10,20,...)
const isRound = result % 10 === 0;

const successCheck = result <= (baseAttack * 10);

if (isImpaling && isRound && successCheck) {
  crit.success = true;
}

let SL;

if (result === 100) {
  SL = 0;
} else {
  const tens = Math.floor(result / 10);
  SL = 10 - tens;
}

// 🎯 attack score final
let locationMod = 0;

if (dialogMods.location) {

  locationMod =
    hitProfile.locations?.[hitLocation.location]?.modifier || 0;

}

const totalModifier =
  (dialogMods.totalMod || 0) +
  (dialogMods.conditionMod || 0) +
  (dialogMods.dynamicModifiers || [])
    .reduce((acc, m) => {
      return acc + Number(m.value || 0);
    }, 0);

const meleeModifier =
  Math.floor(totalModifier / 10);

let attackScore =
  baseAttack +
  meleeModifier +
  SL +
  bonus +
  inspiration +
  chargeBonus +
  Math.floor(locationMod / 10);

let context = {
  actor,
  weapon,
  data: {
    damage: 0,
    parry: 0,
    initiativeBonus: 0
  }
};

context = SdpTraitEngine.applyAttackTraits(context);

 let critText = "";

if (crit.success) {
  critText = `<p><strong>${game.i18n.localize("SDP.CriticalSuccess")}</strong></p>`;
}

if (crit.failure) {

  critText = `
    <p><strong>${game.i18n.localize("SDP.CriticalFailure")}</strong></p>

    <button class="roll-critical-failure"
      data-table="critical-attack-failure">
      ${game.i18n.localize("SDP.RollCriticalFailure")}
    </button>
  `;
}

  // =========================
// TALENTS HTML
// =========================

const selectedTalents = dialogMods.talents || [];

const selectedTalentObjects = selectedTalents
  .map(id => actor.items.get(id))
  .filter(Boolean);

const talentsHTML =
  selectedTalentObjects.length > 0
    ? `
      <div class="roll-talents">

        <ul>
          ${selectedTalentObjects.map(t => `
            <li>
              ${t.name}
              ${t.system.advances
                ? `(${t.system.advances})`
                : ""}
            </li>
          `).join("")}
        </ul>
      </div>
    `
    : "";

  const html = `
<div class="sdp-attack"
     data-roll="${result}"
     data-attack="${attackScore}"
     data-baseattack="${baseAttack}"
    data-type="melee"
    data-meleemodifier="${meleeModifier}"
     data-actor="${actor.id}"
     data-weapon="${weapon.id}"
     data-target="${targetId ?? ""}"
     data-location="${hitLocation.location}"
     data-location-profile="${hitProfileKey}"
     data-critical="${crit.success}"
     data-brutal="${dialogMods.brutal}"
     data-traits='${JSON.stringify(normalizedTraits)}'
     data-damagetype="${weapon.system.damageType || "slashing"}">

  <h3>
  ${game.i18n.format("SDP.AttacksWith", {
    actor: actor.name,
    weapon: weapon.name
  })}
</h3>

  <button class="edit-attack">
  ${game.i18n.localize("SDP.Edit")}
</button>

  ${traitsData.length ? `
  <div class="weapon-traits">
    <strong>${game.i18n.localize("SDP.Traits")}:</strong>
    ${traitsData.map(t => `
      <span class="trait-tag"
      data-trait="${t.key}"
      data-value="${t.value || ""}">
       ${t.label}${t.value ? ` (${t.value})` : ""}
      </span>
    `).join("")}
  </div>
` : ""}

  <p>${game.i18n.localize("SDP.Roll")}: ${result}</p>
  <p>${game.i18n.localize("SDP.SuccessLevel")}: ${SL}</p>
  ${inspiration > 0 ? `<p>${game.i18n.localize("SDP.Inspiration")}: +${inspiration}</p>` : ""}
  <p>
${game.i18n.localize("SDP.HitLocation")}:
${game.i18n.localize(
  hitProfile.locations?.[hitLocation.location]?.label
    || hitLocation.location
)}
(${hitLocation.roll.total})
</p>
  ${critText}
  ${breakText}
  ${dialogMods.charge
  ? `<p>${game.i18n.localize("SDP.Charge")}</p>`
  : ""}
  ${talentsHTML}
  <p>${game.i18n.localize("SDP.AttackScore")}: ${attackScore}</p>

 <button class="apply-defense">${game.i18n.localize("SDP.ApplyDefense")}</button>

</div>
`;

  roll.toMessage({
  speaker: ChatMessage.getSpeaker({actor}),
  content: html
});

}

static async reloadTest(actor, weapon) {

  const reloadTrait = [...(weapon.system.traits || []), ...(weapon.system.itemTraits || [])]
  .find(t => {
    if (typeof t === "string") return t === "reload";
    return t.key === "reload";
  });
  const target = Number(reloadTrait?.value || 1);

  const roll = await (new Roll("1d100")).roll();
  const result = roll.total;
  const traits = weapon.system.traits || [];

let critFailMin = 96;

if (traits.some(t => t.key === "dangerous")) {
  critFailMin = 86;
}

const base = actor._getBestWeaponSkill(weapon);

const dialogMods = game.sdp?.dialogModifiers || {};

let targetValue =
  base +
  (dialogMods.totalMod || 0) +
  (dialogMods.conditionMod || 0);

  const crit = SdpRoll.getCritical(result, targetValue, {
  critFailBase: critFailMin
});

let success;

if (result === 100) {
  success = false;
} else {
  success =
  result <= targetValue ||
  (targetValue <= 0 && result <= 5);
}

let SL =
  Math.floor(targetValue / 10) -
  Math.floor(result / 10);

// 🔥 APPLY RULE
const adjusted = SdpRoll.applyDynamicResult(result, targetValue, success, SL);
success = adjusted.success;
SL = adjusted.SL;

  // =========================
// CRITICAL EFFECTS
// =========================

if (crit.success) {
  SL += 2;

  console.log("SDP | RELOAD CRIT SUCCESS", {
    weapon: weapon.name,
    newSL: SL
  });
}

if (crit.failure) {
  SL = 0;

  console.log("SDP | RELOAD CRIT FAILURE", {
    weapon: weapon.name
  });
}

  const progressGain = Math.max(0, SL);
const newProgress = weapon.system.reloadProgress + progressGain;

  const loaded = newProgress >= target;

  await weapon.update({
    "system.reloadProgress": loaded ? 0 : newProgress,
    "system.loaded": loaded
  });

  console.log("SDP | RELOAD TEST", {
    weapon: weapon.name,
    roll: result,
    SL,
    progress: newProgress,
    target,
    loaded
  });

let critText = "";

if (crit.success) {
  critText = `<p><strong>${game.i18n.localize("SDP.CriticalSuccess")}</strong></p>`;
}

if (crit.failure) {

  critText = `
    <p><strong>${game.i18n.localize("SDP.CriticalFailure")}</strong></p>

    <button class="roll-reload-critical">
      ${game.i18n.localize("SDP.ReloadMalfunction")}
    </button>
  `;
}

  const html = `
<div class="sdp-reload">
  <h3>
  ${game.i18n.format("SDP.ReloadsWeapon", {
    actor: actor.name,
    weapon: weapon.name
  })}
</h3>

  <p>${game.i18n.localize("SDP.Target")}: ${targetValue}</p>
  <p>${game.i18n.localize("SDP.Roll")}: ${result}</p>
  <p>${game.i18n.localize("SDP.SuccessLevel")}: ${SL}</p>
${critText}

  <p>${game.i18n.localize("SDP.Progress")}: ${newProgress}/${target}</p>

  <p><strong>${loaded
  ? game.i18n.localize("SDP.Reloaded")
  : game.i18n.localize("SDP.Loading")}</strong></p>
</div>
`;

  roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: html
  });

}

}