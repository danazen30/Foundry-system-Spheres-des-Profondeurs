/**
 * Chemins des maps de scènes SDP.
 *
 * Les icônes restent dans systems/sdp/assets/icons/.
 * Les maps sont provisionnées automatiquement (voir scene-map-provision.js) :
 *   - local : systems/sdp/assets/maps/
 *   - Forge / hébergé : worlds/<monde>/assets/maps/sdp/
 */

import {
  ensureSdpSceneMaps,
  getResolvedSceneMapPath,
  SDP_SCENE_MAP_FILES
} from "./scene-map-provision.js";

const SDP_SCENES_PACK = "sdp.scenes";

export { SDP_SCENE_MAP_FILES };

export function getSystemMapUrl(sceneName) {

  const filename = SDP_SCENE_MAP_FILES[sceneName];
  return filename ? `systems/sdp/assets/maps/${filename}` : null;

}

/**
 * @returns {Promise<string|null>}
 */
export async function resolveSceneMapUrl(sceneName) {

  await ensureSdpSceneMaps();
  return getResolvedSceneMapPath(sceneName);

}

function sceneNeedsAssetPatch(scene, mapUrl) {

  if (!scene || !mapUrl) return false;

  const bg = scene.background?.src ?? "";
  const thumb = scene.thumbnail ?? "";

  if (bg === mapUrl && thumb === mapUrl) return false;

  if (/^worlds\/.*\/assets\/scenes\//.test(bg)) return true;
  if (/^worlds\/.*\/assets\/scenes\//.test(thumb)) return true;
  if (/^worlds\//.test(bg) || /^worlds\//.test(thumb)) return true;

  if (bg.startsWith("assets/") && !bg.startsWith("systems/")) return true;
  if (thumb.startsWith("assets/") && !thumb.startsWith("systems/")) return true;

  if (bg.startsWith("systems/sdp/assets/maps/") && bg !== mapUrl) return true;
  if (thumb.startsWith("systems/sdp/assets/maps/") && thumb !== mapUrl) return true;

  if (/^https?:\/\//.test(bg) || /^https?:\/\//.test(thumb)) return true;

  return bg !== mapUrl || thumb !== mapUrl;

}

/**
 * @param {Scene|SceneDocument} scene
 */
export async function patchSceneMapAssets(scene) {

  if (!scene) return false;

  const mapUrl = await resolveSceneMapUrl(scene.name);

  if (!mapUrl || !sceneNeedsAssetPatch(scene, mapUrl)) return false;

  await scene.update({
    "background.src": mapUrl,
    thumbnail: mapUrl
  });

  console.log(`[sdp] Scène "${scene.name}" → ${mapUrl}`);

  return true;

}

/**
 * Corrige le compendium système (vignettes + fonds).
 */
export async function patchCompendiumSceneAssets() {

  if (!game.user.isGM) return 0;

  const pack = game.packs.get(SDP_SCENES_PACK);

  if (!pack) return 0;

  const wasLocked = pack.locked;

  if (wasLocked) await pack.configure({ locked: false });

  let patched = 0;

  try {
    for (const doc of await pack.getDocuments()) {
      if (await patchSceneMapAssets(doc)) patched++;
    }
  }
  finally {
    if (wasLocked) await pack.configure({ locked: true });
  }

  return patched;

}

/**
 * Corrige compendium + scènes du monde (appel auto au ready + console).
 */
export async function patchAllSdpSceneAssets() {

  if (!game.user.isGM) return { world: 0, compendium: 0 };

  await ensureSdpSceneMaps();

  const compendium = await patchCompendiumSceneAssets();

  let world = 0;

  for (const name of Object.keys(SDP_SCENE_MAP_FILES)) {
    const scene = game.scenes.getName(name);
    if (scene && await patchSceneMapAssets(scene)) world++;
  }

  if (world + compendium > 0) {
    ui.notifications.info(
      game.i18n.format("SDP.Notifications.ScenesAssetsPatched", {
        count: world + compendium
      })
    );
  }

  ui.sidebar?.tabs?.scenes?.render?.(true);
  ui.sidebar?.tabs?.compendium?.render?.(true);

  return { world, compendium };

}
