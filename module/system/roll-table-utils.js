/**
 * Roll tables SDP : flags.sdp.key + recherche partagée.
 */

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
