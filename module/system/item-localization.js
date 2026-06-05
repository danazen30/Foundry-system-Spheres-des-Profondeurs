/**
 * Localisation des noms d'objets et dossiers SDP
 * (barre latérale, compendiums, etc.)
 */

import { SDP } from "./config.js";
import { getLocalizedRollTableName } from "./roll-table-utils.js";

/**
 * Dérive une clé i18n à partir d'un nom de dossier ("Weapons" → "weapons").
 */
export function deriveFolderKey(name = "") {

  const parts = name.match(/[a-zA-Z0-9]+/g);

  if (!parts?.length) return "";

  return parts
    .map((part, index) => {

      const lower = part.toLowerCase();

      if (index === 0) return lower;

      return lower.charAt(0).toUpperCase() + lower.slice(1);

    })
    .join("");

}

export function resolveFolderKey(source = {}) {

  return source.flags?.sdp?.key
    ?? deriveFolderKey(source.name);

}

export function getLocalizedFolderName(key, fallback = "") {

  if (!key) return fallback;

  const translationKey =
    `SDP.Folder.${key}.Name`;

  return game.i18n.has(translationKey)
    ? game.i18n.localize(translationKey)
    : fallback;

}

function findFolderNameElement(entry) {

  if (!entry) return null;

  return entry.querySelector(
    ".entry-name, .folder-name, .document-name, header .name, .folder-header .name, a.entry-name, a.content-link"
  ) ?? (
    entry.matches?.("a, .folder-name, header .name")
      ? entry
      : null
  );

}

function getCompendiumRoots(element, pack) {

  const roots = new Set();

  if (element instanceof HTMLElement) {
    roots.add(element);
  }

  if (pack?.metadata?.id) {

    const domId =
      `compendium-${pack.metadata.id.replaceAll(".", "_")}`;

    const byId =
      document.getElementById(domId);

    if (byId) roots.add(byId);

  }

  return [...roots];

}

function localizeFolderEntry(entry, key, fallback) {

  if (!entry || !key) return;

  const localized =
    getLocalizedFolderName(key, fallback);

  const nameEl =
    findFolderNameElement(entry);

  if (nameEl) {
    nameEl.textContent = localized;
  }

}

export function getLocalizedItemName(type, key, fallback = "") {

  const normalizedKey =
    typeof key === "string"
      ? key.trim()
      : key;

  if (!type || !normalizedKey) return fallback;

  const itemType =
    type.charAt(0).toUpperCase()
    + type.slice(1);

  const translationKey =
    `SDP.Item.${itemType}.${normalizedKey}.Name`;

  return game.i18n.has(translationKey)
    ? game.i18n.localize(translationKey)
    : fallback;

}

/**
 * Nom affiché d'un item sur la fiche acteur (inventaire, combat, etc.).
 */
export function getActorItemDisplayName(item) {

  if (!item) return "";

  const type =
    item.type ?? "";

  const systemKey =
    typeof item.system?.key === "string"
      ? item.system.key.trim()
      : "";

  if (systemKey && type) {

    const localized =
      getLocalizedItemName(
        type,
        systemKey,
        ""
      );

    if (localized) {
      return localized;
    }

  }

  const key =
    normalizeItemRef(
      systemKey
      || item.name
      || ""
    );

  if (!key) {
    return item.name ?? "";
  }

  if (type) {

    const localized =
      getLocalizedItemName(
        type,
        key,
        ""
      );

    if (localized) {
      return localized;
    }

  }

  const trappingName =
    localizeTrappingRef(
      key,
      ""
    );

  if (
    trappingName &&
    trappingName !== key
  ) {
    return trappingName;
  }

  return item.name ?? key;

}

function getSharedDescriptionKey(type, key) {

  const normalizedKey =
    typeof key === "string"
      ? key.trim()
      : "";

  if (
    type === "talent"
    && normalizedKey.startsWith("network")
    && normalizedKey !== "network"
  ) {
    return "network";
  }

  if (
    type === "talent"
    && normalizedKey.startsWith("sharpsenses")
    && normalizedKey !== "sharpsenses"
  ) {
    return "sharpsenses";
  }

  if (
    type === "skill"
    && normalizedKey.startsWith("lore")
    && normalizedKey !== "lore"
    && normalizedKey !== "loreregion"
  ) {
    return "lore";
  }

  if (
    type === "skill"
    && normalizedKey.startsWith("language")
    && normalizedKey !== "language"
  ) {
    return "language";
  }

  if (
    type === "skill"
    && normalizedKey.startsWith("entertain")
    && normalizedKey !== "entertain"
  ) {
    return "entertain";
  }

  if (
    type === "skill"
    && normalizedKey.startsWith("melee")
    && normalizedKey !== "melee"
  ) {
    return "melee";
  }

  if (
    type === "skill"
    && normalizedKey.startsWith("projectile")
    && normalizedKey !== "projectile"
  ) {
    return "projectile";
  }

  if (
    type === "skill"
    && normalizedKey.startsWith("trade")
    && normalizedKey !== "trade"
  ) {
    return "trade";
  }

  if (
    type === "skill"
    && normalizedKey.startsWith("discretion")
    && normalizedKey !== "stealth"
  ) {
    return "stealth";
  }

  if (
    type === "skill"
    && normalizedKey.startsWith("channel")
    && normalizedKey !== "channel"
  ) {
    return "channel";
  }

  if (
    type === "skill"
    && normalizedKey.startsWith("art")
    && normalizedKey !== "art"
    && normalizedKey !== "artchoose"
  ) {
    return "artchoose";
  }

  if (
    type === "talent"
    && normalizedKey.startsWith("arcanediscipline")
    && normalizedKey !== "arcanediscipline"
  ) {
    return "arcanediscipline";
  }

  return null;

}

export function getLocalizedItemDescription(
  type,
  key,
  fallback = ""
) {

  const normalizedKey =
    typeof key === "string"
      ? key.trim()
      : key;

  if (!type || !normalizedKey) return fallback;

  const itemType =
    type.charAt(0).toUpperCase()
    + type.slice(1);

  const specificKey =
    `SDP.Item.${itemType}.${normalizedKey}.Description`;

  if (game.i18n.has(specificKey)) {
    return game.i18n.localize(specificKey);
  }

  const sharedKey =
    getSharedDescriptionKey(
      type,
      normalizedKey
    );

  if (sharedKey) {

    const sharedTranslationKey =
      `SDP.Item.${itemType}.${sharedKey}.Description`;

    if (game.i18n.has(sharedTranslationKey)) {
      return game.i18n.localize(sharedTranslationKey);
    }

  }

  return fallback;

}

export function normalizeItemRef(value = "") {

  return String(value || "").trim().toLowerCase();

}

export function parseKeyList(value) {

  if (Array.isArray(value)) {
    return value
      .map(entry => String(entry).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map(entry => entry.trim())
      .filter(Boolean);
  }

  return [];

}

export function matchesItemRef(item, ref) {

  if (!item || ref == null || ref === "") return false;

  const normalizedRef = normalizeItemRef(ref);

  return (
    normalizeItemRef(item.system?.key) === normalizedRef
    || normalizeItemRef(item.name) === normalizedRef
  );

}

export function findActorItemByRef(actor, type, ref) {

  if (!actor || !type || ref == null || ref === "") return null;

  return actor.items.find(item =>
    item.type === type &&
    matchesItemRef(item, ref)
  ) ?? null;

}

export function findWorldItemByRef(type, ref) {

  if (!type || ref == null || ref === "") return null;

  return game.items.find(item =>
    item.type === type &&
    matchesItemRef(item, ref)
  ) ?? null;

}

export async function findCompendiumItemByRef(packId, type, ref) {

  const pack = game.packs.get(packId);

  if (!pack || !type || ref == null || ref === "") return null;

  const index = await pack.getIndex({
    fields: [
      "name",
      "type",
      "system.key"
    ]
  });

  const normalizedRef = normalizeItemRef(ref);

  const entry = index.find(item =>
    item.type === type && (
      normalizeItemRef(item.system?.key) === normalizedRef
      || normalizeItemRef(item.name) === normalizedRef
    )
  );

  if (!entry) return null;

  return pack.getDocument(entry._id);

}

export async function resolveItemRef(type, ref, packId) {

  return findWorldItemByRef(type, ref)
    ?? await findCompendiumItemByRef(packId, type, ref);

}

export function localizeCharacteristicKey(key, fallback = "") {

  const normalizedKey =
    typeof key === "string"
      ? key.trim()
      : "";

  if (!normalizedKey) return fallback;

  const translationKey =
    `SDP.Characteristic${normalizedKey.charAt(0).toUpperCase()}${normalizedKey.slice(1)}`;

  return game.i18n.has(translationKey)
    ? game.i18n.localize(translationKey)
    : (fallback || normalizedKey);

}

export function localizeItemRef(type, ref, fallback = "") {

  const normalizedRef =
    typeof ref === "string"
      ? ref.trim()
      : "";

  if (!type || !normalizedRef) return fallback;

  return getLocalizedItemName(
    type,
    normalizedRef,
    fallback || normalizedRef
  );

}

export function formatLocalizedKeyList(value, {
  type = null,
  characteristic = false
} = {}) {

  const keys = parseKeyList(value);

  if (!keys.length) return "";

  return keys.map(key => {

    if (characteristic) {
      return localizeCharacteristicKey(key);
    }

    return localizeItemRef(type, key);

  }).join(", ");

}

const STANDING_TIER_KEYS = {
  copper: "SDP.StandingCopper",
  silver: "SDP.StandingSilver",
  gold: "SDP.StandingGold",
  platinum: "SDP.StandingPlatinum"
};

const TRAPPING_ITEM_TYPES = [
  "weapon",
  "armor",
  "clothing",
  "possession",
  "container",
  "ammunition",
  "currency",
  "trait"
];

function capitalizeItemType(type = "") {

  return type.charAt(0).toUpperCase() + type.slice(1);

}

export function hasItemTranslation(type, key) {

  const normalizedKey =
    typeof key === "string"
      ? key.trim()
      : "";

  if (!type || !normalizedKey) return false;

  return game.i18n.has(
    `SDP.Item.${capitalizeItemType(type)}.${normalizedKey}.Name`
  );

}

export function localizeCareerGroupRef(key, fallback = "") {

  const normalizedKey =
    typeof key === "string"
      ? key.trim()
      : "";

  if (!normalizedKey) return fallback;

  return localizeItemRef(
    "career",
    normalizedKey,
    fallback || normalizedKey
  );

}

export function localizeStanding(value, fallback = "") {

  const text =
    typeof value === "string"
      ? value.trim()
      : "";

  if (!text) return fallback;

  const parts = text.split(/\s+/);
  const tierKey = parts[0].toLowerCase();
  const tierI18nKey = STANDING_TIER_KEYS[tierKey];

  const localizedTier =
    tierI18nKey && game.i18n.has(tierI18nKey)
      ? game.i18n.localize(tierI18nKey)
      : parts[0];

  if (parts.length === 1) return localizedTier;

  return [
    localizedTier,
    ...parts.slice(1)
  ].join(" ");

}

export function parseTrappingRefs(value) {

  if (Array.isArray(value)) {
    return value
      .map(entry => String(entry).trim())
      .filter(Boolean);
  }

  if (typeof value !== "string") return [];

  return value
    .split(/[\r\n,]+/)
    .map(entry => entry.trim())
    .filter(Boolean);

}

export function localizeTrappingRef(ref, fallback = "") {

  const trimmed =
    typeof ref === "string"
      ? ref.trim()
      : "";

  if (!trimmed) return fallback;

  const typedMatch =
    trimmed.match(/^([a-zA-Z]+)\s*:\s*(.+)$/);

  if (typedMatch) {

    const type = typedMatch[1].toLowerCase();
    const key = typedMatch[2].trim();

    return localizeItemRef(
      type,
      key,
      fallback || trimmed
    );

  }

  for (const type of TRAPPING_ITEM_TYPES) {

    if (hasItemTranslation(type, trimmed)) {
      return getLocalizedItemName(
        type,
        trimmed,
        trimmed
      );
    }

  }

  return fallback || trimmed;

}

const TRAPPING_CHOICE_SPLIT = /\s+(?:or|ou)\s+/i;

const TRAPPING_QUANTITY_PATTERN =
  /^(\d+)\s*(?:x\s*)?(.+)$/i;

function localizeTrappingQuantityPart(part) {

  const trimmed =
    typeof part === "string"
      ? part.trim()
      : "";

  if (!trimmed) return "";

  const quantityMatch =
    trimmed.match(TRAPPING_QUANTITY_PATTERN);

  if (quantityMatch) {

    const quantity = quantityMatch[1];
    const ref = quantityMatch[2].trim();
    const name = localizeTrappingRef(ref, ref);

    return `${quantity} ${name}`;

  }

  return localizeTrappingRef(trimmed);

}

function localizeTrappingEntry(entry) {

  const trimmed =
    typeof entry === "string"
      ? entry.trim()
      : "";

  if (!trimmed) return "";

  const choices = trimmed.split(TRAPPING_CHOICE_SPLIT);

  if (choices.length === 1) {
    return localizeTrappingQuantityPart(trimmed);
  }

  const orWord =
    game.i18n.has("SDP.TrappingsOr")
      ? game.i18n.localize("SDP.TrappingsOr")
      : "or";

  return choices
    .map(part => localizeTrappingQuantityPart(part))
    .filter(Boolean)
    .join(` ${orWord} `);

}

export function formatLocalizedTrappings(value) {

  const text =
    typeof value === "string"
      ? value
      : "";

  if (!text.trim()) return "";

  if (text.includes("\n")) {

    return text
      .split(/\r?\n/)
      .map(line => {

        const refs = parseTrappingRefs(line);

        if (!refs.length) return "";

        return refs
          .map(ref => localizeTrappingEntry(ref))
          .join(", ");

      })
      .filter(Boolean)
      .join("\n");

  }

  return parseTrappingRefs(value)
    .map(ref => localizeTrappingEntry(ref))
    .join(", ");

}

export function getCharacteristicOptions() {

  return SDP.ATTRIBUTE_ORDER.map(key => ({
    value: key,
    label: localizeCharacteristicKey(key)
  }));

}

export function getLocalizedSignLevelDescription(
  signKey,
  level,
  fallback = ""
) {

  const normalizedKey =
    typeof signKey === "string"
      ? signKey.trim()
      : "";

  const levelKey =
    level == null
      ? ""
      : String(level).trim();

  if (!normalizedKey || !levelKey) return fallback;

  const translationKey =
    `SDP.Item.Sign.${normalizedKey}.Level.${levelKey}.Description`;

  return game.i18n.has(translationKey)
    ? game.i18n.localize(translationKey)
    : fallback;

}

/**
 * Met à jour les libellés visibles dans une liste directory-item.
 */
export function localizeItemDirectory(element, resolver) {

  if (!element) return;

  const entries =
    element.querySelectorAll(".directory-item");

  for (const entry of entries) {

    const localized = resolver(entry);

    if (!localized) continue;

    const nameEl =
      entry.querySelector(".entry-name, .document-name");

    if (nameEl) {
      nameEl.textContent = localized;
    }

  }

}

export function localizeSidebarItems(element) {

  localizeItemDirectory(element, (entry) => {

    const id = entry.dataset.documentId;

    if (!id) return null;

    const item = game.items.get(id);

    if (!item) return null;

    return getLocalizedItemName(
      item.type,
      item.system?.key,
      item.name
    );

  });

}

export function localizeCompendiumItems(element, pack) {

  localizeItemDirectory(element, (entry) => {

    if (entry.classList.contains("folder"))
      return null;

    const entryId = entry.dataset.entryId;

    if (!entryId) return null;

    const indexEntry = pack.index.get(entryId);

    if (!indexEntry) return null;

    return getLocalizedItemName(
      indexEntry.type,
      indexEntry.system?.key,
      indexEntry.name
    );

  });

}

export function localizeCompendiumFolders(element, pack) {

  if (!pack.folders?.size) return;

  for (const root of getCompendiumRoots(element, pack)) {

    for (const folder of pack.folders) {

      const key =
        resolveFolderKey(folder);

      const row =
        root.querySelector(
          `[data-folder-id="${folder.id}"]`
        )
        ?? root.querySelector(
          `[data-entry-id="${folder.id}"]`
        );

      if (!row) continue;

      const container =
        row.closest(".directory-item, li.folder, li")
        ?? row;

      localizeFolderEntry(
        container,
        key,
        folder.name
      );

    }

  }

}

/**
 * Localise items + dossiers d'un compendium SDP ouvert.
 */
export function localizeSdpCompendium(element, pack, rolltableMap = null) {

  if (!element || !pack) return;

  if (pack.documentName === "Item") {
    localizeCompendiumFolders(element, pack);
    localizeCompendiumItems(element, pack);
    return;
  }

  if (
    rolltableMap &&
    pack.metadata?.id === "sdp.rolltables"
  ) {
    localizeRolltableCompendium(
      element,
      pack,
      rolltableMap
    );
  }

}

export function localizeSidebarFolders(element) {

  if (!element) return;

  const folderEntries =
    element.querySelectorAll(".directory-item.folder");

  for (const entry of folderEntries) {

    const folderId = entry.dataset.folderId;

    if (!folderId) continue;

    const folder = game.folders.get(folderId);

    if (!folder || folder.type !== "Item") continue;

    const key = resolveFolderKey(folder);

    localizeFolderEntry(
      entry,
      key,
      folder.name
    );

  }

}

export function localizeRolltableCompendium(element, pack, rolltableMap) {

  localizeItemDirectory(element, (entry) => {

    const documentId = entry.dataset.entryId;

    if (!documentId) return null;

    const indexEntry =
      pack?.index?.get(documentId);

    const flagKey =
      indexEntry?.flags?.sdp?.key;

    if (flagKey) {

      const localized =
        getLocalizedRollTableName({
          flags: { sdp: { key: flagKey } }
        });

      if (localized) return localized;

    }

    const localizationKey =
      rolltableMap?.[documentId];

    if (!localizationKey) return null;

    return game.i18n.localize(localizationKey);

  });

}

/**
 * Re-rend les vues liste après un changement de langue.
 */
export function refreshSdpUiLocalization() {

  const itemsTab = ui.sidebar?.tabs?.items;

  if (itemsTab?.rendered) {
    itemsTab.render(true);
  }

  ui.compendium?.render?.(true);

  for (const app of Object.values(ui.windows)) {

    if (app.collection?.metadata?.system === "sdp") {
      app.render(true);
      continue;
    }

    const docName =
      app.document?.documentName;

    if (
      docName === "RollTable" ||
      docName === "TableResult"
    ) {
      app.render(true);
    }

  }

}

/**
 * Met à jour les noms dans l'index compendium (tri + recherche Foundry).
 */
export function localizeSdpPackIndex(
  pack,
  rolltableMap = null
) {

  if (!pack?.index?.size) return;

  if (pack.documentName === "Item") {

    for (const entry of pack.index.values()) {

      if (!entry._sdpSourceName) {
        entry._sdpSourceName = entry.name;
      }

      entry.name = getLocalizedItemName(
        entry.type,
        entry.system?.key,
        entry._sdpSourceName
      );

    }

    return;

  }

  if (
    pack.documentName === "RollTable"
  ) {

    for (const entry of pack.index.values()) {

      const flagKey =
        entry.flags?.sdp?.key;

      let localized = null;

      if (flagKey) {

        localized =
          getLocalizedRollTableName({
            flags: { sdp: { key: flagKey } }
          });

      }

      if (!localized && rolltableMap) {

        const localizationKey =
          rolltableMap[entry._id];

        if (localizationKey) {
          localized =
            game.i18n.localize(localizationKey);
        }

      }

      if (!localized) continue;

      if (!entry._sdpSourceName) {
        entry._sdpSourceName = entry.name;
      }

      entry.name = localized;

    }

  }

}

export function localizeAllSdpCompendiumIndices(
  rolltableMap = null
) {

  for (const pack of game.packs) {

    if (pack.metadata.system !== "sdp") continue;

    if (
      pack.documentName === "Item"
      || pack.documentName === "RollTable"
    ) {
      localizeSdpPackIndex(
        pack,
        rolltableMap
      );
    }

  }

}

/**
 * Localise l'index après chaque getIndex() (tri/recherche avant le rendu).
 */
export function installSdpCompendiumIndexLocalization(
  rolltableMap = null
) {

  for (const pack of game.packs) {

    if (pack.metadata.system !== "sdp") continue;

    if (
      pack.documentName !== "Item"
      && pack.documentName !== "RollTable"
    ) continue;

    if (pack._sdpGetIndexWrapped) continue;

    pack._sdpGetIndexWrapped = true;

    const originalGetIndex =
      pack.getIndex.bind(pack);

    pack.getIndex = async function(options) {

      const index =
        await originalGetIndex(options);

      localizeSdpPackIndex(
        pack,
        rolltableMap
      );

      return index;

    };

  }

}

/**
 * Re-rend le compendium une fois après localisation de l'index (tri alphabétique).
 */
export function requestSdpCompendiumResort(
  app,
  rolltableMap = null
) {

  if (!app || app._sdpSortRefreshDone) return false;

  app._sdpSortRefreshDone = true;

  localizeAllSdpCompendiumIndices(rolltableMap);

  queueMicrotask(() => {

    if (app.rendered !== false) {
      app.render(true);
    }

  });

  return true;

}

export function resetSdpCompendiumResortFlag(app) {

  if (app) {
    delete app._sdpSortRefreshDone;
  }

}

/**
 * Index compendium : inclure system.key pour la traduction sans ouvrir l'objet.
 */
export async function indexSdpItemPacks() {

  for (const pack of game.packs) {

    if (pack.metadata.system !== "sdp") continue;
    if (pack.documentName !== "Item") continue;

    await pack.getIndex({
      fields: [
        "name",
        "type",
        "system.key",
        "flags.sdp.key"
      ]
    });

    localizeSdpPackIndex(pack);

  }

}
