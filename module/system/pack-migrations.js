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
