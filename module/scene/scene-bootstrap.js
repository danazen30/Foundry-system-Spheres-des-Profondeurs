/**
 * Premier lancement MJ : importe les scènes SDP et affiche Elysium.
 */

export const SDP_SCENES_PACK = "sdp.scenes";
const START_SCENE = "Elysium";
const MAP_DIR = "systems/sdp/assets/maps";
const REPO = "danazen30/Foundry-system-Spheres-des-Profondeurs";

/** @type {Record<string, string>} */
const MAP_FILES = {
  "Elysium": "ElysiumV1.jpg",
  "Fretanie": "FretanieV2.jpg",
  "Katrade": "KatradeV4.jpg"
};

/** @type {Record<string, string[]>} */
const MAP_REMOTE_FALLBACKS = {
  "ElysiumV1.jpg": ["Elysium V1.jpg"],
  "FretanieV2.jpg": ["Fretanie V2.jpg"],
  "KatradeV4.jpg": ["Katrade V4.jpg"]
};

export function registerSceneBootstrapSettings() {

  game.settings.register("sdp", "scenesInitialized", {
    name: "SDP Scenes Initialized",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register("sdp", "startSceneViewed", {
    name: "SDP Start Scene Viewed",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

}

function buildUrl(relativePath) {

  const segments = relativePath.replace(/^\//, "").split("/");
  return `${window.location.origin}/${segments.map(encodeURIComponent).join("/")}`;

}

/**
 * @param {string} relativePath
 * @returns {Promise<boolean>}
 */
async function pathExists(relativePath) {

  try {
    const response = await fetch(buildUrl(relativePath), {
      method: "HEAD",
      cache: "no-store"
    });
    return response.ok;
  }
  catch {
    return false;
  }

}

function uploadSource() {

  return game.modules.get("forge")?.active ? "forgevtt" : "data";

}

/**
 * @param {string} filename
 * @returns {Promise<Blob>}
 */
async function fetchMapBlob(filename) {

  const candidates = [
    `${MAP_DIR}/${filename}`,
    ...((MAP_REMOTE_FALLBACKS[filename] ?? []).map(name => `${MAP_DIR}/${name}`))
  ];

  for (const path of candidates) {
    if (!await pathExists(path)) continue;
    const response = await fetch(buildUrl(path), { cache: "no-store" });
    if (response.ok) return response.blob();
  }

  const remoteNames = [filename, ...(MAP_REMOTE_FALLBACKS[filename] ?? [])];
  const version = game.system.version;
  const tags = [`v${version}`, "main"];

  for (const tag of tags) {
    for (const name of remoteNames) {
      const url =
        `https://raw.githubusercontent.com/${REPO}/${tag}/assets/maps/${encodeURIComponent(name)}`;
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) return response.blob();
    }
  }

  throw new Error(`Map introuvable : ${filename}`);

}

/**
 * @param {string} filename
 * @returns {Promise<string>}
 */
async function resolveMapUrl(filename) {

  const systemPath = `${MAP_DIR}/${filename}`;

  if (await pathExists(systemPath)) {
    return systemPath;
  }

  const worldPath = `worlds/${game.world.id}/assets/maps/${filename}`;

  if (await pathExists(worldPath)) {
    return worldPath;
  }

  const blob = await fetchMapBlob(filename);
  const FP = foundry.applications.apps.FilePicker.implementation;
  const uploadDir = `worlds/${game.world.id}/assets/maps`;
  const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
  const response = await FP.upload(
    uploadSource(),
    uploadDir,
    file,
    {},
    { notify: false }
  );

  return response.path ?? worldPath;

}

/**
 * @param {Scene|SceneDocument} scene
 */
async function ensureSceneMap(scene) {

  const filename = MAP_FILES[scene.name];

  if (!filename) return;

  const mapUrl = await resolveMapUrl(filename);
  const bg = scene.background?.src ?? "";
  const thumb = scene.thumbnail ?? "";

  if (bg === mapUrl && thumb === mapUrl) return;

  await scene.update({
    "background.src": mapUrl,
    thumbnail: mapUrl
  });

}

function findImportedScene(pack, doc) {

  const byName = game.scenes.getName(doc.name);
  if (byName) return byName;

  return game.scenes.find(scene =>
    scene._stats?.compendiumSource === doc.uuid
    || scene.getFlag?.("core", "sourceId") === doc.uuid
  ) ?? null;

}

/**
 * Importe les scènes si besoin, corrige la map, affiche Elysium (MJ, 1× par monde).
 */
export async function bootstrapSdpStartScene() {

  if (!game.user.isGM) return;

  const pack = game.packs.get(SDP_SCENES_PACK);

  if (!pack) {
    console.warn(`[sdp] Compendium introuvable : ${SDP_SCENES_PACK}`);
    return;
  }

  const initialized = game.settings.get("sdp", "scenesInitialized");
  const startViewed = game.settings.get("sdp", "startSceneViewed");

  if (!initialized) {

    const documents = await pack.getDocuments();

    if (!documents.length) {
      console.warn("[sdp] Compendium scènes vide.");
      return;
    }

    for (const doc of documents) {
      if (!findImportedScene(pack, doc)) {
        await game.scenes.importFromCompendium(pack, doc.id);
      }
    }

    await game.settings.set("sdp", "scenesInitialized", true);
    ui.sidebar?.tabs?.scenes?.render?.(true);

  }

  const startScene = game.scenes.getName(START_SCENE);

  if (!startScene) {
    console.warn(`[sdp] Scène "${START_SCENE}" absente du monde.`);
    return;
  }

  await ensureSceneMap(startScene);

  if (startViewed && canvas.scene?.id === startScene.id) {
    return;
  }

  for (const scene of game.scenes) {
    if (scene.id !== startScene.id && scene.active) {
      await scene.update({ active: false });
    }
  }

  if (!startScene.active) {
    await startScene.update({ active: true });
  }

  await startScene.view();

  if (canvas.scene?.id !== startScene.id) {
    await new Promise(resolve => setTimeout(resolve, 300));
    await startScene.view();
  }

  await game.settings.set("sdp", "startSceneViewed", true);

  console.log(`[sdp] Scène de départ : ${START_SCENE}`);

}
