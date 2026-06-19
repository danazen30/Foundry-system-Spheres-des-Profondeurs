import { SdpRoll } from "../rolls/roll.js";
import { SdpAttack } from "../combat/attack.js";
import {
  getCareerJournalHtmlForPage,
  isCareerJournalPage
} from "../journal/career-journal.js";
import { SDP } from "../system/config.js";
import { SimpleDialog } from "../apps/simple-dialog.js";
import { SdpSpell } from "../combat/spell.js";
import { SdpConditionEngine } from "../system/condition-engine.js";
import {
  getLocalizedInjurySeverity,
  getInjuryDisplayLocation,
  getInjuryLocationLabel
} from "../system/injury-utils.js";

import { getCost, getTalentCost, getTalentMax, getAttributes, getXPData, getSkillMap, getCurrentCareer, getXPBar, getSpellsByType, sortCurrencyItems} from "./actor-sheet-utils.js";
import { registerAttributeListeners, registerSkillListeners} from "./actor-sheet-listeners.js";
import { prepareWeapons, prepareArmors, prepareInventory, prepareContainerData, prepareEquipmentSlots} from "./actor-sheet-equipment.js";
import { registerCombatListeners } from "./actor-sheet-combat.js";
import { registerXPListeners } from "./actor-sheet-xp.js";
import { registerUIListeners, registerItemListeners, restoreScroll} from "./actor-sheet-ui.js";
import { registerInteractionListeners } from "./actor-sheet-interactions.js";
import {
  findActorItemByRef,
  getActorItemDisplayName,
  getLocalizedItemDescription,
  matchesItemRef,
  parseKeyList,
  resolveItemRef,
  getLocalizedSignLevelDescription
} from "../system/item-localization.js";
import { formatPlainTextAsHtml } from "../system/text-format.js";

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class SdpActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

constructor(...args) {
    super(...args);

    const isGM = game.user?.isGM;

this.activeTab =
  this.actor?.type === "npc"
    ? (isGM ? "skills" : "info")
    : "skills";
    this.openContainers = new Set();
    this._scrollPositions = {};
  }

  static DEFAULT_OPTIONS = {
    classes: ["sdp", "sheet", "actor"],
    position: { width: 800, height: 900 },
    window: { resizable: true },
    form: { submitOnChange: true}
  };

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/actors/character-sheet.hbs"
    }
  };

  static LAYOUT = {
    template: "templates/applications/sheet.hbs",
    parts: ["sheet"]
  };

async render(...args) {

const root = this.element;

const html =
  root instanceof HTMLElement
    ? root
    : root?.[0] ?? root?.element ?? root;


const prevEl = this.element?.querySelector(".sdp-content-inner");

if (prevEl && prevEl.scrollHeight > prevEl.clientHeight) {
  this._scrollPositions.main = prevEl.scrollTop;
}

  return super.render(...args);
}

get isEditable() {

  // GM
  if (game.user.isGM) {
    return true;
  }

  // owner normal
  if (super.isEditable) {
    return true;
  }

  // observer NPC → autorise édition player notes
  const isObserver =
    this.actor.testUserPermission(
      game.user,
      CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER
    );

  const isNpc =
    this.actor.type === "npc";

  if (isNpc && isObserver) {
    return true;
  }

  return false;
}

  async _prepareContext() {

    const context = {};
    const attributes = getAttributes(this.document);

const sign = this.document.getSign();
const signEffects = this.actor.getSignEffects();

const xpData = getXPData(this.document);

const skillMap = getSkillMap(this.document);

const currentCareer = getCurrentCareer(this.document);

// =========================
// TALENT UI FLAGS
// =========================

let careerTalents = currentCareer?.system?.talents || [];

// =========================
// NORMALIZE TALENTS FORMAT
// =========================

if (typeof careerTalents === "string") {

  careerTalents = careerTalents
    .split(",")
    .map(t => t.trim());

}

if (!Array.isArray(careerTalents)) {
  careerTalents = [];
}

for (const item of this.document.items) {
  item.displayName =
    getActorItemDisplayName(item);
}

for (const item of this.document.items) {

  if (item.type !== "talent") continue;

  const isCareerTalent = careerTalents.some(ref =>
    matchesItemRef(item, ref)
  );

  const advances = Number(item.system.advances || 0);

  const isPurchased =
  advances > 0;

  const isAvailable =
    isCareerTalent &&
    !isPurchased;

  item.isCareerTalent = isCareerTalent;
  item.isPurchased = isPurchased;
  item.isAvailable = isAvailable;

  const itemKey =
    item.system?.key?.trim?.() ?? "";

  const localizedDescription =
    itemKey
      ? getLocalizedItemDescription(
          item.type,
          itemKey,
          ""
        )
      : "";

  const customDescription =
    item.system?.description ?? "";

  let descriptionText = "";

  if (
    localizedDescription &&
    customDescription
  ) {
    descriptionText =
      `${localizedDescription}\n\n${customDescription}`;
  }
  else if (localizedDescription) {
    descriptionText = localizedDescription;
  }
  else {
    descriptionText = customDescription;
  }

  item.localizedDescription =
    formatPlainTextAsHtml(descriptionText);

}

let careerSkills = currentCareer?.system?.skills || [];

if (typeof careerSkills === "string") {
  careerSkills = parseKeyList(careerSkills);
}

if (!Array.isArray(careerSkills)) {
  careerSkills = [];
}

for (const item of this.document.items) {

  if (item.type !== "skill") continue;

  item.isCareerSkill = careerSkills.some(ref =>
    matchesItemRef(item, ref)
  );

}

const xpBar = getXPBar(this.document, xpData);
const currentLevel = xpBar.currentLevel;

const {
  spellsMinor,
  spellsAdvanced,
  spellsSuperior
} = getSpellsByType(this.document);

const {
  weapons,
  meleeWeapons,
  rangedWeapons
} = prepareWeapons(this.document);

const armors =
  prepareArmors(this.document);

const {
  possessions,
  ammunition,
  clothing,
  containers
} = prepareInventory(this.document);

const {
  containerMap,
  containerLoad,
  rootItems
} = prepareContainerData(
  this.document,
  containers
);

const slots = prepareEquipmentSlots(
  armors,
  clothing,
  weapons
);

const traits = this.actor.items.filter(i => i.type === "trait");
const diseases = this.actor.items.filter(i => i.type === "disease");

// ===== ARMOR =====
for (let armor of armors) {

  if (!armor.system.worn?.value) continue;

  const s = armor.system.slots || {};

if (s.head) slots.head.push(armor);
if (s.chest) slots.chest.push(armor);
if (s.armLeft) slots.armLeft.push(armor);
if (s.armRight) slots.armRight.push(armor);
if (s.legLeft) slots.legLeft.push(armor);
if (s.legRight) slots.legRight.push(armor);
}

// ===== CLOTHING =====
for (let cloth of clothing) {

  if (!cloth.system.equipped) continue;

  const s = cloth.system.slots || {};

if (s.head) slots.head.push(cloth);
if (s.chest) slots.chest.push(cloth);
if (s.armLeft) slots.armLeft.push(cloth);
if (s.armRight) slots.armRight.push(cloth);
if (s.legLeft) slots.legLeft.push(cloth);
if (s.legRight) slots.legRight.push(cloth);
}

// ===== WEAPONS =====
for (let weapon of weapons) {

  if (!weapon.system.equipped) continue;

const handed = (weapon.system.handedness || "").toLowerCase();

// =========================
// SPECIAL → PAS DE SLOT
// =========================
if (handed === "special") {
  continue; // 🔥 ignore complètement pour la silhouette
}

  // =========================
  // 2 MAINS → prend les deux slots
  // =========================
  if (handed === "two") {

    slots.weaponMain = weapon;
    slots.weaponOff = weapon;

    continue;
  }

  // =========================
  // 1 MAIN / NORMAL
  // =========================
  if (weapon.system.offhand) {
    slots.weaponOff = weapon;
  } else {
    slots.weaponMain = weapon;
  }

}

const currency = sortCurrencyItems(
  this.document.items.filter(i =>
    i.type === "currency"
  )
);

const injuries =
  this.actor.items
    .filter(i => i.type === "injury")
    .map(item => ({

      id: item.id,
      img: item.img,
      displayName:
        getActorItemDisplayName(item),

      severityLabel:
        getLocalizedInjurySeverity(
          item.system.severity,
          item.system.severity
        ),

      locationLabel:
        getInjuryLocationLabel(
          getInjuryDisplayLocation(item.system)
        ) || getInjuryDisplayLocation(item.system),

      duration:
        item.system.duration ?? ""

    }));
const species = this.document.items
  .filter(i => i.type === "specie")
  .at(-1);

  let levelProgression = [];

if (sign?.system?.levels) {

  const levels = sign.system.levels;
const storedProgression = this.document.system.details?.levelProgression ?? [];
const signKey = sign.system?.key?.trim?.() ?? "";

levelProgression = storedProgression.map(data => {
  return {
    level: data.level,
    hp: data.hp,
    hitDice: data.hitDice,
    hpRoll: data.hpRoll,
    signRoll: data.signRoll,

    // 🔥 AJOUT
    damageBonus: data.damageBonus,
    inspirationDice: data.inspirationDice,

    description: getLocalizedSignLevelDescription(
      signKey,
      data.level,
      data.description
    )
  };
});

  // tri par niveau (important)
  levelProgression.sort((a, b) => a.level - b.level);
}

const progression =
  this.document.system.details?.levelProgression ?? [];

const hasValidatedLevel0 = progression.some(l => l.level === 0);

const isGM =
  game.user.isGM;

const isObserver =
  this.actor.testUserPermission(
    game.user,
    CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER
  );

const isLimitedObserver =
  this.actor.type === "npc" &&
  isObserver &&
  !isGM;

  const canEditPlayerNotes =
  isGM ||
  this.isOwner ||
  isLimitedObserver;

let sharedNpcNotes = "";

let sharedJournal = null;
let sharedJournalPage = null;

const sharedPageId =
  this.actor.getFlag(
    "sdp",
    "sharedNotesPage"
  );

if (sharedPageId) {

  sharedJournalPage =
    game.journal
      .contents
      .flatMap(j => j.pages.contents)
      .find(p => p.id === sharedPageId);

  sharedJournal =
    sharedJournalPage?.parent || null;

  if (sharedJournalPage) {

    sharedNpcNotes =
      isCareerJournalPage(sharedJournalPage)
        ? await getCareerJournalHtmlForPage(sharedJournalPage)
        : (sharedJournalPage.text?.content || "");

  }

}

// =========================
// NOTES
// =========================

const biography =
  this.document.system.details?.biography?.value ?? "";

const playerNotes =
  this.document.system.details?.playerNotes?.value ?? "";

const gmNotes =
  this.document.system.details?.gmNotes?.value ?? "";

const editors = {
  biography: await foundry.applications.ux.TextEditor.enrichHTML(
    biography,
    { async: true }
  ),

  playerNotes: await foundry.applications.ux.TextEditor.enrichHTML(
    playerNotes,
    { async: true }
  ),

  gmNotes: await foundry.applications.ux.TextEditor.enrichHTML(
    gmNotes,
    { async: true }
  )
};

editors.sharedNpcNotes =
  await foundry.applications.ux.TextEditor.enrichHTML(
    sharedNpcNotes,
    { async: true }
  );

  console.log(
  "WEAPONS",
  meleeWeapons,
  rangedWeapons
);

return {
  actor: this.document,
  system: this.document.system,
  config: SDP,
  attributes,
  currentCareer,
  skillMap,
  user: game.user,
  owner: this.isOwner,
  editable: this.isEditable,
  xp: xpData,
  sign,
  signEffects,
  canLevelUp:(  currentLevel === 0 &&  !hasValidatedLevel0) ||
  game.sdp.level.canLevelUp(this.actor),
  availableLevel: game.sdp.level.getAvailableLevel(this.actor),
  levelProgression,
  xpBar,
  spellsMinor,
  spellsAdvanced,
  spellsSuperior,
  meleeWeapons,
  rangedWeapons,
  possessions,
  ammunition,
  traits,
  clothing,
  containers,
  containerMap,
  armors,
  containerLoad,
  rootItems,
  diseases,
  slots,
  currency,
  injuries,
  species,
  activeTab: this.activeTab,
  isNPC: this.actor.type === "npc",
  isGM,
  isObserver,
  isLimitedObserver,
  canEditPlayerNotes,
  sharedJournal,
  sharedJournalPage,
  sharedNpcNotes,
  editors,
};
  }

  async _applyCareer(career) {

  const actor = this.document;

  const previousCareer = actor.items.find(i =>
    i.type === "career" &&
    i.system.current
  );

  // =========================
  // SET CURRENT
  // =========================

  for (const c of actor.items.filter(i => i.type === "career")) {
    await c.update({ "system.current": false });
  }

  await career.update({ "system.current": true });

  // =========================
  // UPDATE DETAILS
  // =========================

  await actor.update({
    "system.details.career.value": career.name,
    "system.details.careerGroup.value": career.system.careerGroup || "",
    "system.details.standing.value": career.system.standing || ""
  });

  // =========================
  // AUTO ADD SKILLS
  // =========================

  const skills = parseKeyList(career.system.skills);

  for (const skillRef of skills) {

    const exists = findActorItemByRef(actor, "skill", skillRef);

    if (!exists) {

      const baseSkill =
        await resolveItemRef(
          "skill",
          skillRef,
          "sdp.skills"
        );

      if (baseSkill) {
        await actor.createEmbeddedDocuments("Item", [
          baseSkill.toObject()
        ]);
      }

    }

  }

  // =========================
// REMOVE OLD CAREER TALENTS
// =========================

const oldTalents =
  parseKeyList(previousCareer?.system?.talents);

const newTalents =
  parseKeyList(career.system.talents);

// talents à supprimer
const removableTalents = actor.items.filter(item => {

  if (item.type !== "talent") return false;

  const advances =
    Number(item.system.advances || 0);

  // acheté → on garde
  if (advances > 0) return false;

  const isOldCareerTalent =
    oldTalents.some(ref =>
      matchesItemRef(item, ref)
    );

  const isStillInNewCareer =
    newTalents.some(ref =>
      matchesItemRef(item, ref)
    );

  return (
    isOldCareerTalent &&
    !isStillInNewCareer
  );

});

if (removableTalents.length > 0) {

  await actor.deleteEmbeddedDocuments(
    "Item",
    removableTalents.map(t => t.id)
  );

}

        // =========================
// AUTO ADD TALENTS
// =========================

for (const talentRef of newTalents) {

  const exists = findActorItemByRef(actor, "talent", talentRef);

  if (!exists) {

    const baseTalent =
      await resolveItemRef(
        "talent",
        talentRef,
        "sdp.talents"
      );

    if (baseTalent) {
      await actor.createEmbeddedDocuments("Item", [
        baseTalent.toObject()
      ]);
    }

  }

}

  await this.render();

}

async _addXPLog(entry) {

  const xp = this.document.system.details.experience;

  const log = Array.isArray(xp.log) ? [...xp.log] : [];

  const total = xp.total || 0;
  const spent = (xp.spent || 0);

  let label = "";

  if (entry.type === "spend") {

  label = game.i18n.format(
    "SDP.XPLog.Spend",
    {
      target: entry.target,
      old: entry.old,
      value: entry.value,
      amount: entry.amount,
      spent,
      total,
      reason: entry.reason || ""
    }
  );

}

else if (entry.type === "refund") {

  label = game.i18n.format(
    "SDP.XPLog.Refund",
    {
      target: entry.target,
      old: entry.old,
      value: entry.value,
      amount: entry.amount,
      spent,
      total,
      reason: entry.reason || ""
    }
  );

}

else if (entry.type === "gain") {

  label = game.i18n.format(
    "SDP.XPLog.Gain",
    {
      amount: entry.amount,
      spent,
      total,
      reason: entry.reason || ""
    }
  );

}

  log.unshift({
    label
  });

  await this.document.update({
    "system.details.experience.log": log
  });

}

  get id() {
    return `sdp-actor-sheet-${this.document.id}`;
  }

async _onDropItem(event, data) {

  const actor = this.document;

  if (event.target.closest(".container-block")) {
    return super._onDropItem(event, data);
  }

  const item = await Item.fromDropData(data);

  const existing = actor.items.get(item.id);

  if (existing) {

    await existing.update({
      "system.containerId": null
    });

    return;
  }

  const source = item.toObject();

  console.log(
    "DROP SOURCE",
    foundry.utils.deepClone(source)
  );

  console.log(
    "DROP SOURCE SYSTEM",
    foundry.utils.deepClone(source.system)
  );

  const created = await actor.createEmbeddedDocuments(
    "Item",
    [source]
  );

  return created;
}

async _onDrop(event) {

  const data =
  foundry.applications.ux.TextEditor
    .getDragEventData(event);

  // =========================
  // JOURNAL DROP
  // =========================

if (
  (data.type === "JournalEntry" ||
   data.type === "JournalEntryPage") &&
  this.actor.type === "npc"
) {

    let pageId = null;

// =========================
// DROP PAGE DIRECTEMENT
// =========================

if (data.type === "JournalEntryPage") {

  pageId = data.uuid.split(".").pop();

}

// =========================
// DROP JOURNAL ENTIER
// → prend première page
// =========================

else if (data.type === "JournalEntry") {

  const journalId =
    data.uuid.split(".").pop();

  const journal =
    game.journal.get(journalId);

  pageId =
    journal?.pages?.contents?.[0]?.id;

}

if (!pageId) {

  ui.notifications.warn(
  game.i18n.localize("SDP.Notifications.NoValidJournalPage")
);

  return;

}

await this.actor.setFlag(
  "sdp",
  "sharedNotesPage",
  pageId
);

ui.notifications.info(
  game.i18n.localize("SDP.Notifications.JournalLinkedToNpc")
);

this.render();

return;
  }

  return super._onDrop(event);
}

async _toggleSpellMemory(event) {

  event.preventDefault();

  const itemId = event.currentTarget.dataset.itemId;
  const item = this.actor.items.get(itemId);

  if (!item) return;

  const current = item.system.memorized?.value ?? false;

  await item.update({
    "system.memorized.value": !current
  });

}

async _castSpell(event) {

  event.preventDefault();

  const itemId = event.currentTarget.dataset.itemId;
  const spell = this.actor.items.get(itemId);

  if (!spell) return;

  const actor = this.actor;

  // =========================
  // MANA CHECK (simple)
  // =========================

  const cost = spell.system.power.value || 0;
  const mana = actor.system.resources.mana.value;

  if (mana < cost) {
    ui.notifications.warn(
  game.i18n.localize("SDP.Notifications.NotEnoughMana")
);
    return;
  }

  // =========================
  // TARGET VALUE (IMPORTANT)
  // =========================

const bestSkill = SdpSpell._getBestSpellSkill(actor, spell);

let skillLabel = "Intelligence";
let skillValue = actor.system.attributes.intelligence.value;

if (bestSkill){
  skillLabel = getActorItemDisplayName(bestSkill) || bestSkill.name;
  skillValue = bestSkill.system.value;
}

SdpRoll.openDialog({
  actor: actor,
  type: "attack",
  label: spell.name,
  target: skillValue,
  weapon: spell,
  isSpell: true,

  // 🔥 AJOUT
  spellData: {
    skillLabel,
    skillValue
  }
});

}

  async _onRender(context, options) {
  super._onRender(context, options);

  const root = this.element;

  // =========================
// PREVENT ENTER SUBMIT
// =========================

this.element.addEventListener("keydown", (event) => {

  if (event.key !== "Enter") return;

  const target = event.target;

  // autorise textarea
  if (target.tagName === "TEXTAREA") return;

  // autorise prose mirror
  if (target.closest("prose-mirror")) return;

  event.preventDefault();

});

  registerAttributeListeners(this);
  registerSkillListeners(this);
  registerCombatListeners(this, root);
  registerXPListeners(this, root);
  registerUIListeners(this, root);
  registerItemListeners(this, root);
  registerInteractionListeners(this, root);

this.element.querySelectorAll("*").forEach(e => {

  if (e.scrollHeight > e.clientHeight) {

  }

});

const unlinkBtn =
  this.element.querySelector(
    '[data-action="unlinkSharedJournal"]'
  );

if (unlinkBtn) {

  unlinkBtn.addEventListener(
    "click",
    async () => {

      await this.actor.unsetFlag(
        "sdp",
        "sharedNotesPage"
      );

      await this.render(false);

    }
  );

}

restoreScroll(this);

  }

  async _onChangeForm(formConfig, event) {

  await super._onChangeForm(formConfig, event);

  const sharedPageId =
  this.actor.getFlag(
    "sdp",
    "sharedNotesPage"
  );

if (!sharedPageId) return;

const page =
  game.journal
    .contents
    .flatMap(j => j.pages.contents)
    .find(p => p.id === sharedPageId);

  if (!page) return;

  const proseMirror =
    this.element.querySelector(
      'prose-mirror[name="sharedNpcNotes"]'
    );

  if (!proseMirror) return;

  await page.update({
  "text.content":
    proseMirror.value || ""
});

// refresh sheet
await this.render(false);

}
  
_onLevelUp() {

  const actor = this.document;

  let newLevel;

  // =========================
  // FIRST CHARACTER CREATION
  // =========================

  if ((actor.system.details?.level ?? 0) === 0) {

    const progression =
      actor.system.details?.levelProgression ?? [];

    // si aucun niveau encore appliqué
    if (progression.length === 0) {
      newLevel = 0;
    } else {
      newLevel = game.sdp.level.getAvailableLevel(actor);
    }

  }

  // =========================
  // NORMAL LEVEL UP
  // =========================

  else {

    newLevel = game.sdp.level.getAvailableLevel(actor);

  }

  const app = new game.sdp.levelUpApp(actor, newLevel);
  app.render(true);

}

async _doRest(type) {

  const actor = this.document;

  let hpRoll, manaRoll;

  if (type === "short") {

    hpRoll = new Roll("1d4");
    manaRoll = new Roll("1d4");

  } else {

    const TB = actor.system.attributes.toughness.bonus;
    const WPB = actor.system.attributes.willpower.bonus;

    hpRoll = new Roll(`${TB}d4`);
    manaRoll = new Roll(`${WPB}d4`);

  }

  // 🎲 ÉVALUATION ASYNC (OBLIGATOIRE V12)
await hpRoll.evaluate();
await manaRoll.evaluate();

// 🎲 Animation + son SANS créer de message
if (game.dice3d) {
  await game.dice3d.showForRoll(hpRoll);
  await game.dice3d.showForRoll(manaRoll);
} else {
  foundry.audio.AudioHelper.play({ src: CONFIG.sounds.dice }, true);
}

  const hp = hpRoll.total;
  const mana = manaRoll.total;

  const hpHTML = await hpRoll.render();
  const manaHTML = await manaRoll.render();

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
    <div class="sdp-rest"
         data-actor="${actor.id}"
         data-hp="${hp}"
         data-mana="${mana}"
         data-used="false">

      <h3>${
  type === "short"
    ? game.i18n.localize("SDP.Rest.Short")
    : game.i18n.localize("SDP.Rest.Long")
}</h3>

      <div class="dice-block">
        <p><strong>${game.i18n.localize("SDP.Actor.HP")}:</strong></p>
        ${hpHTML}

        <p><strong>${game.i18n.localize("SDP.Actor.Mana")}:</strong></p>
        ${manaHTML}
      </div>

      <button class="apply-rest">
  ${game.i18n.localize("SDP.Rest.Apply")}
</button>

    </div>
    `
  });

}

}

Hooks.on("createItem", async (item, options, userId) => {

  if (item.type !== "specie") return;

  const actor = item.parent;
  if (!actor) return;

  console.log("SPECIE ADDED → APPLY EFFECT");

  const updates = {};

  const baseAttrs = item.system.baseAttributes || {};

  for (const [key, value] of Object.entries(baseAttrs)) {

    if (!value) continue;

    updates[`system.attributes.${key}.initial`] = value;
  }

  // movement
  if (item.system.movement?.walk !== undefined) {
    updates["system.resources.movement.value"] = item.system.movement.walk;
  }

  await actor.update(updates);

});