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

  game.settings.register("sdp", "removedLuckyStubbornCareerTalents", {
    name: "SDP Removed Lucky And Stubborn Career Talents",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

}

const CAREER_TALENTS_TO_DROP = new Set(["lucky", "stubborn"]);

function withoutDroppedCareerTalents(raw) {

  const parts = Array.isArray(raw)
    ? raw.map(part => String(part).trim())
    : String(raw ?? "").split(",").map(part => part.trim());

  const next = parts.filter(part =>
    part && !CAREER_TALENTS_TO_DROP.has(part)
  );

  return Array.isArray(raw) ? next : next.join(",");

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

export async function removeLuckyAndStubbornCareerTalents() {

  if (!game.user.isGM) return;

  if (game.settings.get("sdp", "removedLuckyStubbornCareerTalents")) return;

  const pack = game.packs.get("sdp.careers");

  if (!pack) return;

  const wasLocked = pack.locked;

  if (wasLocked) await pack.configure({ locked: false });

  try {

    const careers = (await pack.getDocuments())
      .filter(doc => doc.type === "career");

    for (const career of careers) {

      const before = career.system?.talents;
      const after = withoutDroppedCareerTalents(before);

      const unchanged = Array.isArray(before)
        ? Array.isArray(after)
          && before.length === after.length
          && before.every((part, index) => part === after[index])
        : before === after;

      if (unchanged) continue;

      await career.update({ "system.talents": after });
      console.log(
        `[sdp] ${career.name} : Chanceux et Obstiné retirés des talents de carrière.`
      );

    }

  } finally {
    if (wasLocked) await pack.configure({ locked: true });
  }

  await game.settings.set("sdp", "removedLuckyStubbornCareerTalents", true);

}
