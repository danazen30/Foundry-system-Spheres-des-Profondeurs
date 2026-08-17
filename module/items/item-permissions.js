const SLOT_FIELDS = [
  "system.slots.head",
  "system.slots.chest",
  "system.slots.armLeft",
  "system.slots.armRight",
  "system.slots.legLeft",
  "system.slots.legRight"
];

/**
 * Fields players may edit on the item sheet UI (visible + interactive).
 * Everything else on the sheet is shown read-only.
 */
const PLAYER_SHEET_FIELDS_BY_TYPE = {
  armor: [
    "system.worn.value",
    "system.layer",
    ...SLOT_FIELDS
  ],
  clothing: [
    "system.equipped",
    "system.layer",
    ...SLOT_FIELDS
  ],
  weapon: [
    "system.offhand",
    "system.isDefenseWeapon",
    "system.equipped"
  ]
};

/** Always interactive on the item sheet for owners. */
const COMMON_PLAYER_SHEET_FIELDS = [
  "name",
  "system.quantity.value",
  "system.playerNotes"
];

/**
 * Paths (or prefixes) players must never change, even via console / forged updates.
 * Combat may still change system.durability.value.
 */
const PLAYER_FORBIDDEN_PREFIXES = [
  "system.price",
  "system.encumbrance",
  "system.description",
  "system.gmNotes",
  "system.key",
  "system.AP",
  "system.armorTraits",
  "system.itemTraits",
  "system.traits",
  "system.damage",
  "system.damageDice",
  "system.damageType",
  "system.category",
  "system.natural",
  "system.skill",
  "system.weaponGroup",
  "system.range",
  "system.reach",
  "system.consumesAmmo",
  "system.forceReload",
  "system.handedness",
  "system.durability.max",
  "img"
];

export function getPlayerEditableSheetFields(itemType) {
  return [
    ...COMMON_PLAYER_SHEET_FIELDS,
    ...(PLAYER_SHEET_FIELDS_BY_TYPE[itemType] || [])
  ];
}

export function isPlayerEditableItemField(itemType, fieldName) {
  if (!fieldName) return false;
  return getPlayerEditableSheetFields(itemType).includes(fieldName);
}

function isForbiddenPlayerPath(path) {
  return PLAYER_FORBIDDEN_PREFIXES.some(
    prefix => path === prefix || path.startsWith(`${prefix}.`)
  );
}

/**
 * Strip forbidden keys from a player item update (mutates `changes`).
 * @returns {boolean} false if the update should be cancelled entirely
 */
export function restrictPlayerItemUpdate(item, changes) {
  if (game.user.isGM) return true;

  const flat = foundry.utils.flattenObject(changes);
  const kept = {};

  for (const [key, value] of Object.entries(flat)) {
    if (key === "_id") continue;
    if (isForbiddenPlayerPath(key)) continue;
    kept[key] = value;
  }

  for (const key of Object.keys(changes)) {
    delete changes[key];
  }

  Object.assign(changes, foundry.utils.expandObject(kept));

  return Object.keys(changes).length > 0;
}

/**
 * Players may only toggle ActiveEffect.disabled on items (equip sync).
 * @returns {boolean} false to cancel
 */
export function restrictPlayerEffectUpdate(effect, changes) {
  if (game.user.isGM) return true;

  const parent = effect.parent;
  if (parent?.documentName !== "Item") return true;

  const disabled = changes.disabled;
  for (const key of Object.keys(changes)) {
    delete changes[key];
  }

  if (disabled === undefined) return false;

  changes.disabled = disabled;
  return true;
}

export function registerItemPermissions() {

  Hooks.on("preUpdateItem", (item, changes, _options, userId) => {
    if (userId !== game.user.id) return;
    if (game.user.isGM) return;

    if (!restrictPlayerItemUpdate(item, changes)) {
      return false;
    }
  });

  Hooks.on("preCreateActiveEffect", (effect, _data, _options, userId) => {
    if (userId !== game.user.id) return;
    if (game.user.isGM) return;

    if (effect.parent?.documentName === "Item") {
      return false;
    }
  });

  Hooks.on("preDeleteActiveEffect", (effect, _options, userId) => {
    if (userId !== game.user.id) return;
    if (game.user.isGM) return;

    if (effect.parent?.documentName === "Item") {
      return false;
    }
  });

  Hooks.on("preUpdateActiveEffect", (effect, changes, _options, userId) => {
    if (userId !== game.user.id) return;
    if (game.user.isGM) return;

    if (!restrictPlayerEffectUpdate(effect, changes)) {
      return false;
    }
  });

}
