/**
 * Résolution des chemins d'assets de scène (maps, miniatures).
 *
 * Sur The Forge, le dossier systems/sdp/assets/ n'est parfois pas déployé
 * alors que le zip GitHub le contient. On bascule alors sur les fichiers
 * hébergés sur GitHub (release tag = version du système).
 */

const REPO = "danazen30/Foundry-system-Spheres-des-Profondeurs";

/** @type {Record<string, string>} */
export const SDP_SCENE_MAP_FILES = {
  "Elysium": "Elysium V1.jpg",
  "Fretanie": "Fretanie V2.jpg",
  "Katrade": "Katrade V4.jpg"
};

export function isHostedEnvironment() {

  return /forge-vtt\.com|foundryserver\.com/i.test(window.location.hostname);

}

export function getCdnMapUrl(filename, version = game.system.version) {

  const tag = `v${version}`;
  return `https://github.com/${REPO}/raw/${tag}/assets/maps/${encodeURIComponent(filename)}`;

}

export function getLocalMapUrl(filename) {

  return `systems/sdp/assets/maps/${filename}`;

}

/**
 * URL de fond pour une scène SDP (Forge → CDN GitHub, sinon chemin système).
 */
export function resolveSceneMapUrl(sceneName) {

  const filename = SDP_SCENE_MAP_FILES[sceneName];

  if (!filename) return null;

  if (isHostedEnvironment()) {
    return getCdnMapUrl(filename);
  }

  return getLocalMapUrl(filename);

}

/**
 * Corrige fond + miniature d'une scène importée si elle fait partie du pack SDP.
 */
export async function patchSceneMapAssets(scene) {

  if (!scene) return false;

  const mapUrl = resolveSceneMapUrl(scene.name);

  if (!mapUrl) return false;

  const current = scene.background?.src ?? "";

  if (current === mapUrl && scene.thumbnail === mapUrl) {
    return false;
  }

  await scene.update({
    "background.src": mapUrl,
    thumbnail: mapUrl
  });

  console.log(`[sdp] Assets scène corrigés : ${scene.name} → ${mapUrl}`);

  return true;

}

/**
 * Corrige toutes les scènes SDP connues (console MJ).
 */
export async function patchAllSdpSceneAssets() {

  let patched = 0;

  for (const name of Object.keys(SDP_SCENE_MAP_FILES)) {
    const scene = game.scenes.getName(name);
    if (scene && await patchSceneMapAssets(scene)) patched++;
  }

  ui.notifications.info(
    game.i18n.format("SDP.Notifications.ScenesAssetsPatched", {
      count: patched
    })
  );

  return patched;

}
