/**
 * Résout une formule SDP (SB, S, SB x 3, etc.) pour un acteur.
 */
export function resolveSdpFormula(value, actor, options = {}) {

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
  const overrides = options.overrides ?? {};

  const map = {
    SB: overrides.SB ?? attrs.strength?.bonus ?? 0,
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

export function hasWeaponDamageStatBonus(value) {
  return /\b(SB|WPB(\s*\/\s*2)?)\b/i.test(String(value ?? ""));
}

export function parseWeaponDamageFormula(value, actor, { useFinesse = false } = {}) {

  if (value === null || value === undefined || value === "") {
    return { statBonus: 0, flatBase: 0 };
  }

  if (!actor) {
    return { statBonus: 0, flatBase: 0 };
  }

  let str = String(value).trim();

  if (!str) {
    return { statBonus: 0, flatBase: 0 };
  }

  const attrs = actor.system?.attributes ?? {};
  const SB = useFinesse
    ? (attrs.dexterity?.bonus ?? 0)
    : (attrs.strength?.bonus ?? 0);
  const WPB = attrs.willpower?.bonus ?? 0;
  const halfWPB = Math.floor(WPB / 2);

  // Multiplications (WPB x 2, SB * 3, etc.) : résoudre toute la formule
  if (/[x×*]/.test(str)) {
    const total = resolveSdpFormula(str, actor, { overrides: { SB } });
    if (hasWeaponDamageStatBonus(str)) {
      return { statBonus: total, flatBase: 0 };
    }
    return { statBonus: 0, flatBase: total };
  }

  let statBonus = 0;

  const wpbHalfRegex = /\bWPB\s*\/\s*2\b/gi;
  const wpbHalfCount = (str.match(wpbHalfRegex) || []).length;
  statBonus += wpbHalfCount * halfWPB;
  str = str.replace(wpbHalfRegex, "");

  const wpbRegex = /\bWPB\b/gi;
  const wpbCount = (str.match(wpbRegex) || []).length;
  statBonus += wpbCount * WPB;
  str = str.replace(wpbRegex, "");

  const sbRegex = /\bSB\b/gi;
  const sbCount = (str.match(sbRegex) || []).length;
  statBonus += sbCount * SB;
  str = str.replace(sbRegex, "");

  str = str
    .replace(/\+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(p => p)
    .join(" + ");

  const flatBase = str ? resolveSdpFormula(str, actor) : 0;

  return { statBonus, flatBase };

}

export function resolveWeaponDamageBase(value, actor, options = {}) {
  const { statBonus, flatBase } = parseWeaponDamageFormula(value, actor, options);
  return statBonus + flatBase;
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
