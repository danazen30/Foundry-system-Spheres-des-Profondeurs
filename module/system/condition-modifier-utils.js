/**
 * Resolve which characteristic a roll uses, then sum condition modifiers.
 */

export function resolveRollCharacteristic({
  type,
  weapon = null,
  item = null,
  attribute = null,
  attributeOverride = null
} = {}) {

  if (attributeOverride) return attributeOverride;
  if (attribute) return attribute;

  // Spells cast via the attack dialog — not CC/CT/Ag/Dex tests
  if (weapon?.type === "spell") return null;

  if (type === "attack" && weapon) {
    return weapon.system?.category === "ranged"
      ? "rangedAbility"
      : "meleeAbility";
  }

  if (item?.type === "skill") {
    return item.system?.characteristic || null;
  }

  return null;

}

/**
 * @param {Actor} actor
 * @param {object} [context]
 * @returns {{ total: number, details: Array<{ name: string, value: number }> }}
 */
export function getConditionTestModifier(actor, context = {}) {

  const conditions = actor?.system?.conditionTotals
    ?? actor?.system?.conditions
    ?? {};

  const characteristic = resolveRollCharacteristic(context);

  let total = 0;
  const details = [];

  for (const key of Object.keys(conditions)) {

    const value = conditions[key];
    if (!value) continue;

    // Hearing-only penalty handled elsewhere / ignored for generic tests
    if (key === "deafened") continue;

    const config = CONFIG.SDP.conditionConfig?.[key];
    if (!config?.modifier) continue;

    const restricted = Array.isArray(config.attributes)
      ? config.attributes
      : null;

    if (restricted?.length) {
      if (!characteristic || !restricted.includes(characteristic)) {
        continue;
      }
    }

    const stack = value === true ? 1 : Number(value) || 0;
    if (stack <= 0) continue;

    const mod = config.modifierOnce
      ? config.modifier
      : config.modifier * stack;

    if (!mod) continue;

    total += mod;
    details.push({
      name: game.i18n.localize(config.label || key),
      value: mod
    });

  }

  return { total, details };

}
