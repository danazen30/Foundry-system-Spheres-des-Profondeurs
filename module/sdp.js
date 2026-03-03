Hooks.once("init", async function () {
  console.log("Mon Système | Initialisation");

  // Définir une classe Actor personnalisée
  class sdpActor extends Actor {
    prepareData() {
      super.prepareData();
      const data = this.system;

      // Exemple : calcul automatique
      data.hp.max = data.attributes.endurance * 5;
    }
  }

  // Enregistrer la classe
  CONFIG.Actor.documentClass = sdpActor;

  // Enregistrer la feuille personnalisée
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("sdp", sdpActorSheet, {
    types: ["personnage"],
    makeDefault: true
  });
});


// ===========================
// FEUILLE DE PERSONNAGE
// ===========================

class sdpActorSheet extends ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sdp", "sheet", "actor"],
      template: "systems/sdp/templates/actor/actor-sheet.html",
      width: 600,
      height: 600
    });
  }

  getData() {
    const context = super.getData();
    context.system = context.actor.system;
    return context;
  }
}
