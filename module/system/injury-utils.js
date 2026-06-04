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

const SEVERITY_I18N = {
  light: "SDP.Wound.Light",
  moderate: "SDP.Wound.Moderate",
  severe: "SDP.Wound.Severe",
  critical: "SDP.Wound.Critical",
  instant: "SDP.Wound.Instant"
};

/**
 * Clé i18n / compendium : lightBody, severeRightArm, lightBodyConsequence…
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

  const locationPart =
    location.charAt(0).toUpperCase()
    + location.slice(1);

  let key =
    `${severity}${locationPart}`;

  if (consequence) {
    key += "Consequence";
  }

  return key;

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
 * Options pour le select localisation (profil humanoïde par défaut).
 */
export function getInjuryLocationOptions(
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

  return docs.find(item =>
    item.system.location === location
    && item.system.severity === severity
    && item.system.consequence === isConsequence
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

      const location =
        update.system?.location
        ?? document.system.location;

      const consequence =
        update.system?.consequence
        ?? document.system.consequence
        ?? false;

      if (!severity || !location) {
        return;
      }

      update.system ??= {};
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

      const location =
        data.system?.location ?? "";

      const consequence =
        data.system?.consequence ?? false;

      if (!severity || !location) {
        return;
      }

      data.system ??= {};
      data.system.key =
        buildInjuryKey(
          severity,
          location,
          consequence
        );

    }
  );

}
