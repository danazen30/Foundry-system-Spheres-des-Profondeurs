/**
 * Pages journal « carrière SDP » : contenu généré et traduit automatiquement.
 *
 * Configuration d'une page (onglet Détails → flags) :
 *   flags.sdp.type  = "career"
 *   flags.sdp.key   = "trader"           → clés SDP.Journal.Career.trader.*
 *   flags.sdp.tiers = ["trader"]         → clés d'items carrière (compendium), dans l'ordre
 *
 * Le corps HTML de la page peut rester vide : tout est rendu par le système.
 */

import {
  findCompendiumItemByRef,
  formatLocalizedKeyList,
  formatLocalizedTrappings,
  getLocalizedItemName,
  localizeCareerGroupRef,
  localizeStanding,
  parseKeyList,
  resolveItemRef
} from "../system/item-localization.js";

const CAREER_PACK = "sdp.careers";
const SKILLS_PACK = "sdp.skills";
const TALENTS_PACK = "sdp.talents";

const TIER_ROMAN = [
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII"
];

const careerJournalCache = new Map();

function cacheKey(page) {

  const pageId =
    page?.id ?? page?._id ?? "";

  return `${pageId}:${game.i18n.lang}`;

}

export function isCareerJournalPage(page) {

  if (!page) return false;

  return page.getFlag?.("sdp", "type") === "career"
    || page.flags?.sdp?.type === "career";

}

function getCareerJournalKey(page) {

  const flagged =
    page.getFlag?.("sdp", "key")
    ?? page.flags?.sdp?.key;

  if (typeof flagged === "string" && flagged.trim()) {
    return flagged.trim();
  }

  const name =
    typeof page.name === "string"
      ? page.name.trim().toLowerCase()
      : "";

  return name.replace(/\s+/g, "_");

}

function getTierKeys(page, journalKey) {

  const flagged =
    page.getFlag?.("sdp", "tiers")
    ?? page.flags?.sdp?.tiers;

  if (Array.isArray(flagged) && flagged.length) {
    return flagged
      .map(entry => String(entry).trim())
      .filter(Boolean);
  }

  if (typeof flagged === "string" && flagged.trim()) {
    return parseKeyList(flagged);
  }

  return journalKey ? [journalKey] : [];

}

function localizeJournalField(journalKey, field) {

  const translationKey =
    `SDP.Journal.Career.${journalKey}.${field}`;

  return game.i18n.has(translationKey)
    ? game.i18n.localize(translationKey)
    : "";

}

function formatIntro(text) {

  if (!text?.trim()) return "";

  return text
    .split(/\n{2,}/)
    .map(paragraph => `<p>${foundry.utils.escapeHTML(paragraph.trim())}</p>`)
    .join("");

}

async function buildItemUuidLink(type, ref, packId) {

  const doc =
    await resolveItemRef(type, ref, packId);

  const label =
    getLocalizedItemName(
      type,
      ref,
      doc?.name ?? ref
    );

  if (!doc?.uuid) return foundry.utils.escapeHTML(label);

  return `@UUID[${doc.uuid}]{${label}}`;

}

async function buildItemLinkListHtml(type, value, packId) {

  const keys = parseKeyList(value);

  if (!keys.length) return "";

  const items = await Promise.all(
    keys.map(key =>
      buildItemUuidLink(type, key, packId)
    )
  );

  return `<ul class="sdp-career-links">${items.map(link =>
    `<li>${link}</li>`
  ).join("")}</ul>`;

}

async function prepareTierContext(careerItem, index) {

  const key =
    careerItem.system?.key?.trim()
    || careerItem.name;

  const name =
    getLocalizedItemName(
      "career",
      key,
      careerItem.name
    );

  const roman =
    TIER_ROMAN[index] ?? String(index + 1);

  const system = careerItem.system ?? {};

  const skillsHtml =
    await buildItemLinkListHtml(
      "skill",
      system.skills,
      SKILLS_PACK
    );

  const talentsHtml =
    await buildItemLinkListHtml(
      "talent",
      system.talents,
      TALENTS_PACK
    );

  const workSkillLink =
    system.workSkill
      ? await buildItemUuidLink(
          "skill",
          system.workSkill,
          SKILLS_PACK
        )
      : "";

  return {
    heading: `${roman}. ${name}`,
    standing: localizeStanding(system.standing),
    characteristics: formatLocalizedKeyList(
      system.characteristics,
      { characteristic: true }
    ),
    skillsHtml,
    talentsHtml,
    workSkill: workSkillLink,
    trappings: formatLocalizedTrappings(system.trappings),
    sheetLink:
      `@UUID[${careerItem.uuid}]`
      + `{${game.i18n.format(
        "SDP.Journal.Career.ViewSheet",
        { name }
      )}}`
  };

}

export async function prepareCareerJournalContext(page) {

  const journalKey = getCareerJournalKey(page);
  const tierKeys = getTierKeys(page, journalKey);

  const tiers = [];

  for (const tierKey of tierKeys) {

    const careerItem =
      await findCompendiumItemByRef(
        CAREER_PACK,
        "career",
        tierKey
      );

    if (!careerItem) continue;

    tiers.push(
      await prepareTierContext(
        careerItem,
        tiers.length
      )
    );

  }

  const title =
    localizeJournalField(journalKey, "Title")
    || getLocalizedItemName(
      "career",
      journalKey,
      journalKey
    );

  const speciesKeys =
    localizeJournalField(journalKey, "Species");

  const groupKey =
    localizeJournalField(journalKey, "CareerGroup");

  const species =
    speciesKeys
      ? formatLocalizedKeyList(
          speciesKeys,
          { type: "specie" }
        )
      : "";

  const group =
    groupKey
      ? localizeCareerGroupRef(groupKey)
      : "";

  return {
    journalKey,
    title,
    epigraph1: localizeJournalField(journalKey, "Epigraph1"),
    epigraph2: localizeJournalField(journalKey, "Epigraph2"),
    intro: formatIntro(
      localizeJournalField(journalKey, "Intro")
    ),
    species,
    group,
    tiers,
    missingTiers: !tiers.length
  };

}

export async function renderCareerJournalHtml(page) {

  const context =
    await prepareCareerJournalContext(page);

  const raw =
    await foundry.applications.handlebars.renderTemplate(
      "systems/sdp/templates/journal/career-page.hbs",
      context
    );

  return foundry.applications.ux.TextEditor.enrichHTML(
    raw,
    {
      async: true,
      documents: true,
      links: true,
      embeds: false
    }
  );

}

export async function refreshCareerJournalCache(page) {

  if (!isCareerJournalPage(page)) return;

  const html =
    await renderCareerJournalHtml(page);

  careerJournalCache.set(
    cacheKey(page),
    html
  );

}

export function getCachedCareerJournalHtml(page) {

  return careerJournalCache.get(
    cacheKey(page)
  ) ?? "";

}

export async function getCareerJournalHtmlForPage(page) {

  if (!isCareerJournalPage(page)) {
    return page?.text?.content ?? "";
  }

  const cached =
    getCachedCareerJournalHtml(page);

  if (cached) return cached;

  await refreshCareerJournalCache(page);

  return getCachedCareerJournalHtml(page);

}

export async function rebuildAllCareerJournalCaches() {

  careerJournalCache.clear();

  if (!game.journal?.size) return;

  for (const journal of game.journal) {

    for (const page of journal.pages) {

      if (isCareerJournalPage(page)) {
        await refreshCareerJournalCache(page);
      }

    }

  }

}

export function injectCareerJournalPage(app, element) {

  const page =
    app.page
    ?? app.document;

  if (!isCareerJournalPage(page)) return;

  const html =
    getCachedCareerJournalHtml(page);

  if (!html) {

    refreshCareerJournalCache(page).then(() => {

      if (app.rendered) {
        app.render(true);
      }

    });

    return;

  }

  const root =
    element instanceof HTMLElement
      ? element
      : element?.[0];

  if (!root) return;

  const content =
    root.querySelector(".journal-entry-page .journal-entry-content")
    ?? root.querySelector(".journal-entry-page-content")
    ?? root.querySelector(".journal-page-content")
    ?? root.querySelector("article.journal-entry-page .content");

  if (
    !content
    || content.classList.contains("ProseMirror")
    || content.closest(".ProseMirror")
  ) {
    return;
  }

  content.innerHTML = html;

}

export function registerCareerJournalHooks() {

  const hooks = [
    "renderJournalEntryPageTextSheet",
    "renderJournalEntryPageProseMirrorSheet",
    "renderJournalEntryPageSheet"
  ];

  for (const hookName of hooks) {

    Hooks.on(hookName, (app, element) => {

      injectCareerJournalPage(app, element);

    });

  }

  Hooks.on(
    "updateJournalEntryPage",
    (page) => {

      if (!isCareerJournalPage(page)) return;

      refreshCareerJournalCache(page).then(() => {
        page.sheet?.render?.(true);
      });

    }
  );

  Hooks.on(
    "createJournalEntryPage",
    (page) => {

      if (!isCareerJournalPage(page)) return;

      refreshCareerJournalCache(page);

    }
  );

}
