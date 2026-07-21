import { LevelUpApp } from "../apps/level-up-app.js";

function getDefaultCurrencyItems() {
  return [
    {
      name: game.i18n.localize("SDP.CurrencyPlatinum"),
      type: "currency",
      img: "systems/sdp/assets/icons/currency/platinum.png",
      system: {
        denomination: { value: "platinum" },
        quantity: { value: 0 },
        encumbrance: { value: 0.001 }
      }
    },
    {
      name: game.i18n.localize("SDP.CurrencyGold"),
      type: "currency",
      img: "systems/sdp/assets/icons/currency/gold.png",
      system: {
        denomination: { value: "gold" },
        quantity: { value: 0 },
        encumbrance: { value: 0.001 }
      }
    },
    {
      name: game.i18n.localize("SDP.CurrencySilver"),
      type: "currency",
      img: "systems/sdp/assets/icons/currency/silver.png",
      system: {
        denomination: { value: "silver" },
        quantity: { value: 0 },
        encumbrance: { value: 0.001 }
      }
    },
    {
      name: game.i18n.localize("SDP.CurrencyCopper"),
      type: "currency",
      img: "systems/sdp/assets/icons/currency/copper.png",
      system: {
        denomination: { value: "copper" },
        quantity: { value: 0 },
        encumbrance: { value: 0.001 }
      }
    }
  ];
}

export async function ensureDefaultCurrencies(actor) {
  if (!actor) return false;

  // Prevent createActor + sheet open from racing into duplicates.
  if (actor._sdpEnsuringCurrencies) return false;
  actor._sdpEnsuringCurrencies = true;

  try {
    const existing = new Set(
      actor.items
        .filter(i => i.type === "currency")
        .map(i => String(i.system?.denomination?.value || "").toLowerCase())
    );

    const missing = getDefaultCurrencyItems().filter(
      item => !existing.has(
        String(item.system.denomination.value || "").toLowerCase()
      )
    );

    if (!missing.length) return false;

    await actor.createEmbeddedDocuments("Item", missing);
    return true;
  } finally {
    delete actor._sdpEnsuringCurrencies;
  }
}

export function registerActorHandlers() {

Hooks.on("createActor", async (actor) => {

  // =========================
  // VEHICLE → currencies only (like character inventory money)
  // =========================

  if (actor.type === "vehicle") {
    await ensureDefaultCurrencies(actor);
    return;
  }

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

  const DEFAULT_ADVANCED_SKILL_KEYS = [
    "discretion",
    "entertainment",
    "art",
    "riding"
  ];

  const basicSkills =
    skillDocs.filter(skill => {

      if (skill.type !== "skill") return false;

      if (
        DEFAULT_ADVANCED_SKILL_KEYS.includes(
          skill.system?.key
        )
      ) {
        return false;
      }

      const advanced = skill.system?.advanced;

      if (
        advanced === true ||
        advanced === "true"
      ) {
        return false;
      }

      if (skill.system?.type === "advanced") {
        return false;
      }

      return true;

    });

  const advancedSkills =
    skillDocs.filter(skill =>
      skill.type === "skill" &&
      DEFAULT_ADVANCED_SKILL_KEYS.includes(
        skill.system?.key
      )
    );

  const seenSkillKeys = new Set();

  const defaultSkills = [
    ...basicSkills,
    ...advancedSkills
  ].filter(skill => {

    const key =
      skill.system?.key ||
      skill.id;

    if (seenSkillKeys.has(key)) {
      return false;
    }

    seenSkillKeys.add(key);

    return true;

  });

  // =========================
  // DEFAULT CURRENCIES
  // =========================

  const currencies = getDefaultCurrencyItems();

  // =========================
  // CREATE
  // =========================

  const toCreate = [

    ...defaultSkills,

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
    game.i18n.localize(
      "SDP.LogDefaultSkillsAdded"
    ),
    {
      actor: actor.name,
      type: actor.type,
      count: toCreate.length
    }
  );

});

}