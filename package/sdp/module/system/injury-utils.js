/**
 * Blessures SDP : clés, options de fiche, lookup compendium.
 */

export const SDP_INJURY_SEVERITIES = [
  "light",
  "moderate",
  "severe",
  "critical",
  "instant"
];

/** Localisations logiques du compendium (bras/jambe regroupés). */
export const SDP_INJURY_LOCATIONS = [
  "head",
  "body",
  "arm",
  "leg"
];

/** Coup de combat → clé compendium. */
export const INJURY_HIT_LOCATION_MAP = {
  head: "head",
  body: "body",
  arm: "arm",
  leg: "leg",
  rightArm: "arm",
  leftArm: "arm",
  rightLeg: "leg",
  leftLeg: "leg"
};

const INJURY_LOCATION_I18N = {
  head: "SDP.HitLocationHead",
  body: "SDP.HitLocationBody",
  arm: "SDP.InjuryLocationArm",
  leg: "SDP.InjuryLocationLeg"
};

const SEVERITY_I18N = {
  light: "SDP.Wound.Light",
  moderate: "SDP.Wound.Moderate",
  severe: "SDP.Wound.Severe",
  critical: "SDP.Wound.Critical",
  instant: "SDP.Wound.Instant"
};

/**
 * Clé i18n / compendium : lightBody, severeArmConsequence…
 */
export function buildInjuryKey(
  severity,
  location,
  consequence = false
) {

  if (
    !severity
    || !location
  ) {
    return "";
  }

  const isConsequence =
    typeof consequence === "boolean"
      ? consequence
      : !!consequence?.consequence;

  const locationPart =
    location.charAt(0).toUpperCase()
    + location.slice(1);

  let key =
    `${severity}${locationPart}`;

  if (isConsequence) {
    key += "Consequence";
  }

  return key;

}

/**
 * Regroupe bras/jambes gauche/droite vers arm/leg pour le compendium.
 */
export function normalizeInjuryLocation(location) {

  if (!location) {
    return "";
  }

  return INJURY_HIT_LOCATION_MAP[location]
    ?? location;

}

/**
 * Label traduit d'une localisation (compendium ou coup précis).
 */
export function getInjuryLocationLabel(
  location,
  profileKey = "humanoid"
) {

  if (!location) {
    return "";
  }

  const profile =
    CONFIG.SDP?.hitLocationProfiles?.[profileKey]
    ?? CONFIG.SDP?.hitLocationProfiles?.humanoid;

  const hitLabel =
    profile?.locations?.[location]?.label;

  if (hitLabel && game.i18n.has(hitLabel)) {
    return game.i18n.localize(hitLabel);
  }

  const group =
    normalizeInjuryLocation(location);

  const groupKey =
    INJURY_LOCATION_I18N[group];

  if (groupKey && game.i18n.has(groupKey)) {
    return game.i18n.localize(groupKey);
  }

  return location;

}

/**
 * Données d'une blessure compendium prêtes à être appliquées sur un acteur.
 * Conserve la localisation précise du coup dans system.hitLocation.
 */
export function prepareAppliedInjuryData(
  packItem,
  actualHitLocation = ""
) {

  const data =
    packItem.toObject();

  const hitLocation =
    actualHitLocation?.trim?.() ?? "";

  if (hitLocation) {
    data.system.hitLocation = hitLocation;
  }

  return data;

}

/**
 * Localisation affichée (coup précis ou zone logique).
 */
export function getInjuryDisplayLocation(
  injuryData = {}
) {

  return injuryData.hitLocation
    || injuryData.location
    || "";

}

/**
 * Label traduit d'une gravité de blessure.
 */
export function getLocalizedInjurySeverity(
  severity,
  fallback = ""
) {

  const key =
    SEVERITY_I18N[severity];

  if (!key) {
    return fallback || severity;
  }

  return game.i18n.has(key)
    ? game.i18n.localize(key)
    : fallback || severity;

}

/**
 * Options pour le select gravité (fiche blessure).
 */
export function getInjurySeverityOptions(
  selected = ""
) {

  const blank = {
    value: "",
    label: "—"
  };

  const options =
    SDP_INJURY_SEVERITIES.map(value => ({
      value,
      label: getLocalizedInjurySeverity(value)
    }));

  return [blank, ...options].map(option => ({
    ...option,
    selected: option.value === selected
  }));

}

/**
 * Options pour le select localisation (4 zones logiques).
 */
export function getInjuryLocationOptions(
  selected = ""
) {

  const normalized =
    normalizeInjuryLocation(selected);

  const blank = {
    value: "",
    label: "—"
  };

  const options =
    SDP_INJURY_LOCATIONS.map(value => {

      const labelKey =
        INJURY_LOCATION_I18N[value];

      return {
        value,
        label: labelKey
          ? game.i18n.localize(labelKey)
          : value
      };

    });

  return [blank, ...options].map(option => ({
    ...option,
    selected: option.value === normalized
  }));

}

/**
 * Options pour la localisation précise (sur fiche acteur / application manuelle).
 */
export function getManualHitLocationOptions(
  selected = "",
  profileKey = "humanoid"
) {

  const profile =
    CONFIG.SDP?.hitLocationProfiles?.[profileKey]
    ?? CONFIG.SDP?.hitLocationProfiles?.humanoid;

  const locations =
    profile?.locations ?? {};

  const blank = {
    value: "",
    label: "—"
  };

  const options =
    Object.entries(locations).map(([value, data]) => ({
      value,
      label: game.i18n.localize(data.label)
    }));

  return [blank, ...options].map(option => ({
    ...option,
    selected: option.value === selected
  }));

}

/**
 * Durée numérique en rounds pour le décompte automatique, ou null si formule / vide.
 */
export function getInjuryDurationRounds(duration) {

  if (
    duration === null
    || duration === undefined
    || duration === ""
  ) {
    return null;
  }

  if (typeof duration === "number") {
    return duration > 0
      ? duration
      : null;
  }

  const text =
    String(duration).trim();

  if (!text) {
    return null;
  }

  if (/^\d+$/.test(text)) {

    const rounds =
      parseInt(text, 10);

    return rounds > 0
      ? rounds
      : null;

  }

  return null;

}

/**
 * Indique si la durée contient une formule de dés (ex. 1d4).
 */
export function isInjuryDurationFormula(duration) {

  if (
    duration === null
    || duration === undefined
  ) {
    return false;
  }

  const text =
    String(duration).trim();

  return !!text && /\d+d\d+/i.test(text);

}

/**
 * Résout une formule de durée (ex. 1d4) en nombre de rounds.
 */
export async function rollInjuryDurationFormula(
  duration,
  actor = null
) {

  const text =
    String(duration ?? "").trim();

  if (!text || !/\d+d/i.test(text)) {
    return getInjuryDurationRounds(duration);
  }

  try {

    const roll =
      await new Roll(text).evaluate();

    await roll.toMessage({
      speaker: actor
        ? ChatMessage.getSpeaker({ actor })
        : ChatMessage.getSpeaker(),
      flavor: game.i18n.localize("SDP.InjuryDurationRoll")
    });

    return roll.total > 0
      ? roll.total
      : null;

  }
  catch (err) {

    console.warn("SDP | Invalid injury duration formula", duration, err);
    return null;

  }

}

/**
 * Cherche une blessure dans le compendium sdp.injuries.
 */
export async function getInjuryFromPack(
  location,
  severity,
  isConsequence = false
) {

  const pack =
    game.packs.get("sdp.injuries");

  if (!pack) {
    return null;
  }

  const docs =
    await pack.getDocuments();

  const groupLocation =
    normalizeInjuryLocation(location);

  return docs.find(item =>
    item.system.severity === severity
    && (item.system.consequence ?? false) === isConsequence
    && (
      item.system.location === groupLocation
      || item.system.location === location
    )
  ) ?? null;

}

/**
 * Met à jour system.key quand gravité / localisation / conséquence changent.
 */
export function registerInjuryHooks() {

  Hooks.on(
    "preUpdateItem",
    (document, update) => {

      if (document.type !== "injury") {
        return;
      }

      const severity =
        update.system?.severity
        ?? document.system.severity;

      const rawLocation =
        update.system?.location
        ?? document.system.location;

      const location =
        normalizeInjuryLocation(rawLocation);

      const consequence =
        update.system?.consequence
        ?? document.system.consequence
        ?? false;

      if (!severity || !location) {
        return;
      }

      update.system ??= {};
      update.system.location = location;
      update.system.key =
        buildInjuryKey(
          severity,
          location,
          consequence
        );

    }
  );

  Hooks.on(
    "preCreateItem",
    (document, data) => {

      if (data.type !== "injury") {
        return;
      }

      const severity =
        data.system?.severity ?? "";

      const rawLocation =
        data.system?.location ?? "";

      const location =
        normalizeInjuryLocation(rawLocation);

      const consequence =
        data.system?.consequence ?? false;

      if (!severity || !location) {
        return;
      }

      data.system ??= {};
      data.system.location = location;
      data.system.key =
        buildInjuryKey(
          severity,
          location,
          consequence
        );

    }
  );

}
