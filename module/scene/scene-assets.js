/**
 * Maps de scènes SDP — même principe que les icônes d'items :
 *   systems/sdp/assets/maps/<fichier>.jpg
 *
 * Au chargement du monde (MJ) :
 *   1. Corrige compendium + scènes importées (chemins worlds/… → systems/sdp/…)
 *   2. Réimporte depuis le compendium si besoin (scene-bootstrap)
 *
 * Secours si le fichier système est absent sur le serveur (rare) :
 *   worlds/<monde>/assets/maps/ puis GitHub raw.
 */

const SDP_SCENES_PACK = "sdp.scenes";
const REPO = "danazen30/Foundry-system-Spheres-des-Profondeurs";

/** @type {Record<string, string>} */
export const SDP_SCENE_MAP_FILES = {
  "Elysium": "Elysium V1.jpg",
  "Fretanie": "Fretanie V2.jpg",
  "Katrade": "Katrade V4.jpg"
};

export function getSystemMapUrl(sceneName) {

  const filename = SDP_SCENE_MAP_FILES[sceneName];
  return filename ? `systems/sdp/assets/maps/${filename}` : null;

}

function getWorldMapUrl(filename) {

  return `worlds/${game.world.id}/assets/maps/${filename}`;

}

function getRemoteMapUrl(filename, version = game.system.version) {

  return `https://raw.githubusercontent.com/${REPO}/v${version}/assets/maps/${encodeURIComponent(filename)}`;

}

/**
 * @param {string} path
 * @returns {Promise<boolean>}
 */
async function pathExistsOnServer(path) {

  if (!path?.startsWith("systems/") && !path?.startsWith("worlds/")) {
    return false;
  }

  try {
    const url = `${window.location.origin}/${path.replace(/^\//, "")}`;
    const response = await fetch(url, { method: "HEAD", cache: "no-store" });
    return response.ok;
  }
  catch {
    return false;
  }

}

/**
 * Chemin canonique — identique aux icônes (systems/sdp/assets/…).
 * @returns {Promise<string|null>}
 */
export async function resolveSceneMapUrl(sceneName) {

  const filename = SDP_SCENE_MAP_FILES[sceneName];
  const systemPath = getSystemMapUrl(sceneName);

  if (!filename || !systemPath) return null;

  if (await pathExistsOnServer(systemPath)) {
    return systemPath;
  }

  const worldPath = getWorldMapUrl(filename);

  if (await pathExistsOnServer(worldPath)) {
    return worldPath;
  }

  return getRemoteMapUrl(filename);

}

function sceneNeedsAssetPatch(scene, mapUrl) {

  if (!scene || !mapUrl) return false;

  const bg = scene.background?.src ?? "";
  const thumb = scene.thumbnail ?? "";

  if (bg === mapUrl && thumb === mapUrl) return false;

  // Anciens exports depuis un monde (vignettes générées par Foundry)
  if (/^worlds\//.test(bg) || /^worlds\//.test(thumb)) return true;

  // Chemins relatifs incorrects (assets/… sans systems/sdp)
  if (bg.startsWith("assets/") && !bg.startsWith("systems/")) return true;
  if (thumb.startsWith("assets/") && !thumb.startsWith("systems/")) return true;

  // URL externe ou autre chemin que le canonique
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
