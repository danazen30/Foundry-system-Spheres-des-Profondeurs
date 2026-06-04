/**
 * Roll tables SDP : flags.sdp.key + recherche partagée.
 */

import { getLocalizedItemName } from "./item-localization.js";

/** @deprecated IDs legacy — utilisés seulement pour migration auto des flags */
export const SDP_ROLLTABLE_FLAG_DEFAULTS = {

  "WzRAb3Ftyu0qFMCa":
    { key: "careerHuman", group: "career" },

  "uiomVIaoy9Drhemu":
    { key: "careerElf", group: "career" },

  "FjSsEkbsWkBkrjWg":
    { key: "species", group: "species" },

  "7ZHAMQWLtvXnaw1N":
    { key: "signRandom", group: "sign" },

  "6AY1b31Cy8uYYBTj":
    { key: "talent", group: "talent" },

  "XZ4ZAHiJvXgmww25":
    { key: "critical-attack-failure", group: "combat" },

  "6Q4OF1ap29CkArDj":
    { key: "major-magical-consequence", group: "combat" },

  "VVHLBG4r2WP3Ssrs":
    { key: "minor-magical-consequence", group: "combat" }

};

/** Alias rétrocompatibilité */
export const SDP_ROLLTABLE_GAME_KEYS = Object.fromEntries(
  Object.entries(SDP_ROLLTABLE_FLAG_DEFAULTS).map(
    ([id, { key }]) => [id, key]
  )
);

const LEGACY_ROLLTABLE_I18N = {

  careerHuman: "SDP.RollTableCareerHuman",
  careerElf: "SDP.RollTableCareerElf",
  signRandom: "SDP.RollTableSignRandom",
  species: "SDP.RollTableSpecies",
  talent: "SDP.RollTableTalent",
  corruption: "SDP.RollTableCorruption",
  "critical-attack-failure": "SDP.RollTableCriticalAttackFailure",
  "major-magical-consequence": "SDP.RollTableMajorMagicalConsequence",
  "minor-magical-consequence": "SDP.RollTableMinorMagicalConsequence"

};

const SDP_ROLLTABLE_NAME_HINTS = {

  "career human": { key: "careerHuman", group: "career" },
  "carrière humain": { key: "careerHuman", group: "career" },
  "career elf": { key: "careerElf", group: "career" },
  "carrière elfe": { key: "careerElf", group: "career" },
  "species table": { key: "species", group: "species" },
  "table des espèces": { key: "species", group: "species" },
  "sign random": { key: "signRandom", group: "sign" },
  "table des signes": { key: "signRandom", group: "sign" },
  "talents": { key: "talent", group: "talent" },
  "table des talents": { key: "talent", group: "talent" },
  "corruption": { key: "corruption", group: "corruption" },
  "table de corruption": { key: "corruption", group: "corruption" }

};

function normalizeRollTableKey(key = "") {

  return key
    .toLowerCase()
    .trim()
    .replaceAll("-", " ");

}

/**
 * Nom affiché d'une RollTable SDP (flags.sdp.key → i18n).
 */
export function getLocalizedRollTableName(table) {

  if (!table) return "";

  const flagKey =
    table.flags?.sdp?.key;

  if (flagKey) {

    const primaryKey =
      `SDP.RollTable.${flagKey}.Name`;

    if (game.i18n.has(primaryKey)) {
      return game.i18n.localize(primaryKey);
    }

    const legacyKey =
      LEGACY_ROLLTABLE_I18N[flagKey];

    if (
      legacyKey &&
      game.i18n.has(legacyKey)
    ) {
      return game.i18n.localize(legacyKey);
    }

  }

  return table.name ?? "";

}

/**
 * Liste les tables d'un compendium par flags.sdp.group.
 */
export async function listSdpRollTables(
  pack,
  group
) {

  if (!pack) return [];

  const tables =
    await pack.getDocuments();

  return tables

    .filter(t =>
      t.flags?.sdp?.group === group
    )

    .map(t => ({
      id: t.uuid,
      key: t.flags?.sdp?.key ?? "",
      localizedName:
        getLocalizedRollTableName(t)
    }))

    .sort((a, b) =>
      a.localizedName.localeCompare(
        b.localizedName,
        game.i18n.lang
      )
    );

}

/**
 * Résout une table par UUID, clé sdp ou id document.
 */
export async function resolveSdpRollTable(
  pack,
  ref
) {

  if (!pack || !ref) return null;

  if (
    typeof ref === "string" &&
    ref.includes("Compendium.")
  ) {
    return await fromUuid(ref);
  }

  const tables =
    await pack.getDocuments();

  const match =
    tables.find(t =>
      t.uuid === ref ||
      t.id === ref ||
      t.flags?.sdp?.key === ref
    );

  if (match) return match;

  return findSdpRollTable(pack, ref);

}

function resolveFlagDefaults(table) {

  if (!table) return null;

  const byId =
    SDP_ROLLTABLE_FLAG_DEFAULTS[table.id];

  if (byId) return byId;

  const normalized =
    (table.name || "")
      .toLowerCase()
      .trim();

  return SDP_ROLLTABLE_NAME_HINTS[normalized] ?? null;

}

/**
 * Trouve une table par flags.sdp.key, avec repli sur le nom anglais legacy.
 */
export async function findSdpRollTable(pack, tableKey) {

  if (!pack || !tableKey)
    return null;

  const tables =
    await pack.getDocuments();

  const byFlag =
    tables.find(t =>
      t.flags?.sdp?.key === tableKey
    );

  if (byFlag)
    return byFlag;

  const normalized =
    normalizeRollTableKey(tableKey);

  return tables.find(t =>
    (t.name || "")
      .toLowerCase()
      .trim() === normalized
  ) ?? null;

}

/**
 * Pose flags.sdp.key / flags.sdp.group sur les tables du compendium.
 */
export async function applySdpRollTableFlags(pack) {

  if (!pack || !game.user.isGM) {
    return { updated: [], skipped: [] };
  }

  const tables =
    await pack.getDocuments();

  const updated = [];
  const skipped = [];

  for (const table of tables) {

    const defaults =
      resolveFlagDefaults(table);

    if (!defaults) {
      skipped.push(table.name);
      continue;
    }

    const currentKey =
      table.flags?.sdp?.key;

    const currentGroup =
      table.flags?.sdp?.group;

    if (
      currentKey === defaults.key &&
      currentGroup === defaults.group
    ) {
      continue;
    }

    await table.update({
      "flags.sdp.key": defaults.key,
      "flags.sdp.group": defaults.group
    });

    updated.push({
      name: table.name,
      key: defaults.key,
      group: defaults.group,
      uuid: table.uuid
    });

  }

  return { updated, skipped };

}

/** @deprecated Utiliser applySdpRollTableFlags */
export async function ensureSdpRollTableFlags(pack) {

  return applySdpRollTableFlags(pack);

}

/**
 * Charge le document lié à un résultat de table (compendium ou monde).
 */
export async function resolveTableResultDocument(result) {

  if (!result) return null;

  if (result.documentUuid) {

    try {
      return await fromUuid(result.documentUuid);
    }
    catch (err) {
      console.warn("SDP | resolveTableResultDocument", err);
    }

  }

  const collection =
    result.documentCollection;

  const id =
    result.documentId;

  if (!collection || !id)
    return null;

  if (collection.startsWith("Compendium.")) {

    const pack =
      game.packs.get(collection);

    if (!pack)
      return null;

    const indexEntry =
      pack.index.get(id);

    if (
      indexEntry?.type &&
      indexEntry?.system?.key
    ) {
      return {
        documentName: "Item",
        type: indexEntry.type,
        system: {
          key: indexEntry.system.key
        },
        name: indexEntry.name
      };
    }

    try {
      return await pack.getDocument(id);
    }
    catch (err) {
      console.warn("SDP | resolveTableResultDocument", err);
    }

    return null;

  }

  const worldCollection =
    game.collections.get(collection);

  return worldCollection?.get(id) ?? null;

}

/**
 * Nom affiché d'un résultat document (ex. signe dolphin → Dauphin).
 */
export async function getLocalizedTableResultName(result) {

  const fallback =
    result?.name?.trim?.() ?? "";

  if (
    !result?.documentUuid &&
    !result?.documentId
  ) {
    return fallback;
  }

  const doc =
    await resolveTableResultDocument(result);

  if (!doc)
    return fallback;

  if (
    doc.documentName === "Item" ||
    doc.type
  ) {
    return getLocalizedItemName(
      doc.type,
      doc.system?.key,
      fallback || doc.name
    );
  }

  return fallback || doc.name;

}

function findResultRow(
  root,
  {
    resultId = null,
    resultIndex = null
  } = {}
) {

  let row =
    resultId
      ? root.querySelector(
          `[data-result-id="${resultId}"], [data-entry-id="${resultId}"]`
        )
      : null;

  if (
    !row &&
    resultIndex !== null
  ) {

    const rows =
      root.querySelectorAll(
        "table[data-results] tbody tr[data-result-id]"
      );

    row = rows[resultIndex] ?? null;

  }

  return row;

}

function applyLocalizedResultRow(
  root,
  {
    resultId = null,
    resultIndex = null,
    localized = "",
    imageSrc = ""
  } = {}
) {

  const row =
    findResultRow(
      root,
      { resultId, resultIndex }
    );

  if (!row)
    return;

  const imageCell =
    row.querySelector("td.image");

  if (imageCell) {

    imageCell.querySelectorAll(
      ".sdp-localized-result-name"
    ).forEach(el => el.remove());

    [...imageCell.childNodes].forEach(node => {

      if (node.nodeType === Node.TEXT_NODE) {
        node.remove();
      }

    });

    if (imageSrc) {

      let img =
        imageCell.querySelector("img");

      if (!img) {

        img =
          document.createElement("img");

        img.loading = "lazy";
        img.alt = "";

        imageCell.appendChild(img);

      }

      img.src = imageSrc;

    }

  }

  if (!localized)
    return;

  const detailsCell =
    row.querySelector("td.details");

  if (!detailsCell)
    return;

  const link =
    detailsCell.querySelector(".content-link");

  if (link) {
    link.textContent = localized;
    return;
  }

  const nameEl =
    detailsCell.querySelector("strong.name");

  if (nameEl) {
    nameEl.textContent = localized;
  }

}

function applyLocalizedResultName(
  root,
  localized,
  {
    resultId = null,
    resultIndex = null,
    replaceNameInput = false,
    originalName = ""
  } = {}
) {

  if (!root || !localized)
    return;

  if (replaceNameInput) {

    const nameInput =
      root.querySelector('input[name="name"]');

    if (nameInput) {

      nameInput.style.display = "none";

      let span =
        nameInput.parentElement?.querySelector(
          ".sdp-localized-result-name"
        );

      if (
        !span &&
        nameInput.parentElement
      ) {

        span =
          document.createElement("span");

        span.className =
          "sdp-localized-result-name";

        nameInput.parentElement.insertBefore(
          span,
          nameInput
        );

      }

      if (span) {
        span.textContent = localized;
      }

    }

    const windowTitle =
      root.querySelector(".window-title");

    if (
      windowTitle &&
      originalName &&
      windowTitle.textContent.includes(originalName)
    ) {
      windowTitle.textContent =
        windowTitle.textContent.replace(
          originalName,
          localized
        );
    }

    return;

  }

  applyLocalizedResultRow(
    root,
    {
      resultId,
      resultIndex,
      localized
    }
  );

}

/**
 * Localise les noms des résultats sur la fiche RollTable.
 */
export async function localizeRollTableSheet(table, root) {

  if (!table?.results?.size || !root)
    return;

  const results =
    [...table.results].sort(
      (a, b) =>
        (a.range?.[0] ?? 0)
        - (b.range?.[0] ?? 0)
    );

  for (const [index, result] of results.entries()) {

    if (
      !result.documentUuid &&
      !result.documentId
    ) {
      continue;
    }

    const localized =
      await getLocalizedTableResultName(result);

    if (!localized)
      continue;

    const doc =
      await resolveTableResultDocument(result);

    const imageSrc =
      result.icon
      || result.img
      || doc?.img
      || "";

    applyLocalizedResultRow(
      root,
      {
        resultId: result.id,
        resultIndex: index,
        localized,
        imageSrc
      }
    );

  }

}

/**
 * Localise la fenêtre d'édition d'un résultat (TableResult).
 */
export async function localizeTableResultConfig(result, root) {

  if (!result || !root)
    return;

  const localized =
    await getLocalizedTableResultName(result);

  if (!localized)
    return;

  applyLocalizedResultName(
    root,
    localized,
    {
      resultId: result.id,
      replaceNameInput: true,
      originalName: result.name
    }
  );

}

/**
 * Localise les liens d'objets dans un message de chat (tirage de table).
 */
export async function localizeRollTableChatLinks(root) {

  if (!root)
    return;

  for (const link of root.querySelectorAll(".content-link")) {

    const uuid =
      link.dataset.uuid;

    if (!uuid)
      continue;

    let doc;

    try {
      doc = await fromUuid(uuid);
    }
    catch (err) {
      continue;
    }

    if (doc?.documentName !== "Item")
      continue;

    const localized =
      getLocalizedItemName(
        doc.type,
        doc.system?.key,
        link.textContent
      );

    if (localized) {
      link.textContent = localized;
    }

  }

}
