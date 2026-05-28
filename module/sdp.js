import { SdpActor } from "./actors/actor.js";
import { SdpActorSheet } from "./actors/actor-sheet.js";
import { SdpNpcSheet } from "./actors/npc-sheet.js";
import { SdpCreatureSheet } from "./actors/creature-sheet.js";

import { registerChatHandlers } from "./chat/chat-handlers.js";
import { registerActorHandlers } from "./chat/actor-handler.js";

import { SdpItemSheet } from "./items/item-sheet.js";
import { SdpWeaponSheet } from "./items/weapon-sheet.js";
import { SdpTalentSheet } from "./items/talent-sheet.js";
import { SdpArmorSheet } from "./items/armor-sheet.js";
import { SdpInjurySheet } from "./items/injury-sheet.js";
import { SdpSkillSheet } from "./items/skill-sheet.js";
import { SdpCareerSheet } from "./items/career-sheet.js";
import { SdpSpecieSheet } from "./items/specie-sheet.js";
import { SdpSignSheet } from "./items/sign-sheet.js";
import { SdpItem } from "./items/item.js";
import { SdpSpellSheet } from "./items/spell-sheet.js";
import { SdpAmmunitionSheet } from "./items/ammunition-sheet.js";
import { SdpPossessionSheet } from "./items/possession-sheet.js";
import { SdpDiseaseSheet } from "./items/disease-sheet.js";
import { SdpTraitSheet } from "./items/trait-sheet.js";
import { SdpClothingSheet } from "./items/clothing-sheet.js";
import { SdpContainerSheet } from "./items/container-sheet.js";
import { SdpCurrencySheet } from "./items/currency-sheet.js";

import { SdpRoll } from "./rolls/roll.js";
import { SdpDamage } from "./combat/damage.js";

import { SdpLevelService } from "./services/level-service.js";

import { LevelUpApp } from "./apps/level-up-app.js";

import { SDP } from "./system/config.js";
import { SdpConditionEngine } from "./system/condition-engine.js";
import { SdpTurnEngine } from "./system/turn-engine.js";

export let sdpSocket;

const difficultyMap = {
  light: 0,
  moderate: -10,
  severe: -20,
  critical: -30
};

const SDP_ROLLTABLE_LOCALIZATION = {

  // CAREERS
  "uiomVIaoy9Drhemu":
    "SDP.RollTableCareerElf",

  "WzRAb3Ftyu0qFMCa":
    "SDP.RollTableCareerHuman",

  // SIGNS
  "7ZHAMQWLtvXnaw1N":
    "SDP.RollTableSignRandom",

  // SPECIES
  "FjSsEkbsWkBkrjWg":
    "SDP.RollTableSpecies",

  // CRITICAL FAILURE
  "XZ4ZAHiJvXgmww25":
    "SDP.RollTableCriticalAttackFailure",

  // MAGIC MAJOR
  "6Q4OF1ap29CkArDj":
    "SDP.RollTableMajorMagicalConsequence",

  // MAGIC MINOR
  "VVHLBG4r2WP3Ssrs":
    "SDP.RollTableMinorMagicalConsequence",

    // TALENTS
"6AY1b31Cy8uYYBTj":
  "SDP.RollTableTalent"

};

async function getInjuryFromPack(location, severity, isConsequence = false) {

  const pack = game.packs.get("sdp.injuries");
  if (!pack) return null;

  // 🔥 charge les vrais documents (pas juste index)
  const docs = await pack.getDocuments();

  return docs.find(i =>
    i.system.location === location &&
    i.system.severity === severity &&
    i.system.consequence === isConsequence
  );

}

/* ========================================= */
/* INIT                                      */
/* ========================================= */

  Hooks.once("init", async () => {

  console.log("SDP | Initializing Spheres of the Depths system");

  await foundry.applications.handlebars.loadTemplates([
    "systems/sdp/templates/partials/header.hbs",
    "systems/sdp/templates/partials/attributes.hbs",
    "systems/sdp/templates/partials/skills.hbs",
    "systems/sdp/templates/partials/talents.hbs",
    "systems/sdp/templates/partials/magic.hbs",
    "systems/sdp/templates/partials/inventory.hbs",
    "systems/sdp/templates/partials/effects.hbs",
    "systems/sdp/templates/partials/info.hbs",
    "systems/sdp/templates/partials/npc-header.hbs",
    "systems/sdp/templates/partials/creature-header.hbs",
    "systems/sdp/templates/partials/creature-info.hbs",
    "systems/sdp/templates/partials/creature-attributes.hbs",
    "systems/sdp/templates/partials/creature-combat.hbs",
    "systems/sdp/templates/partials/items/item-header-physical.hbs",
    "systems/sdp/templates/partials/items/item-description-tab.hbs",
    "systems/sdp/templates/partials/items/item-effects-tab.hbs",
    "systems/sdp/templates/partials/items/item-header-simple.hbs"
  ]);

  CONFIG.SDP = SDP;

  game.sdp = game.sdp || {};
game.sdp.Roll = SdpRoll;

  CONFIG.Actor.documentClass = SdpActor;
  CONFIG.Item.documentClass = SdpItem;

  registerActorHandlers();

// ACTORS
foundry.documents.collections.Actors.unregisterSheet("core", foundry.applications.sheets.ActorSheetV2);

foundry.documents.collections.Actors.registerSheet("sdp", SdpActorSheet, {types: ["character"], makeDefault: true});

foundry.documents.collections.Actors.registerSheet("sdp", SdpNpcSheet, {types: ["npc"], makeDefault: true});

foundry.documents.collections.Actors.registerSheet("sdp", SdpCreatureSheet, {types: ["creature"], makeDefault: true});

// items
// ✅ V13 correct
foundry.documents.collections.Items.unregisterSheet("core", foundry.applications.sheets.ItemSheetV2);

foundry.documents.collections.Items.registerSheet("sdp", SdpWeaponSheet, { types: ["weapon"], makeDefault: true });

foundry.documents.collections.Items.registerSheet("sdp", SdpArmorSheet, { types: ["armor"], makeDefault: true });

foundry.documents.collections.Items.registerSheet("sdp", SdpTalentSheet, { types: ["talent"], makeDefault: true });

foundry.documents.collections.Items.registerSheet("sdp", SdpSkillSheet, { types: ["skill"], makeDefault: true });

foundry.documents.collections.Items.registerSheet("sdp", SdpInjurySheet, { types: ["injury"], makeDefault: true });

foundry.documents.collections.Items.registerSheet("sdp", SdpSpecieSheet, { types: ["specie"], makeDefault: true });

foundry.documents.collections.Items.registerSheet("sdp", SdpCareerSheet, { types: ["career"], makeDefault: true });

foundry.documents.collections.Items.registerSheet("sdp", SdpSignSheet, { types: ["sign"], makeDefault: true });

foundry.documents.collections.Items.registerSheet("sdp", SdpSpellSheet, { types: ["spell"], makeDefault: true });

foundry.documents.collections.Items.registerSheet("sdp", SdpAmmunitionSheet, { types: ["ammunition"], makeDefault: true });

foundry.documents.collections.Items.registerSheet("sdp", SdpPossessionSheet, { types: ["possession"], makeDefault: true });

foundry.documents.collections.Items.registerSheet("sdp", SdpDiseaseSheet, { types: ["disease"], makeDefault: true });

foundry.documents.collections.Items.registerSheet("sdp", SdpTraitSheet, { types: ["trait"], makeDefault: true });

foundry.documents.collections.Items.registerSheet("sdp", SdpClothingSheet, { types: ["clothing"], makeDefault: true});

foundry.documents.collections.Items.registerSheet("sdp", SdpContainerSheet, { types: ["container"], makeDefault: true });

foundry.documents.collections.Items.registerSheet("sdp", SdpCurrencySheet, { types: ["currency"], makeDefault: true });

Handlebars.registerHelper("gte", function(a, b) {
  return a >= b;
});

Handlebars.registerHelper("multiply", function(a, b) {
  return a * b;
});

Handlebars.registerHelper("divide", function(a, b) {
  if (b === 0) return 0;
  return a / b;
});

Handlebars.registerHelper("includes", function(value, key) {

  if (!value) return false;

  // si string → split
  if (typeof value === "string") {
    return value.split(",").includes(key);
  }

  // si array
  if (Array.isArray(value)) {
    return value.includes(key);
  }

  return false;
});

  Hooks.on("createActor", async (actor) => {

  if(actor.system.conditions) return;

  await actor.update({
    "system.conditions": {
      stunned:0,
      bleeding:0,
      burning:0,
      poisoned:0,
      exhausted:0,
      deafened: 0,
      slowed: 0,
      entangled:0,
      staggered:0,
      shaken:0,
      frightened:0,
      prone:0,
      unconscious:0,
      dying:0,
      surprised:0
    },
    "system.details.experience": {
      total: 0,
      spent: 0,
      log: []
    }
  });

});

});

registerChatHandlers();
/* ========================================= */
/* READY                                     */
/* ========================================= */

Hooks.once("ready", async () => {

  game.system.description =
    game.i18n.localize(
      "SDP.SystemDescription"
    );

  // =========================
  // LOCALIZE ROLLTABLE PACK
  // =========================

  const pack =
    game.packs.get("sdp.rolltables");

  if (pack) {

    pack.metadata.label =
      game.i18n.localize(
        "SDP.RollTablePackLabel"
      );

    await pack.getIndex({
  fields: [
    "flags.sdp.key"
  ]
});

console.log(
  "SDP DEBUG | PACK INDEX",
  pack.index
);

Hooks.on(
  "renderCompendium",
  (app, html) => {

    // =========================
    // ONLY SDP ROLLTABLE PACK
    // =========================

    if (
      app.collection?.metadata?.id !==
      "sdp.rolltables"
    ) return;

    const element =
      html instanceof HTMLElement
        ? html
        : html[0];

    if (!element)
      return;

    // =========================
    // FIND ALL ENTRIES
    // =========================

    const entries =
      element.querySelectorAll(
        ".directory-item"
      );

    for (const entry of entries) {

      const documentId =
        entry.dataset.entryId;

      if (!documentId)
        continue;

      const localizationKey =
        SDP_ROLLTABLE_LOCALIZATION[
          documentId
        ];

      if (!localizationKey)
        continue;

      const title =
        entry.querySelector(
          ".entry-name"
        );

      if (!title)
        continue;

      title.textContent =
        game.i18n.localize(
          localizationKey
        );

    }

  }
);

console.log(
  "SDP DEBUG | FINAL INDEX",
  pack.index
);

// FORCE REFRESH COMPENDIUM UI
for (const app of Object.values(ui.windows)) {

  if (
    app.constructor.name ===
    "CompendiumDirectory"
  ) {

    app.render(true);

  }

}

// FALLBACK
ui.compendium?.render(true);

}

// =========================
// LOCALIZE OPENED ROLLTABLE WINDOWS
// =========================

Hooks.on(
  "renderApplicationV2",
  (app, element) => {
    console.log(
  "SDP DEBUG | renderApplicationV2",
  app,
  element
);

    // =========================
    // ONLY ROLLTABLE SHEETS
    // =========================

    if (
      app.document?.documentName !==
      "RollTable"
    ) return;

    const table =
      app.document;

    const localizationKey =
      SDP_ROLLTABLE_LOCALIZATION[
        table.id
      ];

    if (!localizationKey)
      return;

    const localizedName =
      game.i18n.localize(
        localizationKey
      );

    // =========================
    // REAL HTML ELEMENT
    // =========================

    const html =
      element instanceof HTMLElement
        ? element
        : element?.[0];

        console.log(
  "SDP DEBUG | HTML",
  html
);

    if (!html)
      return;

    // =========================
    // WINDOW TITLE
    // =========================

    const windowTitle =
      html.querySelector(
        ".window-title"
      );

    if (windowTitle) {

      windowTitle.textContent =
        localizedName;

    }

    // =========================
    // DOCUMENT TITLE
    // =========================

    const docName =
  html.querySelector(
    ".sheet-header h1"
  );

  console.log(
  "SDP DEBUG | DOC NAME FIX",
  docName
);

  console.log(
  "SDP DEBUG | DOC NAME",
  docName
);

    if (docName) {

      docName.textContent =
        localizedName;

    }

  }
);

// =========================
// LOCALIZE ROLLTABLE CHAT
// =========================

Hooks.on(
  "renderChatMessageHTML",
  (message, html) => {

    const links =
  html instanceof HTMLElement
    ? html.querySelectorAll(
        ".content-link"
      )
    : [];

    for (const link of links) {

      const tableId =
        link.dataset.id;

      if (!tableId)
        continue;

      const localizationKey =
        SDP_ROLLTABLE_LOCALIZATION[
          tableId
        ];

      if (!localizationKey)
        continue;

      link.textContent =
        game.i18n.localize(
          localizationKey
        );

    }

  }
);


  game.sdp = game.sdp || {};
  game.sdp.conditions = SdpConditionEngine;
  game.sdp.turn = SdpTurnEngine;
  game.sdp = {
  ...game.sdp,
  level: SdpLevelService
};
game.sdp.levelUpApp = LevelUpApp;

sdpSocket = socketlib.registerSystem("sdp");

sdpSocket.register(
  "observerUpdate",
  async (actorId, update) => {

    const actor =
      game.actors.get(actorId);

    if (!actor) return;

    await actor.update(update);

    console.log(
      "GM UPDATE APPLIED"
    );

  }
);

});


Hooks.on("updateCombat", async (combat, changed) => {

  if(!("turn" in changed)) return;

  // =========================
  // IGNORE COMBAT START
  // =========================

  if(combat.round === 0) return;

  // ignore first activation of combat
  if(combat.round === 1 && combat.turn === 0 && changed.turn === 0) return;

  const newTurn = combat.turn;

  const previousTurn =
    newTurn === 0
      ? combat.turns.length - 1
      : newTurn - 1;

  const previousCombatant = combat.turns[previousTurn];
  const currentCombatant = combat.turns[newTurn];

  if(previousCombatant?.actor){
    await game.sdp.turn.endTurn(previousCombatant.actor);
  }

  if(currentCombatant?.actor){
    await game.sdp.turn.startTurn(currentCombatant.actor);
  }

});
Hooks.on("createItem", async (item) => {

  const actor = item.parent;
  if (!actor) return;

  // =========================
  // 🩸 INJURY (TON CODE EXISTANT)
  // =========================

  if (item.type !== "injury") return;

  const removeOnDelete = item.system.removeOnDelete ?? true;

  for (const effect of item.effects) {

    for (const change of effect.changes) {

      if (!change.key?.startsWith("system.custom.conditionEffects")) continue;

      const key = change.key.split(".").pop();
      const value = Number(change.value || 0);

      const current = actor.system.conditions?.[key] ?? 0;

      await actor.update({
        [`system.conditions.${key}`]: current + value
      });

    }

  }

});

Hooks.on("deleteItem", async (item) => {

  if (item.type !== "injury") return;

  const actor = item.parent;
  if (!actor) return;

  for (const effect of item.effects) {

    for (const change of effect.changes) {

      if (!change.key?.startsWith("system.custom.conditionEffects")) continue;

      // 🔥 NOUVEAU : check ici
      if (item.system.removeOnDelete === false) continue;

      const key = change.key.split(".").pop();
      const value = Number(change.value || 0);

      const current = actor.system.conditions?.[key] ?? 0;

      await actor.update({
        [`system.conditions.${key}`]: Math.max(current - value, 0)
      });

    }

  }

});

Hooks.on("updateActor", async (actor, changes) => {

  const cond = changes.system?.conditions;
  if (!cond) return;

  if (cond.dying === true) {
    await actor.update({
      "system.conditions.unconscious": true,
      "system.conditions.prone": true
    });
  }

  if (cond.unconscious === true) {
    await actor.update({
      "system.conditions.prone": true
    });
  }

});