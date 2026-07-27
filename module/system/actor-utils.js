/**
 * Resolve the correct Actor for chat/combat actions.
 * Unlinked tokens have a synthetic actor whose items differ from game.actors.get(id).
 */

/**
 * Token id to store on chat cards for later resolution.
 * @param {Actor} actor
 * @returns {string}
 */
export function getTokenIdForActor(actor) {
  if (!actor) return "";

  if (actor.token?.id) {
    return actor.token.id;
  }

  const tokens = actor.getActiveTokens?.(true) || [];
  if (tokens.length === 1) {
    return tokens[0].id;
  }

  const controlled = canvas.tokens?.controlled?.find(
    (token) => token.actor?.uuid === actor.uuid
  );
  if (controlled) {
    return controlled.id;
  }

  const match = canvas.tokens?.placeables?.find(
    (token) => token.actor?.uuid === actor.uuid
  );
  return match?.id || tokens[0]?.id || "";
}

/**
 * @param {string|null} actorId
 * @param {string|null} tokenId
 * @returns {Actor|null}
 */
export function resolveActorFromIds(actorId, tokenId) {
  if (tokenId) {
    const token = canvas.tokens?.get(tokenId);
    if (token?.actor) return token.actor;

    const tokenDoc = canvas.scene?.tokens?.get(tokenId);
    if (tokenDoc?.actor) return tokenDoc.actor;
  }

  if (!actorId) return null;

  // Prefer a unique scene token for this base actor (helps older chat cards).
  const sceneTokens = (canvas.tokens?.placeables || []).filter((token) => {
    const baseId = token.document?.actorId;
    return baseId === actorId || token.actor?.id === actorId;
  });

  if (sceneTokens.length === 1 && sceneTokens[0].actor) {
    return sceneTokens[0].actor;
  }

  const controlled = canvas.tokens?.controlled?.find((token) => {
    const baseId = token.document?.actorId;
    return baseId === actorId || token.actor?.id === actorId;
  });
  if (controlled?.actor) {
    return controlled.actor;
  }

  return game.actors.get(actorId) || null;
}

/**
 * Resolve actor from a chat card / button dataset.
 * @param {HTMLElement|{dataset?: DOMStringMap}} el
 * @returns {Actor|null}
 */
export function resolveActorFromElement(el) {
  const dataset = el?.dataset || {};
  return resolveActorFromIds(
    dataset.actor || "",
    dataset.token || ""
  );
}

/**
 * @param {Actor|null} actor
 * @param {string} itemId
 * @returns {Item|null}
 */
export function resolveActorItem(actor, itemId) {
  if (!actor || !itemId) return null;
  return actor.items.get(itemId) || null;
}
