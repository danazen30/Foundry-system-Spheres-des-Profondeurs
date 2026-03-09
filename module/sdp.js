import { SdpActor } from "./actors/actor.js";
import { SdpActorSheet } from "./actors/actor-sheet.js";
import { SdpItemSheet } from "./items/item-sheet.js";
import { SdpWeaponSheet } from "./items/weapon-sheet.js";

Hooks.once("init", () => {

  console.log("SDP | Initializing Spheres of the Depths system");

  // =========================
  // Actor
  // =========================

  CONFIG.Actor.documentClass = SdpActor;

  Actors.unregisterSheet("core", ActorSheet);

  Actors.registerSheet("sdp", SdpActorSheet, {
    types: ["character"],
    makeDefault: true
  });


  // =========================
  // Items
  // =========================

  Items.unregisterSheet("core", ItemSheet);

  // Feuille générique (skills, talents etc)
  Items.registerSheet("sdp", SdpItemSheet, {
    types: ["skill"],
    makeDefault: true
  });

  // Feuille arme
  Items.registerSheet("sdp", SdpWeaponSheet, {
    types: ["weapon"],
    makeDefault: true
  });

});