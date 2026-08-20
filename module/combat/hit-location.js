export async function rollHitLocation(profileKey = "humanoid") {

    // =========================
    // ROLL
    // =========================

    const roll = await (new Roll("1d12")).roll();

    // =========================
    // PROFILE
    // =========================

    const profile =
        CONFIG.SDP.hitLocationProfiles?.[profileKey];

    if (!profile) {

        console.error(`SDP | Unknown hit location profile: ${profileKey}`);

        return {
            roll,
            location: "body"
        };
    }

    // =========================
    // RESULT
    // =========================

    const result = roll.total;

    const location =
        profile.table?.[result] || "body";

    // =========================
    // RETURN
    // =========================

    return {
        roll,
        location
    };

}

export function getHitLocationProfile(profileKey = "humanoid") {

    const profile =
        CONFIG.SDP.hitLocationProfiles?.[profileKey];

    if (!profile) {

        console.error(`SDP | Unknown hit location profile: ${profileKey}`);

        return CONFIG.SDP.hitLocationProfiles.humanoid;
    }

    return profile;
}

export function getHitLocationLabel(profileKey, location) {

    const profile =
        getHitLocationProfile(profileKey);

    const label =
        profile.locations?.[location]?.label ||
        location;

    return game.i18n.localize(label);

}

/**
 * Spell damage hit location: random table roll, or a fixed zone (e.g. blasts → body).
 * Fixed "arm" / "leg" pick left or right at random (1/2).
 * @param {{ mode?: string, fixedLocation?: string, profileKey?: string }} [options]
 */
export async function resolveSpellHitLocation({
  mode = "random",
  fixedLocation = "body",
  profileKey = "humanoid"
} = {}) {

  if (mode === "fixed") {
    const profile = getHitLocationProfile(profileKey);
    let location = fixedLocation || "body";
    let sideRoll = null;

    if (location === "arm" || location === "leg") {
      sideRoll = await (new Roll("1d2")).roll();
      const useRight = sideRoll.total === 2;
      if (location === "arm") {
        location = useRight ? "rightArm" : "leftArm";
      } else {
        location = useRight ? "rightLeg" : "leftLeg";
      }
    }

    if (!profile.locations?.[location]) {
      location = profile.locations?.body
        ? "body"
        : (Object.keys(profile.locations || {})[0] || "body");
    }

    return {
      location,
      roll: { total: sideRoll?.total ?? "fixed" },
      fixed: true
    };
  }

  const result = await rollHitLocation(profileKey);
  return {
    ...result,
    fixed: false
  };

}