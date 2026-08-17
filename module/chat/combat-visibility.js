/**
 * Combat chat visibility for SDP.
 *
 * Roll mode "everyone" (public): other players see the SAME view as the roller
 * for attacker-facing cards (attack, damage dice). It does NOT unlock GM secrets.
 *
 * Cards like defense resolution / damage resolution / injury stay private to
 * GM + defender even if the roll mode is public.
 *
 * Filtering uses data-sdp-vis="gm,attacker,defender" on HTML nodes.
 */

export function getCurrentRollMode() {
  return game.settings.get("core", "rollMode");
}

export function isPublicRollMode(mode = getCurrentRollMode()) {
  return (
    mode === CONST.DICE_ROLL_MODES.PUBLIC
    || mode === "public"
  );
}

/** Stages other PCs may spectate (same view as the attacker) when public. */
const ATTACKER_FACING_STAGES = new Set([
  "attack-melee",
  "attack-ranged",
  "attack-resolved",
  "damage-roll",
  "defense-choice"
]);

/** Audiences that must never be broadcast publicly. */
const ALWAYS_PRIVATE_AUDIENCES = new Set([
  "defender",
  "gm"
]);

export function getActorOwnerUsers(actor) {
  if (!actor) return [];
  return game.users.filter(user =>
    !user.isGM
    && actor.testUserPermission(
      user,
      CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    )
  );
}

/**
 * @param {object} opts
 * @param {Actor} [opts.attackerActor]
 * @param {Actor} [opts.defenderActor]
 * @param {string} [opts.rollMode]
 * @param {"all"|"attacker"|"defender"|"gm"} [opts.audience]
 * @returns {string[]} user ids for whisper (empty = public message)
 */
export function getCombatWhisperUserIds({
  attackerActor = null,
  defenderActor = null,
  rollMode = getCurrentRollMode(),
  audience = "all"
} = {}) {

  const forcePrivate = ALWAYS_PRIVATE_AUDIENCES.has(audience);

  // Public mode only broadcasts attacker-facing cards.
  if (isPublicRollMode(rollMode) && !forcePrivate && audience !== "defender") {
    if (audience === "attacker" || audience === "all") {
      return [];
    }
  }

  const ids = new Set();

  for (const user of ChatMessage.getWhisperRecipients("GM")) {
    ids.add(user.id);
  }

  if (audience === "gm") {
    return [...ids];
  }

  // Include creating user by default, then prune if they must not see this card
  ids.add(game.user.id);

  if (audience === "all" || audience === "attacker") {
    for (const user of getActorOwnerUsers(attackerActor)) {
      ids.add(user.id);
    }
  }

  if (audience === "all" || audience === "defender") {
    for (const user of getActorOwnerUsers(defenderActor)) {
      ids.add(user.id);
    }
  }

  // Defender-only / GM-secret cards: attacker must not remain in the list
  if (audience === "defender" || audience === "gm") {
    if (!game.user.isGM) {
      const ownsDefender = defenderActor?.testUserPermission(
        game.user,
        CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
      );
      if (!ownsDefender) {
        ids.delete(game.user.id);
      }
    }
  }

  return [...ids];
}

export function buildCombatFlags({
  rollMode = getCurrentRollMode(),
  attackerActorId = null,
  defenderActorId = null,
  stage = ""
} = {}) {

  return {
    sdp: {
      combat: {
        rollMode,
        attackerActorId,
        defenderActorId,
        stage
      }
    }
  };

}

/**
 * Roles the current user has for this combat message.
 * @returns {Set<string>}
 */
export function getViewerCombatRoles(message, user = game.user) {

  const roles = new Set();
  const combat = message?.flags?.sdp?.combat;

  if (user.isGM) {
    roles.add("gm");
    roles.add("attacker");
    roles.add("defender");
    roles.add("public");
    return roles;
  }

  const attackerActor = combat?.attackerActorId
    ? game.actors.get(combat.attackerActorId)
    : null;

  const defenderActor = combat?.defenderActorId
    ? game.actors.get(combat.defenderActorId)
    : null;

  if (
    attackerActor?.testUserPermission(
      user,
      CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    )
  ) {
    roles.add("attacker");
  }

  if (
    defenderActor?.testUserPermission(
      user,
      CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    )
  ) {
    roles.add("defender");
  }

  const authorId = message?.author?.id ?? message?.user;
  if (authorId === user.id && !roles.has("defender")) {
    roles.add("attacker");
  }

  const mode = combat?.rollMode ?? (
    message?.whisper?.length
      ? CONST.DICE_ROLL_MODES.PRIVATE
      : CONST.DICE_ROLL_MODES.PUBLIC
  );

  const stage = combat?.stage || "";

  // Public mode: other PCs spectate the attacker's view (not GM secrets)
  if (
    isPublicRollMode(mode)
    && ATTACKER_FACING_STAGES.has(stage)
    && !roles.has("defender")
    && !roles.has("attacker")
  ) {
    roles.add("attacker");
  }

  return roles;

}

/** HTML attribute helper: data-sdp-vis="gm,attacker" */
export function vis(...roles) {
  return `data-sdp-vis="${roles.join(",")}"`;
}

/**
 * Hide [data-sdp-vis] nodes the viewer is not allowed to see.
 * Always applied — public mode does not reveal GM/defender secrets.
 *
 * Defense / damage resolution cards are never shown to the attacker:
 * hit/miss is on the attack card; raw damage is on the damage roll.
 */
export function applyCombatCardVisibility(message, html) {

  const root = html instanceof HTMLElement
    ? html
    : html?.[0] ?? html;

  if (!root?.querySelectorAll) return;

  const combat = message?.flags?.sdp?.combat;
  if (!combat) return;

  const roles = getViewerCombatRoles(message);
  const stage = combat.stage || "";

  // Entire card blocked for attacker (and bystanders) — GM + defender only
  const attackerBlockedStages = new Set([
    "defense-resolution",
    "damage-resolution",
    "damage-applied",
    "injury",
    "consequence"
  ]);

  if (
    attackerBlockedStages.has(stage)
    && !game.user.isGM
    && !roles.has("defender")
  ) {
    const messageEl = root.closest(".chat-message") || root;
    messageEl.hidden = true;
    messageEl.style.display = "none";
    return;
  }

  root.querySelectorAll("[data-sdp-vis]").forEach(el => {

    const allowed = String(el.dataset.sdpVis || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const ok = allowed.some(role => roles.has(role));

    if (ok) return;

    el.hidden = true;
    el.setAttribute("aria-hidden", "true");

    el.querySelectorAll("button, input, select, textarea").forEach(ctrl => {
      ctrl.disabled = true;
      ctrl.tabIndex = -1;
    });

  });

}

/**
 * Create a combat chat message with correct whisper + flags.
 */
export async function createCombatMessage({
  content,
  speaker = null,
  attackerActor = null,
  defenderActor = null,
  rollMode = getCurrentRollMode(),
  stage = "",
  audience = "all",
  extraFlags = {},
  type = CONST.CHAT_MESSAGE_TYPES?.OTHER
} = {}) {

  const whisper = getCombatWhisperUserIds({
    attackerActor,
    defenderActor,
    rollMode,
    audience
  });

  const flags = foundry.utils.mergeObject(
    buildCombatFlags({
      rollMode,
      attackerActorId: attackerActor?.id ?? null,
      defenderActorId: defenderActor?.id ?? null,
      stage
    }),
    extraFlags
  );

  const data = {
    content,
    speaker: speaker ?? ChatMessage.getSpeaker(),
    flags
  };

  if (whisper.length) {
    data.whisper = whisper;
  }

  if (type !== undefined) {
    data.type = type;
  }

  return ChatMessage.create(data);

}

/**
 * Options bag for Roll#toMessage with combat visibility.
 */
export function combatRollMessageData({
  content,
  speaker,
  attackerActor = null,
  defenderActor = null,
  rollMode = getCurrentRollMode(),
  stage = "attack",
  audience = "all"
} = {}) {

  const whisper = getCombatWhisperUserIds({
    attackerActor,
    defenderActor,
    rollMode,
    audience
  });

  const data = {
    speaker: speaker ?? ChatMessage.getSpeaker({ actor: attackerActor }),
    content,
    flags: buildCombatFlags({
      rollMode,
      attackerActorId: attackerActor?.id ?? null,
      defenderActorId: defenderActor?.id ?? null,
      stage
    })
  };

  if (whisper.length) {
    data.whisper = whisper;
    data.rollMode = rollMode;
  }

  return data;

}
