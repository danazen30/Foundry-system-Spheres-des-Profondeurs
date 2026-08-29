import { processRollDamageClick } from "../chat/damage-handler.js";
import { getTokenIdForActor } from "../system/actor-utils.js";
import { sanitizeChatDiceFormula } from "../chat/damage-mods-ui.js";

/**
 * Roll spell damage via hotbar macro (same path as chat "Roll Damage").
 * Expects exactly one controlled target token.
 * Replays flat / % / dice mods captured when the macro was created.
 */
export async function rollSpellDamageMacro({
  actorId,
  spellId,
  critical = false,
  chatFlatBonus = 0,
  chatPercentBonus = 0,
  chatDiceFormula = ""
} = {}) {

  if (!actorId || !spellId) {
    ui.notifications.warn(
      game.i18n.localize("SDP.Warning.SpellResolveMacroMissingData")
    );
    return;
  }

  const actor = game.actors.get(actorId);
  if (!actor) {
    ui.notifications.warn(
      game.i18n.localize("SDP.Warning.SpellResolveMacroMissingActor")
    );
    return;
  }

  if (!actor.isOwner && !game.user.isGM) {
    ui.notifications.warn(
      game.i18n.localize("SDP.Warning.SpellResolveMacroNotOwner")
    );
    return;
  }

  const spell = actor.items.get(spellId);
  if (!spell || spell.type !== "spell") {
    ui.notifications.warn(
      game.i18n.localize("SDP.Warning.SpellResolveMacroMissingSpell")
    );
    return;
  }

  const tokenId = getTokenIdForActor(actor) || "";
  const ignoreArmor = !!spell.system?.ignoreArmor;
  const hitLocationMode =
    spell.system?.hitLocationMode?.value === "fixed" ? "fixed" : "random";
  const fixedHitLocation =
    spell.system?.fixedHitLocation?.value || "body";

  const dice = sanitizeChatDiceFormula(chatDiceFormula);

  const card = document.createElement("div");
  card.className = "sdp-spell";
  card.dataset.actor = actorId;
  card.dataset.token = tokenId;
  card.dataset.weapon = spellId;
  card.dataset.critical = critical ? "true" : "false";
  card.dataset.hitLocationMode = hitLocationMode;
  card.dataset.fixedHitLocation = fixedHitLocation;
  card.dataset.location = "";
  card.dataset.locationProfile = "humanoid";
  card.dataset.ignoreArmor = ignoreArmor ? "true" : "false";
  card.dataset.damagetype =
    (typeof spell.system?.damageType === "object"
      ? spell.system.damageType?.value
      : spell.system?.damageType) || "special";
  card.dataset.traits = "[]";
  card.dataset.chatFlat = String(Number(chatFlatBonus) || 0);
  card.dataset.chatPercent = String(Number(chatPercentBonus) || 0);
  card.dataset.chatDice = dice;

  const button = document.createElement("button");
  button.className = "roll-damage";
  button.dataset.token = tokenId;
  button.dataset.ignoreArmor = ignoreArmor ? "true" : "false";
  button.dataset.traits = "[]";
  button.dataset.fromResolveMacro = "true";

  await processRollDamageClick(card, button);
}

/**
 * Request a resolve macro on the GM hotbar (player → socket, GM → local).
 * Called when rolling damage from the spell chat card (with chat mods baked in).
 */
export async function createSpellResolveMacro({
  actor,
  spell,
  critical = false,
  chatFlatBonus = 0,
  chatPercentBonus = 0,
  chatDiceFormula = ""
} = {}) {

  if (!actor || !spell) return null;

  const payload = {
    actorId: actor.id,
    spellId: spell.id,
    critical: !!critical,
    chatFlatBonus: Number(chatFlatBonus) || 0,
    chatPercentBonus: Number(chatPercentBonus) || 0,
    chatDiceFormula: sanitizeChatDiceFormula(chatDiceFormula)
  };

  if (game.user.isGM) {
    return createSpellResolveMacroAsGM(payload);
  }

  const socket = game.sdp?.socket;
  if (!socket) {
    ui.notifications.warn(
      game.i18n.localize("SDP.Warning.SpellResolveMacroNoSocket")
    );
    return null;
  }

  try {
    await socket.executeAsGM("createSpellResolveMacro", payload);
    ui.notifications.info(
      game.i18n.format("SDP.SpellResolveMacroSentToGM", {
        spell: spell.name
      })
    );
  } catch (err) {
    console.error("SDP | createSpellResolveMacro", err);
    ui.notifications.warn(
      game.i18n.localize("SDP.Warning.SpellResolveMacroNoGM")
    );
  }

  return null;
}

/**
 * GM-only: create/update resolve macro and place it on the GM hotbar.
 */
export async function createSpellResolveMacroAsGM({
  actorId,
  spellId,
  critical = false,
  chatFlatBonus = 0,
  chatPercentBonus = 0,
  chatDiceFormula = ""
} = {}) {

  if (!game.user.isGM) return null;

  const actor = game.actors.get(actorId);
  const spell = actor?.items.get(spellId);

  if (!actor || !spell || spell.type !== "spell") return null;

  const dice = sanitizeChatDiceFormula(chatDiceFormula);
  const flat = Number(chatFlatBonus) || 0;
  const percent = Number(chatPercentBonus) || 0;

  const command = [
    `game.sdp.spells.rollDamageMacro({`,
    `  actorId: ${JSON.stringify(actor.id)},`,
    `  spellId: ${JSON.stringify(spell.id)},`,
    `  critical: ${critical ? "true" : "false"},`,
    `  chatFlatBonus: ${flat},`,
    `  chatPercentBonus: ${percent},`,
    `  chatDiceFormula: ${JSON.stringify(dice)}`,
    `});`
  ].join("\n");

  const name = game.i18n.format("SDP.SpellResolveMacroName", {
    spell: spell.name,
    actor: actor.name
  });

  const existing = game.macros.find(
    (m) =>
      m.getFlag("sdp", "spellResolveMacro") === true &&
      m.getFlag("sdp", "actorId") === actor.id &&
      m.getFlag("sdp", "spellId") === spell.id
  );

  let macro = existing ?? null;

  if (macro) {
    await macro.update({
      name,
      command,
      img: spell.img || macro.img,
      flags: {
        sdp: {
          spellResolveMacro: true,
          actorId: actor.id,
          spellId: spell.id,
          chatFlatBonus: flat,
          chatPercentBonus: percent,
          chatDiceFormula: dice
        }
      }
    });
  } else {
    macro = await Macro.create({
      name,
      type: "script",
      scope: "global",
      img: spell.img || "icons/svg/explosion.svg",
      command,
      flags: {
        sdp: {
          spellResolveMacro: true,
          actorId: actor.id,
          spellId: spell.id,
          chatFlatBonus: flat,
          chatPercentBonus: percent,
          chatDiceFormula: dice
        }
      }
    });
  }

  if (!macro) return null;

  await assignMacroToHotbar(macro);

  ui.notifications.info(
    game.i18n.format("SDP.SpellResolveMacroCreated", {
      spell: spell.name
    })
  );

  return macro;
}

async function assignMacroToHotbar(macro) {

  const hotbar = game.user.hotbar || {};
  const spellId = macro.getFlag("sdp", "spellId");
  const actorId = macro.getFlag("sdp", "actorId");

  // Already on any hotbar page/slot (live macro only) → do not place again.
  for (const id of Object.values(hotbar)) {
    if (!id) continue;
    const existing = game.macros.get(id);
    if (!existing) continue; // deleted macro ghost slot

    if (id === macro.id) return;

    if (
      existing.getFlag("sdp", "spellResolveMacro") &&
      existing.getFlag("sdp", "spellId") === spellId &&
      existing.getFlag("sdp", "actorId") === actorId
    ) {
      return;
    }
  }

  // Prefer lowest empty slot; treat missing macros as empty (ghost IDs).
  let slot = null;
  for (let i = 1; i <= 10; i++) {
    const id = hotbar[i];
    if (!id || !game.macros.get(id)) {
      slot = i;
      break;
    }
  }

  if (slot == null) slot = 1;

  await game.user.assignHotbarMacro(macro, slot);
}
