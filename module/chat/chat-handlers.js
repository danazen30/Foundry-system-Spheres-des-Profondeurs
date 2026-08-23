import { registerDamageHandlers } from "./damage-handler.js";
import { registerConditionHandlers } from "./condition-handler.js";
import { registerAttackHandlers } from "./attack-handler.js";
import { registerInjuryHandlers } from "./injury-handler.js";
import { registerEditHandlers } from "./edit-handler.js";
import { registerSpellHandlers } from "./spell-handler.js";
import { registerOvercastHandlers } from "./spell-handler.js";
import { applyCombatCardVisibility } from "./combat-visibility.js";
import {
  clearOpposedReference,
  createOpposedResultMessage,
  setOpposedReference
} from "./opposed.js";

export function registerChatHandlers() {


Hooks.on("renderChatMessageHTML", (message, html) => {

  // 🔥 compat jQuery TEMPORAIRE
  html = $(html);

  applyCombatCardVisibility(message, html);

  registerDamageHandlers(html, message);
  registerConditionHandlers(html, message);
  registerAttackHandlers(html, message);
  registerInjuryHandlers(html, message);
  registerEditHandlers(html, message);
  registerSpellHandlers(html, message);
  registerOvercastHandlers(html, message);

  html[0].querySelectorAll(".sdp-attack button").forEach(btn => {

    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

  });

  html[0].querySelectorAll(".sdp-damage-mods input").forEach(input => {
    input.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    input.addEventListener("keydown", (event) => {
      event.stopPropagation();
    });
  });

html.find(".sdp-opposed").click(async ev => {

  const card = ev.currentTarget.closest(".sdp-roll");
  if (!card) return;

  const sl = Number(card.dataset.sl);
  const target = Number(card.dataset.target) || 0;
  const actorId = card.dataset.actor;
  const actorObj = game.actors.get(actorId);
  const actorName =
    actorObj?.name
    || game.i18n.localize("SDP.Unknown");

  // =========================
  // SET REFERENCE (one-shot)
  // =========================

  if (!game.sdp?.opposed) {

    setOpposedReference({
      SL: sl,
      actor: actorName,
      actorId,
      target,
      messageId: message.id
    });

    ui.notifications.info(
      game.i18n.format("SDP.OpposedReferenceSet", {
        actor: actorName
      })
    );
    return;

  }

  // =========================
  // RESOLVE + CLEAR
  // =========================

  const base = game.sdp.opposed;

  // Same card again = cancel pending oppose
  if (base.messageId === message.id) {
    clearOpposedReference();
    ui.notifications.info(
      game.i18n.localize("SDP.OppositionCleared")
    );
    return;
  }

  clearOpposedReference();

  await createOpposedResultMessage({
    baseActor: base.actor,
    baseSL: base.SL,
    baseTarget: base.target ?? 0,
    challengerActor: actorName,
    challengerSL: sl,
    challengerTarget: target
  });

});

html.find(".apply-rest").click(async ev => {

  const button = ev.currentTarget;

  // 🔒 STOP double click
  if (button.disabled) return;
  button.disabled = true;

  const card = ev.currentTarget.closest(".sdp-rest");

  // 🔒 déjà utilisé ?
  if (card.dataset.used === "true") return;
  card.dataset.used = "true";

  const actorId = card.dataset.actor;
  const hp = Number(card.dataset.hp);
  const mana = Number(card.dataset.mana);

  const actor = game.actors.get(actorId);
  if (!actor) return;

  const currentHP = actor.system.health.value;
  const maxHP = actor.system.health.max;

  const currentMana = actor.system.resources.mana.value;
  const maxMana = actor.system.resources.mana.max;

  await actor.update({
    "system.health.value": Math.min(currentHP + hp, maxHP),
    "system.resources.mana.value": Math.min(currentMana + mana, maxMana)
  });

  // 💬 feedback visuel
  button.innerText =
  game.i18n.localize(
    "SDP.Applied"
  );
  button.style.opacity = "0.5";

  ui.notifications.info(

  game.i18n.format(
    "SDP.ResourcesRecovered",
    {
      actor: actor.name
    }
  )

);

});

});

}