import { registerDamageHandlers } from "./damage-handler.js";
import { registerConditionHandlers } from "./condition-handler.js";
import { registerAttackHandlers } from "./attack-handler.js";
import { registerInjuryHandlers } from "./injury-handler.js";
import { registerEditHandlers } from "./edit-handler.js";
import { registerSpellHandlers } from "./spell-handler.js";
import { registerOvercastHandlers } from "./spell-handler.js";

export function registerChatHandlers() {


Hooks.on("renderChatMessageHTML", (message, html) => {

  // 🔥 compat jQuery TEMPORAIRE
  html = $(html);

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

html.find(".sdp-opposed").click(ev => {

  const card = ev.currentTarget.closest(".sdp-roll");

  const sl = Number(card.dataset.sl);
  const actorId = card.dataset.actor;
const actorObj = game.actors.get(actorId);
const actorName =
  actorObj?.name ||
  game.i18n.localize(
    "SDP.Unknown"
  );

  game.sdp = game.sdp || {};

  // =========================
  // SET REFERENCE
  // =========================

  if(!game.sdp.opposed){

    game.sdp.opposed = {
      SL: sl,
      actor: actorName,
actorId: actorId,
      messageId: message.id
    };

    ui.notifications.info(

  game.i18n.format(
    "SDP.OpposedReferenceSet",
    {
      actor: actorName
    }
  )

);
    return;

  }

  // =========================
  // RESOLVE OPPOSED
  // =========================

  const base = game.sdp.opposed;

  let resultText;
let finalSL = Math.abs(sl - base.SL);

if (sl > base.SL) {

  resultText =
    game.i18n.format(
      "SDP.ActorWins",
      {
        actor: actorName
      }
    );

}

else if (sl < base.SL) {

  resultText =
    game.i18n.format(
      "SDP.ActorWins",
      {
        actor: base.actor
      }
    );

}

else {

  resultText =
    game.i18n.localize(
      "SDP.Draw"
    );

  finalSL = 0;

}

  ChatMessage.create({
    whisper: ChatMessage.getWhisperRecipients("GM"),
    content: `
    
    <h3>
  ${game.i18n.localize(
    "SDP.OpposedTest"
  )}
</h3>

    <p>${base.actor} SL: ${base.SL}</p>
    <p>${actorName} SL: ${sl}</p>

    <p>

  <strong>

    ${game.i18n.localize(
      "SDP.FinalSL"
    )}: ${finalSL}

  </strong>

</p>

    <strong>${resultText}</strong>
    `
  });

});

html.find(".sdp-stop-opposed").click(ev => {

  if(!game.sdp?.opposed){
    ui.notifications.warn(

  game.i18n.localize(
    "SDP.NoOppositionActive"
  )

);
    return;
  }

  game.sdp.opposed = null;

 ui.notifications.info(

  game.i18n.localize(
    "SDP.OppositionCleared"
  )

);

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