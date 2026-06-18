/**
 * Importe les scènes SDP depuis le compendium système au premier lancement d'un monde
 * et affiche la scène de départ.
 *
 * Définir la scène de départ (console MJ) :
 *   await game.sdp.setCompendiumStartScene("Elysium")
 */

import { patchAllSdpSceneAssets, patchCompendiumSceneAssets, patchSceneMapAssets } from "./scene-assets.js";
import { ensureSdpSceneMaps, MAPS_PROVISION_SETTING } from "./scene-map-provision.js";

export const SDP_SCENES_PACK = "sdp.scenes";
const IMPORT_SETTING = "scenesInitialized";
const START_VIEWED_SETTING = "startSceneViewed";
const START_SCENE_NAME_SETTING = "startSceneName";

export function registerSceneBootstrapSettings() {

  game.settings.register("sdp", IMPORT_SETTING, {
    name: "SDP Scenes Initialized",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register("sdp", START_VIEWED_SETTING, {
    name: "SDP Start Scene Viewed",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register("sdp", START_SCENE_NAME_SETTING, {
    name: "SDP Start Scene Name",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  game.settings.register("sdp", MAPS_PROVISION_SETTING, {
    name: "SDP Scene Maps Provision Version",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

}

function hasStartSceneFlag(scene) {

  const value =
    scene.getFlag?.("sdp", "startScene")
    ?? scene.flags?.sdp?.startScene;

  return value === true;

}

function hasStartKey(scene) {

  const key =
    scene.getFlag?.("sdp", "key")
    ?? scene.flags?.sdp?.key;

  return key === "start";

}

function sortScenes(scenes) {

  return [...scenes].sort((a, b) => {
    if (a.sort !== b.sort) return a.sort - b.sort;
    return a.name.localeCompare(b.name, game.i18n.lang);
  });

}

function pickStartingScene(candidates) {

  if (!candidates.length) return null;

  const flagged = candidates.filter(hasStartSceneFlag);

  if (flagged.length) {
    return sortScenes(flagged)[0];
  }

  const keyed = candidates.filter(hasStartKey);

  if (keyed.length) {
    return sortScenes(keyed)[0];
  }

  return sortScenes(candidates)[0];

}

/**
 * Détermine la scène de départ à partir des documents du compendium.
 */
export async function resolveCompendiumStartingScene(pack) {

  if (!pack) return null;

  const documents = await pack.getDocuments();

  return pickStartingScene(documents);

}

/**
 * Retrouve la scène du monde à partir d'un document compendium.
 */
export function findImportedScene(compendiumScene) {

  if (!compendiumScene) return null;

  const byName = game.scenes.getName(compendiumScene.name);

  if (byName) return byName;

  const sourceUuid = compendiumScene.uuid;

  return game.scenes.find(scene =>
    scene._stats?.compendiumSource === sourceUuid
    || scene.getFlag?.("core", "sourceId") === sourceUuid
  ) ?? null;

}

/**
 * Scène à afficher au premier lancement.
 */
export function resolveSdpStartingScene({
  compendiumScene = null,
  sceneName = null
} = {}) {

  const name =
    sceneName
    || compendiumScene?.name
    || game.settings.get("sdp", START_SCENE_NAME_SETTING);

  if (name) {
    const byName = game.scenes.getName(name);
    if (byName) return byName;
  }

  if (compendiumScene) {
    return findImportedScene(compendiumScene);
  }

  return pickStartingScene(game.scenes.contents);

}

/**
 * Marque une scène du compendium comme scène de départ (MJ).
 */
export async function setCompendiumStartScene(sceneName) {

  const pack = game.packs.get(SDP_SCENES_PACK);

  if (!pack) {
    throw new Error(`Compendium introuvable : ${SDP_SCENES_PACK}`);
  }

  const wasLocked = pack.locked;

  if (wasLocked) {
    await pack.configure({ locked: false });
  }

  const documents = await pack.getDocuments();
  const target = documents.find(doc => doc.name === sceneName);

  if (!target) {
    if (wasLocked) await pack.configure({ locked: true });
    throw new Error(
      `Scène "${sceneName}" introuvable dans ${SDP_SCENES_PACK}`
    );
  }

  for (const doc of documents) {
    await doc.setFlag("sdp", "startScene", doc.id === target.id);
  }

  if (wasLocked) {
    await pack.configure({ locked: true });
  }

  await game.settings.set("sdp", START_SCENE_NAME_SETTING, sceneName);

  console.log(`[sdp] Scène de départ du compendium : ${sceneName}`);

  ui.notifications.info(
    game.i18n.format("SDP.Notifications.StartSceneSet", {
      name: sceneName
    })
  );

  return target;

}

async function importScenesFromPack(pack, startingDoc) {

  const documents = await pack.getDocuments();
  const starting = startingDoc ?? pickStartingScene(documents);
  const others = documents.filter(doc => doc.id !== starting?.id);

  for (const doc of sortScenes(others)) {
    await game.scenes.importFromCompendium(pack, doc.id);
    const imported = findImportedScene(doc);
    await patchSceneMapAssets(imported);
  }

  if (starting) {
    await game.scenes.importFromCompendium(pack, starting.id);
    const imported = findImportedScene(starting);
    await patchSceneMapAssets(imported);
  }

  if (starting) {
    await game.settings.set("sdp", START_SCENE_NAME_SETTING, starting.name);
  }

  return {
    count: documents.length,
    startingName: starting?.name ?? null
  };

}

async function activateStartingScene(scene) {

  if (!scene) return false;

  for (const other of game.scenes) {
    if (other.id !== scene.id && other.active) {
      await other.update({ active: false });
    }
  }

  if (!scene.active) {
    await scene.update({ active: true });
  }

  await scene.view();

  if (canvas.scene?.id !== scene.id) {
    await new Promise(resolve => setTimeout(resolve, 300));
    await scene.view();
  }

  console.log(
    `[sdp] Canvas actif : ${canvas.scene?.name ?? "?"}`
      + ` (attendu : ${scene.name})`
  );

  return canvas.scene?.id === scene.id;

}

function shouldSkipStartView(startScene, force) {

  if (force || !startScene) return false;

  const startViewed = game.settings.get("sdp", START_VIEWED_SETTING);
  const canvasMatches = canvas.scene?.id === startScene.id;

  return startViewed && canvasMatches;

}

/**
 * Importe les scènes du compendium et affiche la scène de départ (MJ, une fois par monde).
 */
export async function bootstrapSdpScenes({
  force = false
} = {}) {

  if (!game.user.isGM) {
    return { imported: 0, skipped: true };
  }

  let imported = 0;
  let startingName = game.settings.get("sdp", START_SCENE_NAME_SETTING);
  let compendiumStartingScene = null;

  try {

    // Installe les maps dans le monde si besoin (Forge : systems/sdp/assets/maps absent)
    await ensureSdpSceneMaps();

    const pack = game.packs.get(SDP_SCENES_PACK);
    const initialized = game.settings.get("sdp", IMPORT_SETTING);

    if (pack) {
      compendiumStartingScene =
        await resolveCompendiumStartingScene(pack);

      if (compendiumStartingScene?.name) {
        startingName = compendiumStartingScene.name;
      }
    }

    if (pack && (force || !initialized)) {

      const index = await pack.getIndex({ force: true });

      if (!index.size) {
        console.warn(
          "[sdp] Compendium scènes vide — exportez vos scènes vers sdp.scenes"
        );
      }
      else if (force || game.scenes.size === 0) {

        const result = await importScenesFromPack(
          pack,
          compendiumStartingScene
        );

        imported = result.count;
        startingName = result.startingName ?? startingName;

        ui.sidebar?.tabs?.scenes?.render?.(true);

        if (imported > 0) {
          ui.notifications.info(
            game.i18n.format("SDP.Notifications.ScenesInitialized", {
              count: imported
            })
          );
        }

      }

      if (index.size || game.scenes.size > 0) {
        await game.settings.set("sdp", IMPORT_SETTING, true);
      }

    }
    else if (!pack) {
      console.warn(`[sdp] Compendium introuvable : ${SDP_SCENES_PACK}`);
    }

    const startScene = resolveSdpStartingScene({
      compendiumScene: compendiumStartingScene,
      sceneName: startingName
    });

    // Corrige fond + miniature avec chemins provisionnés (monde ou système)
    await patchAllSdpSceneAssets();

    if (shouldSkipStartView(startScene, force)) {
      return {
        imported,
        skipped: true,
        startScene: startScene?.name ?? null
      };
    }

    if (startScene) {
      console.log(`[sdp] Scène de départ : ${startScene.name}`);
      await activateStartingScene(startScene);
      await game.settings.set("sdp", START_VIEWED_SETTING, true);
      await game.settings.set("sdp", START_SCENE_NAME_SETTING, startScene.name);
    }

    return {
      imported,
      skipped: false,
      startScene: startScene?.name ?? null,
      canvasScene: canvas.scene?.name ?? null
    };

  }
  catch (error) {
    console.error("[sdp] Échec bootstrap scènes :", error);
    return { imported, skipped: true, error };
  }

}
