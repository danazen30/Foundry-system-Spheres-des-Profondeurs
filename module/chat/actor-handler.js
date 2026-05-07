import { LevelUpApp } from "../apps/level-up-app.js";

export function registerActorHandlers() {

  Hooks.on("createActor", async (actor) => {

    if (actor.type !== "character") return;

    if (actor.items.some(i => i.type === "skill")) return;

    const pack = game.packs.get("sdp.skills");

    if (!pack) {
      console.error("SDP | skills pack not found");
      return;
    }

    const docs = await pack.getDocuments();

    // =========================
    // BASIC SKILLS
    // =========================

    const basicSkills = docs.filter(skill => {

      return skill.type === "skill" &&
        (
          skill.system.advanced === false ||
          skill.system.advanced === "false" ||
          skill.system.advanced == null
        );

    });

    // =========================
    // ADVANCED SKILLS
    // =========================

    const defaultAdvancedSkills = [
      "Stealth"
    ];

    const advancedSkills = docs.filter(skill =>
      defaultAdvancedSkills.includes(skill.name)
    );

    // =========================
    // CREATE
    // =========================

    const toCreate = [
      ...basicSkills,
      ...advancedSkills
    ].map(skill => skill.toObject());

    if (toCreate.length) {

      await actor.createEmbeddedDocuments("Item", toCreate);

      console.log("SDP | Default skills added", {
        actor: actor.name,
        count: toCreate.length
      });
    }

  });

}