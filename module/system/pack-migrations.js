/**
 * Migrations compendiums (suppression d'entrées obsolètes).
 */

export function registerPackMigrationSettings() {

  game.settings.register("sdp", "removedTradeAlchemist", {
    name: "SDP Removed Trade Alchemist",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register("sdp", "renamedIntendCareer", {
    name: "SDP Renamed Intend Career",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

}

export async function removeTradeAlchemistSkill() {

  if (!game.user.isGM) return;

  if (game.settings.get("sdp", "removedTradeAlchemist")) return;

  const pack = game.packs.get("sdp.skills");

  if (!pack) return;

  const wasLocked = pack.locked;

  if (wasLocked) await pack.configure({ locked: false });

  try {

    const target = (await pack.getDocuments())
      .find(doc => doc.system?.key === "tradealchemist");

    if (target) {
      await target.delete();
      console.log("[sdp] Savoir-faire (Alchimiste) retiré du compendium.");
    }

  }
  finally {
    if (wasLocked) await pack.configure({ locked: true });
  }

  await game.settings.set("sdp", "removedTradeAlchemist", true);

}

export async function renameIntendCareer() {

  if (!game.user.isGM) return;

  if (game.settings.get("sdp", "renamedIntendCareer")) return;

  const pack = game.packs.get("sdp.careers");

  if (!pack) return;

  const wasLocked = pack.locked;

  if (wasLocked) await pack.configure({ locked: false });

  try {

    const target = (await pack.getDocuments()).find(doc =>
      doc.type === "career"
      && (
        doc.system?.key === "intend"
        || String(doc.name || "").toLowerCase() === "intend"
      )
    );

    if (target) {

      const updates = {
        name: "Intendant",
        "system.key": "intendant"
      };

      if (String(target.system?.careerGroup || "").toLowerCase() === "intend") {
        updates["system.careerGroup"] = "intendant";
      }

      await target.update(updates);
      console.log("[sdp] Carrière intend renommée en intendant.");

    }

  } finally {
    if (wasLocked) await pack.configure({ locked: true });
  }

  await game.settings.set("sdp", "renamedIntendCareer", true);

}
