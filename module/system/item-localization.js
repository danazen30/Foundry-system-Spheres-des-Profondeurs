/**
 * Localisation des noms d'objets et dossiers SDP
 * (barre latérale, compendiums, etc.)
 */

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

export function localizeRolltableCompendium(element, rolltableMap) {

  localizeItemDirectory(element, (entry) => {

    const documentId = entry.dataset.entryId;

    if (!documentId) return null;

    const localizationKey =
      rolltableMap[documentId];

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
    }

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
        "system.key",
        "flags.sdp.key"
      ]
    });

  }

}
