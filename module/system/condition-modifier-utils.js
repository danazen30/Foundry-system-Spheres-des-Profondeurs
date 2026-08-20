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

function conditionAppliesToRoll(config, context, characteristic) {

  const {
    type = null,
    weapon = null,
    item = null
  } = context;

  const restricted = Array.isArray(config.attributes)
    ? config.attributes
    : null;

  const skillKeys = Array.isArray(config.skillKeys)
    ? config.skillKeys.map(k => String(k).toLowerCase())
    : [];

  const hasTargeting =
    (restricted?.length > 0)
    || config.applyToAttack
    || skillKeys.length > 0;

  if (!hasTargeting) return true;

  if (restricted?.length && characteristic && restricted.includes(characteristic)) {
    return true;
  }

  if (config.applyToAttack) {
    if (type === "attack" && weapon?.type !== "spell") return true;
    if (characteristic === "meleeAbility" || characteristic === "rangedAbility") {
      return true;
    }
  }

  if (skillKeys.length && item?.type === "skill") {
    const key = String(item.system?.key || "").toLowerCase().trim();
    const name = String(item.name || "").toLowerCase().trim();
    if (skillKeys.includes(key) || skillKeys.some(k => name.includes(k))) {
      return true;
    }
  }

  return false;

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

    if (!conditionAppliesToRoll(config, context, characteristic)) {
      continue;
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
