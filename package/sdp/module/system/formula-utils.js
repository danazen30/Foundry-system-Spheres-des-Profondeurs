/**
 * Résout une formule SDP (SB, S, SB x 3, etc.) pour un acteur.
 */
export function resolveSdpFormula(value, actor) {

  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Math.floor(value);
  }

  const trimmed = String(value).trim();

  if (!trimmed) return 0;

  const asNumber = Number(trimmed);

  if (
    !Number.isNaN(asNumber) &&
    /^-?\d+(\.\d+)?$/.test(trimmed)
  ) {
    return Math.floor(asNumber);
  }

  if (!actor) return 0;

  let str = trimmed.toUpperCase();
  const attrs = actor.system?.attributes ?? {};

  const map = {
    SB: attrs.strength?.bonus ?? 0,
    S: attrs.strength?.value ?? 0,
    TB: attrs.toughness?.bonus ?? 0,
    T: attrs.toughness?.value ?? 0,
    AGB: attrs.agility?.bonus ?? 0,
    AG: attrs.agility?.value ?? 0,
    DEXB: attrs.dexterity?.bonus ?? 0,
    DEX: attrs.dexterity?.value ?? 0,
    IB: attrs.initiative?.bonus ?? 0,
    I: attrs.initiative?.value ?? 0,
    INTB: attrs.intelligence?.bonus ?? 0,
    INT: attrs.intelligence?.value ?? 0,
    WPB: attrs.willpower?.bonus ?? 0,
    WP: attrs.willpower?.value ?? 0,
    CHAB: attrs.charisma?.bonus ?? 0,
    CHA: attrs.charisma?.value ?? 0,
    MAB: attrs.meleeAbility?.bonus ?? 0,
    MA: attrs.meleeAbility?.value ?? 0,
    RAB: attrs.rangedAbility?.bonus ?? 0,
    RA: attrs.rangedAbility?.value ?? 0
  };

  const keys = Object.keys(map).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    str = str.replace(
      new RegExp(`\\b${key}\\b`, "g"),
      map[key]
    );
  }

  str = str.replace(/\s*[x×]\s*/gi, "*");

  try {
    return Math.floor(eval(str));
  }
  catch (e) {
    console.warn("SDP formula error:", value, "→", str);
    return 0;
  }

}

export function resolveWeaponRange(weapon, actor) {

  return resolveSdpFormula(
    weapon?.system?.range ?? 0,
    actor
  );

}

export function resolveWeaponRangeWithAmmo(
  weapon,
  actor,
  ammo = null
) {

  const baseRange = resolveWeaponRange(weapon, actor);
  const ammoRangeModifier =
    Number(ammo?.system?.rangeModifier || 0);

  return Math.max(0, baseRange + ammoRangeModifier);

}
