/**
 * Roll tables SDP : flags.sdp.key + recherche partagée.
 */

import { getLocalizedItemName } from "./item-localization.js";

export const SDP_ROLLTABLE_GAME_KEYS = {

  "XZ4ZAHiJvXgmww25":
    "critical-attack-failure",

  "6Q4OF1ap29CkArDj":
    "major-magical-consequence",

  "VVHLBG4r2WP3Ssrs":
    "minor-magical-consequence"

};

function normalizeRollTableKey(key = "") {

  return key
    .toLowerCase()
    .trim()
    .replaceAll("-", " ");

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
 * Pose flags.sdp.key sur les tables de jeu connues (GM, compendium sdp.rolltables).
 */
export async function ensureSdpRollTableFlags(pack) {

  if (!pack || !game.user.isGM)
    return;

  for (const [id, key] of Object.entries(SDP_ROLLTABLE_GAME_KEYS)) {

    try {

      const doc =
        await pack.getDocument(id);

      if (!doc)
        continue;

      if (doc.flags?.sdp?.key === key)
        continue;

      await doc.update({
        "flags.sdp.key": key
      });

    }
    catch (err) {

      console.warn(
        `SDP: impossible de poser flags.sdp.key sur la table ${id}`,
        err
      );

    }

  }

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
