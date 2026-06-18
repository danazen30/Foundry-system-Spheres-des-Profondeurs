import { WEAPON_GROUPS } from "./config.js";

export { WEAPON_GROUPS };

export function localizeWeaponGroupRef(key, fallback = "") {

  const normalizedKey =
    typeof key === "string"
      ? key.trim()
      : "";

  if (!normalizedKey) return fallback;

  const config =
    WEAPON_GROUPS?.[normalizedKey];

  if (config?.label && game.i18n.has(config.label)) {
    return game.i18n.localize(config.label);
  }

  const translationKey =
    `SDP.WeaponGroups.${normalizedKey}`;

  return game.i18n.has(translationKey)
    ? game.i18n.localize(translationKey)
    : (fallback || normalizedKey);

}

export function getWeaponGroupSelectOptions({
  allowBlank = false,
  currentValue = ""
} = {}) {

  const options =
    Object.entries(WEAPON_GROUPS).map(([value, config]) => ({
      value,
      label: game.i18n.localize(config.label)
    }));

  const normalizedCurrent =
    typeof currentValue === "string"
      ? currentValue.trim()
      : "";

  if (
    normalizedCurrent &&
    !options.some(option =>
      option.value === normalizedCurrent
    )
  ) {
    options.push({
      value: normalizedCurrent,
      label: localizeWeaponGroupRef(
        normalizedCurrent,
        normalizedCurrent
      )
    });
  }

  if (allowBlank) {
    options.unshift({
      value: "",
      label: game.i18n.localize("SDP.None")
    });
  }

  return options;

}
