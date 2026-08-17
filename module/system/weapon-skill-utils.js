import {
  formatLocalizedKeyList,
  getLocalizedItemName,
  localizeItemRef,
  parseKeyList
} from "./item-localization.js";

const MELEE_WEAPON_GROUP_SKILL_KEYS = {
  basic: "meleebasic",
  polearm: "meleepolearm",
  twohanded: "meleetwohanded",
  brawl: "meleebrawl",
  cavalry: "meleepolearm",
  fencing: "meleefencing",
  sword: "meleesword",
  axe: "meleeaxe",
  hammer: "meleehammer",
  shield: "meleeshield",
  flail: "meleeflail",
  parry: "meleeparry",
  entangle: "meleeentangle"
};

const LEGACY_WEAPON_SKILL_ALIASES = {
  cac8: "meleehammer",
  projectileentangle: "meleeentangle"
};

const WEAPON_KEY_SKILL_DEFAULTS = {
  becdecorbin: ["meleepolearm", "meleehammer"],
  warhammer: ["meleehammer"]
};

function normalizeSkillRef(ref) {

  const normalized =
    typeof ref === "string"
      ? ref.trim().toLowerCase()
      : "";

  if (!normalized) return "";

  return LEGACY_WEAPON_SKILL_ALIASES[normalized] || normalized;

}

function resolveWeaponKey(weapon) {

  const keyCandidates = [
    weapon?.system?.key,
    weapon?.flags?.sdp?.key
  ]
    .filter(value => typeof value === "string")
    .map(value => value.trim())
    .filter(Boolean);

  for (const key of keyCandidates) {
    if (WEAPON_KEY_SKILL_DEFAULTS[key]) {
      return key;
    }
  }

  const name =
    (weapon?.name || "")
      .trim()
      .toLowerCase();

  for (const weaponKey of Object.keys(WEAPON_KEY_SKILL_DEFAULTS)) {

    const translationKey =
      `SDP.Item.Weapon.${weaponKey}.Name`;

    if (
      game.i18n.has(translationKey) &&
      game.i18n.localize(translationKey).trim().toLowerCase() === name
    ) {
      return weaponKey;
    }

  }

  if (
    name.includes("bec de corbin") ||
    name === "poleaxe"
  ) {
    return "becdecorbin";
  }

  if (
    name.includes("marteau de guerre") ||
    name === "war hammer"
  ) {
    return "warhammer";
  }

  return keyCandidates[0] || "";

}

function isKnownSkillRef(ref) {

  const normalized =
    typeof ref === "string"
      ? ref.trim().toLowerCase()
      : "";

  if (!normalized) return false;

  if (MELEE_WEAPON_GROUP_SKILL_KEYS[normalized]) {
    return true;
  }

  return game.i18n.has(
    `SDP.Item.Skill.${normalized}.Name`
  );

}

export function parseWeaponSkillRefs(weapon) {

  if (!weapon) return [];

  if (Array.isArray(weapon.system?.skills)) {
    return weapon.system.skills
      .map(entry => normalizeSkillRef(String(entry)))
      .filter(Boolean);
  }

  const parsed = parseKeyList(weapon.system?.skill)
    .map(entry => normalizeSkillRef(entry))
    .filter(Boolean);

  const weaponKey = resolveWeaponKey(weapon);

  const defaults = WEAPON_KEY_SKILL_DEFAULTS[weaponKey];

  if (
    defaults?.length &&
    (
      !parsed.length ||
      parsed.some(ref => !isKnownSkillRef(ref))
    )
  ) {
    return defaults.map(entry => entry.toLowerCase());
  }

  return parsed;

}

export function expandWeaponSkillRef(ref) {

  const normalized =
    typeof ref === "string"
      ? ref.trim().toLowerCase()
      : "";

  if (!normalized) return [];

  const refs = [normalized];

  const aliased = LEGACY_WEAPON_SKILL_ALIASES[normalized];

  if (aliased) {
    refs.push(aliased);
  }

  const mappedSkill =
    MELEE_WEAPON_GROUP_SKILL_KEYS[normalized];

  if (mappedSkill) {
    refs.push(mappedSkill);
  }

  // Also match legacy keys that point to a modern skill.
  for (const [legacy, modern] of Object.entries(LEGACY_WEAPON_SKILL_ALIASES)) {
    if (refs.includes(modern)) {
      refs.push(legacy);
    }
  }

  return [...new Set(refs)];

}

export function findActorSkillForRef(actorSkills, ref) {

  for (const candidate of expandWeaponSkillRef(ref)) {

    const skill = actorSkills.find(entry => {

      const key =
        (entry.system?.key || "")
          .trim()
          .toLowerCase();

      const name =
        (entry.name || "")
          .trim()
          .toLowerCase();

      return key === candidate || name === candidate;

    });

    if (skill) return skill;

  }

  return null;

}

export function getBestActorSkillForWeapon(actor, weapon) {

  const weaponSkills = parseWeaponSkillRefs(weapon);

  const actorSkills = actor.items.filter(
    entry => entry.type === "skill"
  );

  let bestSkill = null;

  for (const ref of weaponSkills) {

    const skill = findActorSkillForRef(actorSkills, ref);

    if (!skill) continue;

    const value = Number(skill.system?.value ?? 0);

    if (
      !bestSkill ||
      value > Number(bestSkill.system?.value ?? 0)
    ) {
      bestSkill = skill;
    }

  }

  return bestSkill;

}

export function actorHasWeaponSkill(actor, weapon) {

  return !!getBestActorSkillForWeapon(actor, weapon);

}

function resolveSkillDisplayLabel(ref, actorSkills = []) {

  for (const candidate of expandWeaponSkillRef(ref)) {

    const localized =
      getLocalizedItemName("skill", candidate);

    if (localized) {
      return localized;
    }

  }

  const skill = findActorSkillForRef(actorSkills, ref);

  if (skill) {

    const skillKey =
      (skill.system?.key || "")
        .trim()
        .toLowerCase();

    const aliasedKey =
      LEGACY_WEAPON_SKILL_ALIASES[skillKey] || skillKey;

    const localized =
      getLocalizedItemName("skill", aliasedKey);

    if (localized) {
      return localized;
    }

    return skill.name;

  }

  const localizedList =
    formatLocalizedKeyList(ref, { type: "skill" });

  if (localizedList) {
    return localizedList;
  }

  return localizeItemRef("skill", ref, ref);

}

export function formatWeaponSkillDisplay(weapon, actor = null) {

  const refs = parseWeaponSkillRefs(weapon);

  if (!refs.length) {
    return game.i18n.localize("SDP.NoSkill");
  }

  const actorSkills =
    actor?.items?.filter(entry => entry.type === "skill") ?? [];

  return refs
    .map(ref => resolveSkillDisplayLabel(ref, actorSkills))
    .join(", ");

}
