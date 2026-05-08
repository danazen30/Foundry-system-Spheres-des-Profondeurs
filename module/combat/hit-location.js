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

    return (
        profile.locations?.[location]?.label ||
        location
    );

}