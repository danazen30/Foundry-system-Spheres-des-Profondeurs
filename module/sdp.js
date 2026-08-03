import { SdpActor } from "./actors/actor.js";
import { SdpActorSheet } from "./actors/actor-sheet.js";
import { SdpNpcSheet } from "./actors/npc-sheet.js";
import { SdpCreatureSheet } from "./actors/creature-sheet.js";
import { SdpVehicleSheet } from "./actors/vehicle-sheet.js";

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
import { SdpAbilitySheet } from "./items/ability-sheet.js";
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
import { localizeWeaponGroupRef } from "./system/weapon-group-utils.js";
import { SdpConditionEngine } from "./system/condition-engine.js";
import { SdpTurnEngine } from "./system/turn-engine.js";
import {
  indexSdpItemPacks,
  installSdpCompendiumIndexLocalization,
  localizeAllSdpCompendiumIndices,
  localizeRolltableCompendium,
  localizeSdpCompendium,
  localizeSidebarFolders,
  localizeSidebarItems,
  localizeSdpPackIndex,
  refreshSdpUiLocalization,
  registerSdpCompendiumIndexFields,
  requestSdpCompendiumResort,
  resetSdpCompendiumResortFlag,
  getLocalizedCreatureName,
  resolveActorKey,
  syncCreatureLocalizedName
} from "./system/item-localization.js";
import {
  applySdpRollTableFlags,
  ensureSdpRollTableFlags,
  getLocalizedRollTableName,
  localizeRollTableChatLinks,
  localizeRollTableChatDraw,
  localizeRollTableSheet,
  localizeTableResultConfig,
  registerSdpRollTableDrawHook
} from "./system/roll-table-utils.js";
import {
  registerInjuryHooks
} from "./system/injury-utils.js";
import {
  configureCareerJournalPage,
  configureLoreJournalPage,
  configureSdpJournal,
  createSdpCareerJournal,
  rebuildAllCareerJournalCaches,
  refreshAllSdpJournalDisplayNames,
  registerCareerJournalHooks,
  resolveJournalEntry,
  resolveJournalPage,
  syncSdpJournalDisplayNames
} from "./journal/career-journal.js";
import {
  bootstrapSdpStartScene,
  registerSceneBootstrapSettings
} from "./scene/scene-bootstrap.js";
import {
  registerPackMigrationSettings,
  removeTradeAlchemistSkill
} from "./system/pack-migrations.js";
import { SdpMount } from "./system/mount-utils.js";

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

/* ========================================= */
/* INIT                                      */
/* ========================================= */

  Hooks.once("init", async () => {

    registerSceneBootstrapSettings();
    registerPackMigrationSettings();
    registerSdpCompendiumIndexFields();

    Handlebars.registerHelper(
      "localize",
      foundry.applications.handlebars.localize
    );

    Handlebars.registerHelper(
      "localizeWeaponGroup",
      (key) => localizeWeaponGroupRef(key)
    );

    Handlebars.registerHelper(
      "concat",
      (...args) => {
        args.pop();
        return args.join("");
      }
    );

    Handlebars.registerHelper(
      "localizeAttributeAbbr",
      (key) => {
        if (!key) return "";
        const normalized =
          key.charAt(0).toUpperCase() + key.slice(1);
        const i18nKey =
          `SDP.AttributeAbbr.${normalized}`;
        return game.i18n.has(i18nKey)
          ? game.i18n.localize(i18nKey)
          : key;
      }
    );

    console.log(
  "SYSTEM JSON",
  game.system
);

    console.log("========== SDP TEMPLATE DEBUG ==========");

const templateResponse = await fetch("systems/sdp/template.json");
const templateJson = await templateResponse.json();

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
    "systems/sdp/templates/partials/vehicle-header.hbs",
    "systems/sdp/templates/partials/vehicle-info.hbs",
    "systems/sdp/templates/actors/vehicle-sheet.hbs",
    "systems/sdp/templates/partials/items/item-header-physical.hbs",
    "systems/sdp/templates/partials/items/item-description-tab.hbs",
    "systems/sdp/templates/partials/items/item-effects-tab.hbs",
    "systems/sdp/templates/partials/items/item-header-simple.hbs",
    "systems/sdp/templates/journal/career-page.hbs"
  ]);

  registerCareerJournalHooks();

  CONFIG.SDP = SDP;

  game.sdp = game.sdp || {};
game.sdp.Roll = SdpRoll;
game.sdp.level = SdpLevelService;

  SdpMount.register();

  CONFIG.Actor.documentClass = SdpActor;
  CONFIG.Item.documentClass = SdpItem;

  Hooks.on("preCreateItem", (item, data) => {

  console.log("PRECREATE SYSTEM");
  console.log(data.system);

});


  registerActorHandlers();

// ACTORS
foundry.documents.collections.Actors.unregisterSheet("core", foundry.applications.sheets.ActorSheetV2);

foundry.documents.collections.Actors.registerSheet("sdp", SdpActorSheet, {types: ["character"], makeDefault: true});

foundry.documents.collections.Actors.registerSheet("sdp", SdpNpcSheet, {types: ["npc"], makeDefault: true});

foundry.documents.collections.Actors.registerSheet("sdp", SdpCreatureSheet, {types: ["creature"], makeDefault: true});

foundry.documents.collections.Actors.registerSheet("sdp", SdpVehicleSheet, {types: ["vehicle"], makeDefault: true});

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

foundry.documents.collections.Items.registerSheet("sdp", SdpAbilitySheet, { types: ["ability"], makeDefault: true });

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

  if (actor.type === "creature") {
    await syncCreatureLocalizedName(actor);
  }

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
registerSdpRollTableDrawHook();
registerInjuryHooks();

/* ========================================= */
/* COMPENDIUM LOCALIZATION                   */
/* ========================================= */

function getPackLabelKey(pack) {

  if (pack.metadata._sdpLabelKey) {
    return pack.metadata._sdpLabelKey;
  }

  const label =
    pack.metadata.label;

  if (label?.startsWith?.("SDP.")) {
    pack.metadata._sdpLabelKey = label;
    return label;
  }

  const systemDef =
    game.system.packs?.find(
      def =>
        def.name === pack.metadata.name
    );

  if (
    systemDef?.label?.startsWith?.(
      "SDP."
    )
  ) {
    pack.metadata._sdpLabelKey =
      systemDef.label;
    return systemDef.label;
  }

  if (
    pack.metadata.id === "sdp.rolltables"
  ) {
    pack.metadata._sdpLabelKey =
      "SDP.RollTablePackLabel";
    return pack.metadata._sdpLabelKey;
  }

  return null;

}

function localizeAllSdpPackLabels() {

  for (const pack of game.packs) {

    if (pack.metadata.system !== "sdp")
      continue;

    const key =
      getPackLabelKey(pack);

    if (key) {
      pack.metadata.label =
        game.i18n.localize(key);
    }

  }

}

function localizeCompendiumSidebarPacks(
  element
) {

  if (!element) return;

  for (const pack of game.packs) {

    if (pack.metadata.system !== "sdp")
      continue;

    const key =
      getPackLabelKey(pack);

    if (!key) continue;

    const text =
      game.i18n.localize(key);

    const packId =
      pack.metadata.id;

    element.querySelectorAll(
      `[data-pack="${packId}"], [data-collection="${pack.collection}"]`
    ).forEach(row => {

      const nameEl =
        row.querySelector(
          ".entry-name, .name, h4, a"
        );

      if (nameEl) {
        nameEl.textContent = text;
      }

    });

  }

}

function applySdpCompendiumLocalization(app, element) {

  const pack = app.collection;

  if (pack?.metadata?.system !== "sdp")
    return;

  const html =
    element instanceof HTMLElement
      ? element
      : element?.[0];

  if (!html) return;

  if (
    requestSdpCompendiumResort(
      app,
      SDP_ROLLTABLE_LOCALIZATION
    )
  ) {
    return;
  }

  const localize = () => {

    const labelKey =
      getPackLabelKey(pack);

    if (labelKey) {

      const title =
        game.i18n.localize(labelKey);

      const windowTitle =
        html.closest?.(".application")
          ?.querySelector?.(".window-title")
        ?? html.querySelector?.(
          ".window-title"
        );

      if (windowTitle) {
        windowTitle.textContent = title;
      }

    }

    localizeSdpCompendium(
      html,
      pack,
      SDP_ROLLTABLE_LOCALIZATION
    );

  };

  requestAnimationFrame(() => {
    localize();
    requestAnimationFrame(localize);
  });

}

Hooks.on(
  "renderCompendium",
  (app, html) => {

    const pack = app.collection;

    if (pack?.metadata?.system !== "sdp")
      return;

    const element =
      html instanceof HTMLElement
        ? html
        : html[0];

    if (!element)
      return;

    if (
      requestSdpCompendiumResort(
        app,
        SDP_ROLLTABLE_LOCALIZATION
      )
    ) {
      return;
    }

    const localize = () => {
      localizeSdpCompendium(
        element,
        pack,
        SDP_ROLLTABLE_LOCALIZATION
      );
    };

    requestAnimationFrame(() => {
      localize();
      requestAnimationFrame(localize);
    });

  }
);

Hooks.on(
  "closeApplicationV2",
  (app) => {

    if (app.collection?.metadata?.system === "sdp") {
      resetSdpCompendiumResortFlag(app);
    }

  }
);

Hooks.on(
  "renderApplicationV2",
  (app, element) => {

    if (app.collection?.metadata?.system === "sdp") {
      applySdpCompendiumLocalization(app, element);
      return;
    }

    const html =
      element instanceof HTMLElement
        ? element
        : element?.[0];

    if (!html)
      return;

    if (
      app.document?.documentName ===
      "TableResult"
    ) {

      const result =
        app.document;

      requestAnimationFrame(() => {
        localizeTableResultConfig(
          result,
          html
        );
      });

      return;

    }

    if (
      app.document?.documentName !==
      "RollTable"
    ) return;

    const table =
      app.document;

    const localizedName =
      getLocalizedRollTableName(table);

    if (localizedName) {

      const windowTitle =
        html.querySelector(
          ".window-title"
        );

      if (windowTitle) {
        windowTitle.textContent =
          localizedName;
      }

      const docName =
        html.querySelector(
          ".sheet-header h1"
        );

      if (docName) {
        docName.textContent =
          localizedName;
      }

    }

    requestAnimationFrame(() => {
      localizeRollTableSheet(
        table,
        html
      );
    });

  }
);

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

    requestAnimationFrame(async () => {
      localizeRollTableChatLinks(html);
      await localizeRollTableChatDraw(
        message,
        html
      );
    });

  }
);

/* ========================================= */
/* READY                                     */
/* ========================================= */

Hooks.once("ready", async () => {

  setTimeout(() => {

    for (const app of Object.values(ui.windows)) {

      if (app.rendered) {
        app.render(true);
      }

    }

  }, 1000);


  game.system.description =
    game.i18n.localize(
      "SDP.SystemDescription"
    );

  localizeAllSdpPackLabels();

  const pack =
    game.packs.get("sdp.rolltables");

  if (pack) {

    await pack.getIndex({
      fields: [
        "name",
        "flags.sdp.key",
        "flags.sdp.group"
      ]
    });

    await ensureSdpRollTableFlags(pack);

  }

  game.sdp = game.sdp || {};
  game.sdp.conditions = SdpConditionEngine;
  game.sdp.turn = SdpTurnEngine;
  game.sdp = {
  ...game.sdp,
  level: SdpLevelService
};
game.sdp.levelUpApp = LevelUpApp;
game.sdp.createCareerJournal = createSdpCareerJournal;
game.sdp.configureCareerJournalPage = configureCareerJournalPage;
game.sdp.configureJournal = configureSdpJournal;
game.sdp.configureLoreJournalPage = configureLoreJournalPage;
game.sdp.resolveJournalEntry = resolveJournalEntry;
game.sdp.resolveJournalPage = resolveJournalPage;
game.sdp.syncCareerJournal = syncSdpJournalDisplayNames;
game.sdp.syncJournal = syncSdpJournalDisplayNames;
game.sdp.applyRollTableFlags = async () => {

  const rolltablePack =
    game.packs.get("sdp.rolltables");

  if (!rolltablePack) {
    return { updated: [], skipped: [] };
  }

  return applySdpRollTableFlags(rolltablePack);

};

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

installSdpCompendiumIndexLocalization(
  SDP_ROLLTABLE_LOCALIZATION
);

await indexSdpItemPacks();

await removeTradeAlchemistSkill();

localizeAllSdpCompendiumIndices(
  SDP_ROLLTABLE_LOCALIZATION
);

await bootstrapSdpStartScene();

await rebuildAllCareerJournalCaches();

await refreshAllSdpJournalDisplayNames();

if (game.user.isGM) {
  for (const actor of game.actors) {
    if (actor.type !== "creature") continue;
    await syncCreatureLocalizedName(actor);
  }
}

Hooks.callAll(
  "sdpRefreshLocalization"
);

refreshSdpUiLocalization();

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

      const key = change.key.split(".").pop();
      const value = Number(change.value || 0);

      const current = actor.system.conditions?.[key] ?? 0;

      if (value > 0 && current > 0) {
        await SdpConditionEngine.remove(
          actor,
          key,
          Math.min(value, current)
        );
      }

    }

  }

});

Hooks.on("preCreateActor", (document, data) => {

  const type = data.type || document.type;
  if (type !== "creature") return;

  if (foundry.utils.getProperty(data, "flags.sdp.customName")) {
    return;
  }

  const key =
    (typeof data.system?.key === "string" && data.system.key.trim())
    || (typeof data.flags?.sdp?.key === "string" && data.flags.sdp.key.trim())
    || "";

  const localized = getLocalizedCreatureName(key, "");
  if (localized) {
    data.name = localized;
  }

});

Hooks.on("preUpdateActor", (document, update) => {

  if (document.documentName !== "Actor") return;

  SdpActor.normalizeInitialUpdate(document, update);

  if (document.type === "creature") {
    const nameChanged =
      Object.prototype.hasOwnProperty.call(update, "name");

    if (nameChanged) {
      const nextKey =
        typeof update.system?.key === "string"
          ? update.system.key.trim()
          : resolveActorKey(document);

      const localized = getLocalizedCreatureName(nextKey, "");

      if (localized && update.name === localized) {
        foundry.utils.setProperty(
          update,
          "flags.sdp.customName",
          false
        );
      } else if (update.name !== document.name) {
        foundry.utils.setProperty(
          update,
          "flags.sdp.customName",
          true
        );
      }
    }
  }

  if (game.user.isGM || document.type !== "character") return;

  // Players cannot change character size
  if (update.system?.details?.size?.value !== undefined) {
    delete update.system.details.size.value;
    if (!Object.keys(update.system.details.size).length) {
      delete update.system.details.size;
    }
    if (!Object.keys(update.system.details).length) {
      delete update.system.details;
    }
  }

  // Players cannot change attribute modifiers manually
  const attrs = update.system?.attributes;
  if (attrs) {
    for (const key of Object.keys(attrs)) {
      if (attrs[key]?.modifier !== undefined) {
        delete attrs[key].modifier;
      }
      if (attrs[key] && !Object.keys(attrs[key]).length) {
        delete attrs[key];
      }
    }
    if (!Object.keys(attrs).length) {
      delete update.system.attributes;
    }
  }

});

Hooks.on("updateActor", async (actor, changes) => {

  if (actor.type === "creature") {
    const keyChanged =
      changes.system?.key !== undefined
      || changes.flags?.sdp?.key !== undefined;

    if (keyChanged) {
      await syncCreatureLocalizedName(actor);
    }
  }

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

Hooks.on(
  "renderSidebarTab",
  (app, html) => {

    const element =
      html instanceof HTMLElement
        ? html
        : html[0];

    if (!element) return;

    if (app.tabName === "items") {

      requestAnimationFrame(() => {
        localizeSidebarFolders(element);
        localizeSidebarItems(element);
      });

      return;

    }

    if (app.tabName === "compendium") {

      requestAnimationFrame(() => {
        localizeAllSdpPackLabels();
        localizeCompendiumSidebarPacks(
          element
        );
      });

    }

  }
);

function getDirectoryRootElement(app, html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  if (app?.element instanceof HTMLElement) return app.element;
  if (app?.element?.[0] instanceof HTMLElement) return app.element[0];
  return null;
}

function refreshItemDirectoryLabels(app, html) {
  const element = getDirectoryRootElement(app, html);
  if (!element) return;

  requestAnimationFrame(() => {
    localizeSidebarFolders(element);
    localizeSidebarItems(element);
  });
}

// Foundry V13 ApplicationV2 ItemDirectory
Hooks.on("renderItemDirectory", refreshItemDirectoryLabels);

Hooks.on("updateItem", (item, changes) => {
  if (item.isEmbedded) return;

  const touchesIndex =
    foundry.utils.hasProperty(changes, "system.index")
    || foundry.utils.hasProperty(changes, "system.key")
    || ("name" in changes);

  if (!touchesIndex) return;

  // Monde : rafraîchir l'onglet Items
  const itemsApp =
    ui.items
    ?? ui.sidebar?.tabs?.items;

  if (itemsApp?.rendered) {
    refreshItemDirectoryLabels(itemsApp, itemsApp.element);
  }

  // Compendium ouvert : réappliquer l'index localisé
  if (item.pack) {
    const pack = game.packs.get(item.pack);
    if (pack?.metadata?.system === "sdp") {
      // Mettre à jour l'entrée d'index en mémoire (inclut system.index)
      const indexEntry = pack.index.get(item.id);
      if (indexEntry) {
        if (indexEntry.system) {
          indexEntry.system.index = item.system?.index ?? "";
          indexEntry.system.key = item.system?.key ?? indexEntry.system.key;
        } else {
          indexEntry.system = {
            key: item.system?.key ?? "",
            index: item.system?.index ?? ""
          };
        }
        indexEntry.name = item.name;
        delete indexEntry._sdpSourceName;
        localizeSdpPackIndex(pack);
      }

      for (const app of Object.values(ui.windows)) {
        if (app.collection === pack) {
          const el = getDirectoryRootElement(app, app.element);
          if (el) localizeSdpCompendium(el, pack);
        }
      }
    }
  }
});

function refreshSdpItemSheets() {

  for (const app of Object.values(ui.windows)) {

    if (
      app instanceof SdpItemSheet
    ) {

      app.window.title =
        app.title;

      app.render(true);

    }

  }

}

function refreshOpenSdpCompendiumApps() {

  for (const app of Object.values(ui.windows)) {

    if (
      app.collection?.metadata?.system ===
      "sdp"
    ) {
      resetSdpCompendiumResortFlag(app);
      app.render(true);
    }

  }

}

Hooks.on(
  "updateCompendium",
  (pack) => {

    if (pack.metadata?.system !== "sdp") return;

    localizeAllSdpCompendiumIndices(
      SDP_ROLLTABLE_LOCALIZATION
    );

    refreshOpenSdpCompendiumApps();

  }
);

Hooks.on(
  "i18nInit",
  () => {

    localizeAllSdpPackLabels();
    localizeAllSdpCompendiumIndices(
      SDP_ROLLTABLE_LOCALIZATION
    );
    refreshSdpItemSheets();
    refreshSdpUiLocalization();
    refreshOpenSdpCompendiumApps();

    rebuildAllCareerJournalCaches().then(async () => {

      await refreshAllSdpJournalDisplayNames();

      for (const app of Object.values(ui.windows)) {

        const docName =
          app.document?.documentName;

        if (
          docName === "JournalEntry" ||
          docName === "JournalEntryPage"
        ) {
          app.render(true);
        }

      }

    });

  }
);

Hooks.on(
  "changeSetting",
  (setting) => {

    if (
      setting.namespace !== "core" ||
      setting.key !== "language"
    ) return;

    localizeAllSdpPackLabels();
    localizeAllSdpCompendiumIndices(
      SDP_ROLLTABLE_LOCALIZATION
    );
    refreshSdpItemSheets();
    refreshSdpUiLocalization();
    refreshOpenSdpCompendiumApps();

    rebuildAllCareerJournalCaches().then(async () => {
      await refreshAllSdpJournalDisplayNames();
    });

  }
);