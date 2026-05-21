import { LevelUpApp } from "../apps/level-up-app.js";

export function registerActorHandlers() {

Hooks.on("createActor", async (actor) => {

  // =========================
  // TYPES VALIDES
  // =========================

  const validTypes = [
    "character",
    "npc",
    "creature"
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
// SKILLS PACK
// =========================

const skillsPack =
  game.packs.get("sdp.skills");

  if (!skillsPack) {

  console.error(
    "SDP | skills pack not found"
  );

  return;
}

  const skillDocs =
  await skillsPack.getDocuments();

  // =========================
  // BASIC SKILLS
  // =========================

  const basicSkills = skillDocs.filter(skill => {

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
  skillDocs.filter(skill =>
      defaultAdvancedSkills.includes(
        skill.name
      )
    );

    // =========================
// DEFAULT CURRENCIES
// =========================

const currencies = [

  {
    name: "Platinum coin",
    type: "currency",

    img:
      "systems/sdp/assets/icons/currency/platinum.png",

    system: {

      denomination: {
        value: "platinum"
      },

      quantity: {
        value: 0
      },

      encumbrance: {
        value: 0.001
      }

    }

  },

  {
    name: "Gold coin",
    type: "currency",

    img:
      "systems/sdp/assets/icons/currency/gold.png",

    system: {

      denomination: {
        value: "gold"
      },

      quantity: {
        value: 0
      },

      encumbrance: {
        value: 0.001
      }

    }

  },

  {
    name: "Silver coin",
    type: "currency",

    img:
      "systems/sdp/assets/icons/currency/silver.png",

    system: {

      denomination: {
        value: "silver"
      },

      quantity: {
        value: 0
      },

      encumbrance: {
        value: 0.001
      }

    }

  },

  {
    name: "Copper coin",
    type: "currency",

    img:
      "systems/sdp/assets/icons/currency/copper.png",

    system: {

      denomination: {
        value: "copper"
      },

      quantity: {
        value: 0
      },

      encumbrance: {
        value: 0.001
      }

    }

  }

];

  // =========================
  // CREATE
  // =========================

 const toCreate = [

  ...basicSkills,

  ...advancedSkills,

  ...currencies

].map(item =>
  item.toObject
    ? item.toObject()
    : item
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