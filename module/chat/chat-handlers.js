import { registerDamageHandlers } from "./damage-handler.js";
import { registerConditionHandlers } from "./condition-handler.js";
import { registerAttackHandlers } from "./attack-handler.js";
import { registerInjuryHandlers } from "./injury-handler.js";
import { registerEditHandlers } from "./edit-handler.js";

export function registerChatHandlers() {



Hooks.on("renderChatMessageHTML", (message, html) => {

  // 🔥 compat jQuery TEMPORAIRE
  html = $(html);

  registerDamageHandlers(html, message);
  registerConditionHandlers(html, message);
  registerAttackHandlers(html, message);
  registerInjuryHandlers(html, message);
  registerEditHandlers(html, message);

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
const actorName = actorObj?.name || "Unknown";

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

    ui.notifications.info(`${actorName} set as opposed reference`);
    return;

  }

  // =========================
  // RESOLVE OPPOSED
  // =========================

  const base = game.sdp.opposed;

  let resultText;
let finalSL = Math.abs(sl - base.SL);

if(sl > base.SL){
  resultText = `${actorName} wins`;
}else if(sl < base.SL){
  resultText = `${base.actor} wins`;
}else{
  resultText = "Draw";
  finalSL = 0;
}

  ChatMessage.create({
    whisper: ChatMessage.getWhisperRecipients("GM"),
    content: `
    
    <h3>Opposed Test</h3>

    <p>${base.actor} SL: ${base.SL}</p>
    <p>${actorName} SL: ${sl}</p>

    <p><strong>Final SL: ${finalSL}</strong></p>

    <strong>${resultText}</strong>
    `
  });

});

html.find(".sdp-stop-opposed").click(ev => {

  if(!game.sdp?.opposed){
    ui.notifications.warn("No opposition active");
    return;
  }

  game.sdp.opposed = null;

  ui.notifications.info("Opposition cleared");

});

});

}