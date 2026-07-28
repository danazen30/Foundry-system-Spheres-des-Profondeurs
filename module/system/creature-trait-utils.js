/**
 * Traits créature mécaniques : key + indice (multiplicateur).
 * Certains traits sont « activables » (system.active, défaut false).
 */

export const CREATURE_TRAIT_KEYS = {
  superiorConstitution: "superiorConstitution",
  magicReserve: "magicReserve",
  primalInstinct: "primalInstinct",
  voidCreature: "voidCreature",
  thickSkin: "thickSkin",
  scales: "scales",
  carapace: "carapace"
};

/**
 * Multiplicateurs de dégâts entrants par type (après armure).
 * Ex. 0.5 = −50 %, 1.5 = +50 %.
 */
export const DAMAGE_TYPE_TRAIT_MODIFIERS = {
  [CREATURE_TRAIT_KEYS.thickSkin]: {
    bludgeoning: 0.5,
    piercing: 1.5
  },
  [CREATURE_TRAIT_KEYS.scales]: {
    slashing: 0.5,
    piercing: 1.5
  },
  [CREATURE_TRAIT_KEYS.carapace]: {
    slashing: 0.5,
    piercing: 0.5,
    bludgeoning: 1.5
  }
};

/**
 * Effets appliqués uniquement quand system.active === true.
 */
export const TOGGLEABLE_TRAIT_EFFECTS = {
  [CREATURE_TRAIT_KEYS.primalInstinct]: {
    attributeBonuses: {
      strength: 10
    },
    attackBonus: 1,
    exhaustOnDeactivate: true
  },
  [CREATURE_TRAIT_KEYS.voidCreature]: {
    attributeBonuses: {
      strength: 10,
      toughness: 10,
      willpower: 10,
      agility: 10,
      intelligence: 10,
      initiative: 10
    }
  }
};

export function resolveTraitKey(item) {
  const systemKey =
    typeof item?.system?.key === "string"
      ? item.system.key.trim()
      : "";
  const flagKey =
    typeof item?.flags?.sdp?.key === "string"
      ? item.flags.sdp.key.trim()
      : "";
  return systemKey || flagKey;
}

export function isToggleableTraitKey(key) {
  return Boolean(key && TOGGLEABLE_TRAIT_EFFECTS[key]);
}

export function isToggleableTrait(item) {
  return item?.type === "trait"
    && isToggleableTraitKey(resolveTraitKey(item));
}

/**
 * Somme des indices (positifs) pour une key de trait sur l'acteur.
 * Les traits activables ne comptent que s'ils sont actifs.
 */
export function getTraitIndexTotal(actor, traitKey) {
  if (!actor || !traitKey) return 0;

  const toggleable = isToggleableTraitKey(traitKey);
  let total = 0;

  for (const item of actor.items) {
    if (item.type !== "trait") continue;
    if (resolveTraitKey(item) !== traitKey) continue;
    if (toggleable && !item.system?.active) continue;

    const n = Number(item.system?.index);
    if (Number.isFinite(n) && n > 0) {
      total += n;
    }
  }

  return total;
}

export function hasTrait(actor, traitKey) {
  if (!actor || !traitKey) return false;

  for (const item of actor.items) {
    if (item.type !== "trait") continue;
    if (resolveTraitKey(item) === traitKey) return true;
  }

  return false;
}

export function hasActiveTrait(actor, traitKey) {
  if (!actor || !traitKey) return false;

  for (const item of actor.items) {
    if (item.type !== "trait") continue;
    if (resolveTraitKey(item) !== traitKey) continue;
    if (item.system?.active) return true;
  }

  return false;
}

/**
 * Multiplicateur combiné des traits de type de dégâts (1 si aucun).
 */
export function getIncomingDamageTypeMultiplier(actor, damageType) {
  if (!actor || !damageType) return 1;

  let multiplier = 1;

  for (const item of actor.items) {
    if (item.type !== "trait") continue;

    const mods = DAMAGE_TYPE_TRAIT_MODIFIERS[resolveTraitKey(item)];
    const factor = mods?.[damageType];
    if (Number.isFinite(factor) && factor > 0) {
      multiplier *= factor;
    }
  }

  return multiplier;
}

export function getActiveTraitAttributeBonus(actor, attrKey) {
  if (!actor || !attrKey) return 0;

  let bonus = 0;

  for (const item of actor.items) {
    if (item.type !== "trait" || !item.system?.active) continue;

    const effect = TOGGLEABLE_TRAIT_EFFECTS[resolveTraitKey(item)];
    const value = effect?.attributeBonuses?.[attrKey];
    if (Number.isFinite(value)) bonus += value;
  }

  return bonus;
}

export function getActiveTraitAttackBonus(actor) {
  if (!actor) return 0;

  let bonus = 0;

  for (const item of actor.items) {
    if (item.type !== "trait" || !item.system?.active) continue;

    const effect = TOGGLEABLE_TRAIT_EFFECTS[resolveTraitKey(item)];
    if (Number.isFinite(effect?.attackBonus)) {
      bonus += effect.attackBonus;
    }
  }

  return bonus;
}

export function traitExhaustsOnDeactivate(item) {
  const key = resolveTraitKey(item);
  return Boolean(TOGGLEABLE_TRAIT_EFFECTS[key]?.exhaustOnDeactivate);
}
