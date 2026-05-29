/**
 * Localisation des noms d'objets SDP (barre latérale, compendiums, etc.)
 */

export function getLocalizedItemName(type, key, fallback = "") {

  if (!type || !key) return fallback;

  const itemType =
    type.charAt(0).toUpperCase()
    + type.slice(1);

  const translationKey =
    `SDP.Item.${itemType}.${key}.Name`;

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
      fields: ["system.key"]
    });

  }

}
