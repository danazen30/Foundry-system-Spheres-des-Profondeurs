import { registerDamageHandlers } from "./damage-handler.js";
import { registerConditionHandlers } from "./condition-handler.js";
import { registerAttackHandlers } from "./attack-handler.js";
import { registerInjuryHandlers } from "./injury-handler.js";
import { registerEditHandlers } from "./edit-handler.js";

export function registerChatHandlers() {



Hooks.on("renderChatMessage", (message, html) => {

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
    const actor = card.dataset.actor;

    game.sdp = game.sdp || {};

    if(!game.sdp.opposed){

      game.sdp.opposed = {
        SL: sl,
        actor: actor,
        messageId: message.id
      };

      ui.notifications.info(`${actor}'s roll is now the opposed reference`);
      return;

    }

    const base = game.sdp.opposed;

    let resultText;

    if(sl > base.SL){
      resultText = `${actor} wins`;
    }else if(sl < base.SL){
      resultText = `${base.actor} wins`;
    }else{
      resultText = "Draw";
    }

    ChatMessage.create({
      content: `
      <h3>Opposed Test</h3>
      <p>${base.actor} SL: ${base.SL}</p>
      <p>${actor} SL: ${sl}</p>
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