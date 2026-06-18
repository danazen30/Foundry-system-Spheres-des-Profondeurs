/**
 * Provisionne les maps SDP dans le stockage accessible du monde.
 *
 * Sur The Forge, systems/sdp/assets/maps n'est souvent pas déployé.
 * On copie alors automatiquement les JPG dans worlds/<monde>/assets/maps/sdp/
 * (source locale ou téléchargement GitHub), puis les scènes pointent vers ce dossier.
 */

const REPO = "danazen30/Foundry-system-Spheres-des-Profondeurs";
export const MAPS_PROVISION_SETTING = "sceneMapsProvisionVersion";

/** @type {Record<string, string>} */
export const SDP_SCENE_MAP_FILES = {
  "Elysium": "Elysium V1.jpg",
  "Fretanie": "Fretanie V2.jpg",
  "Katrade": "Katrade V4.jpg"
};

const SYSTEM_MAPS_DIR = "systems/sdp/assets/maps";

/** @type {Record<string, string>|null} */
let resolvedMapPaths = null;

function getFilePicker() {

  return foundry.applications.apps.FilePicker.implementation;

}

function isForgeEnvironment() {

  return Boolean(game.modules.get("forge")?.active)
    || /forge-vtt\.com/i.test(window.location.hostname);

}

function getUploadSource() {

  return isForgeEnvironment() ? "forgevtt" : "data";

}

function getWorldMapsDir() {

  return `worlds/${game.world.id}/assets/maps/sdp`;

}

function getRemoteMapUrl(filename, version = game.system.version) {

  return `https://raw.githubusercontent.com/${REPO}/v${version}/assets/maps/${encodeURIComponent(filename)}`;

}

function getRemoteMapFallbackUrls(filename) {

  const version = game.system.version;
  const candidates = [
    getRemoteMapUrl(filename, version),
    getRemoteMapUrl(filename, "0.1.7"),
    `https://raw.githubusercontent.com/${REPO}/main/assets/maps/${encodeURIComponent(filename)}`
  ];

  return [...new Set(candidates)];

}

function buildPublicUrl(relativePath) {

  const segments = relativePath.replace(/^\//, "").split("/");
  return `${window.location.origin}/${segments.map(encodeURIComponent).join("/")}`;

}

/**
 * @param {string} relativePath
 * @returns {Promise<boolean>}
 */
async function pathExistsViaHttp(relativePath) {

  if (!relativePath) return false;

  try {
    const response = await fetch(buildPublicUrl(relativePath), {
      method: "HEAD",
      cache: "no-store"
    });
    return response.ok;
  }
  catch {
    return false;
  }

}

/**
 * @param {string} directory
 * @param {string} filename
 * @returns {Promise<boolean>}
 */
async function fileExistsInDirectory(directory, filename) {

  const FP = getFilePicker();

  for (const source of [getUploadSource(), "data"]) {
    try {
      const result = await FP.browse(source, directory);
      if (result?.files?.includes(filename)) return true;
    }
    catch {
      // essayer la source suivante
    }
  }

  return pathExistsViaHttp(`${directory}/${filename}`);

}

/**
 * @param {string} filename
 * @returns {Promise<Blob>}
 */
async function fetchMapBlob(filename) {

  const systemPath = `${SYSTEM_MAPS_DIR}/${filename}`;

  if (await pathExistsViaHttp(systemPath)) {
    const response = await fetch(buildPublicUrl(systemPath), { cache: "no-store" });
    if (response.ok) return response.blob();
  }

  const remoteUrls = getRemoteMapFallbackUrls(filename);

  for (const remoteUrl of remoteUrls) {
    const response = await fetch(remoteUrl, { cache: "no-store" });
    if (response.ok) return response.blob();
  }

  throw new Error(`Impossible de télécharger ${filename}`);

}

/**
 * @param {string} filename
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
async function uploadMapToWorld(filename, blob) {

  const FP = getFilePicker();
  const uploadDir = getWorldMapsDir();
  const file = new File([blob], filename, { type: blob.type || "image/jpeg" });

  const response = await FP.upload(
    getUploadSource(),
    uploadDir,
    file,
    {},
    { notify: false }
  );

  return response.path ?? `${uploadDir}/${filename}`;

}

/**
 * Installe les maps manquantes et retourne le chemin utilisable par scène.
 * @returns {Promise<Record<string, string>>}
 */
export async function ensureSdpSceneMaps() {

  if (!game.user.isGM) {
    return resolvedMapPaths ?? {};
  }

  const paths = {};
  let uploaded = 0;
  const worldMapsDir = getWorldMapsDir();

  for (const [sceneName, filename] of Object.entries(SDP_SCENE_MAP_FILES)) {

    const systemPath = `${SYSTEM_MAPS_DIR}/${filename}`;
    const worldPath = `${worldMapsDir}/${filename}`;

    if (!isForgeEnvironment() && await pathExistsViaHttp(systemPath)) {
      paths[sceneName] = systemPath;
      continue;
    }

    if (await fileExistsInDirectory(worldMapsDir, filename)) {
      paths[sceneName] = worldPath;
      continue;
    }

    try {
      console.log(`[sdp] Installation map "${filename}" → ${worldMapsDir}`);
      const blob = await fetchMapBlob(filename);
      paths[sceneName] = await uploadMapToWorld(filename, blob);
      uploaded++;
    }
    catch (error) {
      console.error(`[sdp] Échec installation map ${filename}:`, error);

      if (await pathExistsViaHttp(systemPath)) {
        paths[sceneName] = systemPath;
      }
      else {
        paths[sceneName] = getRemoteMapUrl(filename);
      }
    }

  }

  resolvedMapPaths = paths;

  const version = game.system.version;
  const previous = game.settings.get("sdp", MAPS_PROVISION_SETTING);

  if (uploaded > 0 || previous !== version) {
    await game.settings.set("sdp", MAPS_PROVISION_SETTING, version);
  }

  if (uploaded > 0) {
    ui.notifications.info(
      game.i18n.format("SDP.Notifications.ScenesMapsProvisioned", {
        count: uploaded
      })
    );
  }

  return paths;

}

/**
 * Chemin résolu pour une scène (après ensureSdpSceneMaps).
 * @param {string} sceneName
 * @returns {string|null}
 */
export function getResolvedSceneMapPath(sceneName) {

  if (resolvedMapPaths?.[sceneName]) {
    return resolvedMapPaths[sceneName];
  }

  const filename = SDP_SCENE_MAP_FILES[sceneName];
  return filename ? `${SYSTEM_MAPS_DIR}/${filename}` : null;

}

export function clearResolvedSceneMapCache() {

  resolvedMapPaths = null;

}
