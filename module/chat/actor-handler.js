import { LevelUpApp } from "../apps/level-up-app.js";

export function registerActorHandlers() {

Hooks.on("createActor", async (actor) => {

  // =========================
  // TYPES VALIDES
  // =========================

  const validTypes = [
    "character",
    "npc"
  ];

  if (!validTypes.includes(actor.type)) {
    return;
  }

  // =========================
  // EVITE DUPLICATION
  // =========================

  if (actor.items.some(i => i.type === "skill")) {
    return;
  }

  // =========================
  // PACK
  // =========================

  const pack =
    game.packs.get("sdp.skills");

  if (!pack) {

    console.error(
      "SDP | skills pack not found"
    );

    return;
  }

  const docs =
    await pack.getDocuments();

  // =========================
  // BASIC SKILLS
  // =========================

  const basicSkills = docs.filter(skill => {

    return (
      skill.type === "skill" &&
      (
        skill.system.advanced === false ||
        skill.system.advanced === "false" ||
        skill.system.advanced == null
      )
    );

  });

  // =========================
  // DEFAULT ADVANCED
  // =========================

  const defaultAdvancedSkills = [
    "Stealth"
  ];

  const advancedSkills =
    docs.filter(skill =>
      defaultAdvancedSkills.includes(
        skill.name
      )
    );

  // =========================
  // CREATE
  // =========================

  const toCreate = [
    ...basicSkills,
    ...advancedSkills
  ].map(skill =>
    skill.toObject()
  );

  if (!toCreate.length) {
    return;
  }

  await actor.createEmbeddedDocuments(
    "Item",
    toCreate
  );

  console.log(
    "SDP | Default skills added",
    {
      actor: actor.name,
      type: actor.type,
      count: toCreate.length
    }
  );

});

}