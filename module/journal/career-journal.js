/**
 * Pages journal « carrière SDP » : contenu généré et traduit automatiquement.
 *
 * Configuration d'une page (onglet Détails → flags) :
 *   flags.sdp.type  = "career"
 *   flags.sdp.key   = "merchant"         → clés SDP.Journal.Career.merchant.*
 *   flags.sdp.tiers = ["trader", ...]    → clés d'items carrière (compendium), dans l'ordre
 *   flags.sdp.view  = "intro" | "tiers" | "full" (défaut : full)
 *
 *   intro → titre, épigraphes, description, espèces, classe, tableau de progression
 *   tiers → paliers I, II, III… uniquement
 *
 * Le corps HTML de la page peut rester vide : tout est rendu par le système.
 */

import {
  findCompendiumItemByRef,
  formatLocalizedKeyList,
  formatLocalizedTrappings,
  getLocalizedItemName,
  localizeCareerGroupRef,
  localizeItemDirectory,
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

const CAREER_CHARACTERISTICS = [
  "meleeAbility",
  "rangedAbility",
  "strength",
  "toughness",
  "initiative",
  "agility",
  "dexterity",
  "intelligence",
  "willpower",
  "charisma"
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

export function isCareerJournal(entry) {

  if (!entry) return false;

  if (
    entry.getFlag?.("sdp", "type") === "career"
    || entry.flags?.sdp?.type === "career"
  ) {
    return true;
  }

  return entry.pages?.some?.(page =>
    isCareerJournalPage(page)
  ) ?? false;

}

export function getCareerJournalEntryTitle() {

  return game.i18n.localize("SDP.Journal.Career.EntryName");

}

export function getLocalizedCareerPageDisplayName(page) {

  if (!isCareerJournalPage(page)) return "";

  const journalKey = getCareerJournalKey(page);
  const groupRef =
    localizeJournalField(journalKey, "CareerGroup");

  return groupRef
    ? localizeCareerGroupRef(groupRef)
    : "";

}

export async function syncCareerJournalDisplayNames(entry) {

  if (!isCareerJournal(entry)) return entry;

  const entryTitle = getCareerJournalEntryTitle();

  if (entryTitle && entry.name !== entryTitle) {
    await entry.update({ name: entryTitle });
  }

  for (const page of entry.pages) {

    if (!isCareerJournalPage(page)) continue;

    const pageName =
      getLocalizedCareerPageDisplayName(page);

    if (pageName && page.name !== pageName) {
      await page.update({ name: pageName });
    }

  }

  return entry;

}

export async function refreshAllCareerJournalDisplayNames() {

  if (!game.journal?.size) return;

  for (const entry of game.journal) {

    if (isCareerJournal(entry)) {
      await syncCareerJournalDisplayNames(entry);
    }

  }

  ui.sidebar?.tabs?.journal?.render?.(true);

  for (const app of Object.values(ui.windows)) {

    if (app.document?.documentName === "JournalEntry") {
      app.render(true);
    }

  }

}

function localizeCareerJournalDirectory(element) {

  localizeItemDirectory(element, (row) => {

    const id =
      row.dataset.documentId
      ?? row.dataset.entryId;

    if (!id) return null;

    const journalEntry = game.journal.get(id);

    if (!journalEntry || !isCareerJournal(journalEntry)) {
      return null;
    }

    return getCareerJournalEntryTitle();

  });

  for (const entry of game.journal) {

    if (!isCareerJournal(entry)) continue;

    for (const page of entry.pages) {

      if (!isCareerJournalPage(page)) continue;

      const pageName =
        getLocalizedCareerPageDisplayName(page);

      if (!pageName) continue;

      element.querySelectorAll(
        `[data-page-id="${page.id}"] .page-name,`
        + `[data-page-id="${page.id}"] .document-name,`
        + `li[data-page-id="${page.id}"] .name`
      ).forEach(label => {
        label.textContent = pageName;
      });

    }

  }

}

function localizeCareerJournalSheet(app, element) {

  const entry = app.document;

  if (!isCareerJournal(entry)) return;

  const root =
    element instanceof HTMLElement
      ? element
      : element?.[0];

  if (!root) return;

  const entryTitle = getCareerJournalEntryTitle();

  if (entryTitle) {

    if (app.window?.title !== undefined) {
      app.window.title = entryTitle;
    }

    const windowTitle =
      root.closest?.(".application")
        ?.querySelector?.(".window-title")
      ?? root.querySelector?.(".window-title");

    if (windowTitle) {
      windowTitle.textContent = entryTitle;
    }

    root.querySelectorAll(
      ".journal-header h1, "
      + ".journal-header .journal-entry-name, "
      + ".journal-entry-header h1, "
      + ".journal-sheet-header h1, "
      + ".journal-sheet-header .name, "
      + "header.sheet-header h1, "
      + ".sheet-header .document-name, "
      + ".journal-entry-title"
    ).forEach(label => {
      label.textContent = entryTitle;
    });

  }

  for (const page of entry.pages) {

    if (!isCareerJournalPage(page)) continue;

    const pageName =
      getLocalizedCareerPageDisplayName(page);

    if (!pageName) continue;

    root.querySelectorAll(
      `[data-page-id="${page.id}"] .page-name,`
      + `[data-page-id="${page.id}"] .page-title,`
      + `[data-page-id="${page.id}"] .name,`
      + `[data-page-id="${page.id}"] .document-name,`
      + `li[data-page-id="${page.id}"]`
    ).forEach(label => {

      if (label.matches("li[data-page-id]")) {

        const nameEl =
          label.querySelector(
            ".page-name, .page-title, .name, .document-name"
          )
          ?? label;

        nameEl.textContent = pageName;

        return;

      }

      label.textContent = pageName;

    });

  }

  const activePage =
    entry.pages.get(
      root.querySelector("[data-page-id].active")?.dataset?.pageId
      ?? app._currentPageId
    );

  if (activePage && isCareerJournalPage(activePage)) {

    const pageName =
      getLocalizedCareerPageDisplayName(activePage);

    if (pageName) {

      root.querySelectorAll(
        ".journal-page-header h1, "
        + ".journal-page-header .page-title, "
        + ".journal-header .page-title, "
        + ".journal-header h1.page-title, "
        + ".journal-page-title, "
        + "h1.page-heading"
      ).forEach(label => {
        label.textContent = pageName;
      });

    }

  }

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

function getCareerPageView(page) {

  const view =
    page.getFlag?.("sdp", "view")
    ?? page.flags?.sdp?.view;

  if (view === "intro" || view === "tiers") {
    return view;
  }

  return "full";

}

async function getPrimaryCareerItem(tierKeys) {

  for (const tierKey of tierKeys) {

    const careerItem =
      await findCompendiumItemByRef(
        CAREER_PACK,
        "career",
        tierKey
      );

    if (careerItem) return careerItem;

  }

  return null;

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

async function buildItemLinkInlineHtml(type, value, packId) {

  const keys = parseKeyList(value);

  if (!keys.length) return "";

  const items = await Promise.all(
    keys.map(key =>
      buildItemUuidLink(type, key, packId)
    )
  );

  return `<span class="sdp-career-link-list">${items.join("")}</span>`;

}

function getCharacteristicAbbr(key) {

  const translationKey =
    `SDP.AttributeAbbr.${key.charAt(0).toUpperCase()}${key.slice(1)}`;

  return game.i18n.has(translationKey)
    ? game.i18n.localize(translationKey)
    : key;

}

function buildProgressionTable(tierCharacteristicKeys) {

  if (!tierCharacteristicKeys.length) return null;

  const hasAny = tierCharacteristicKeys.some(
    keys => keys.length
  );

  if (!hasAny) return null;

  return {
    columns: CAREER_CHARACTERISTICS.map(key => ({
      key,
      abbr: getCharacteristicAbbr(key)
    })),
    rows: tierCharacteristicKeys.map((characteristicKeys, tierIndex) => ({
      roman: TIER_ROMAN[tierIndex] ?? String(tierIndex + 1),
      cells: CAREER_CHARACTERISTICS.map(charKey =>
        characteristicKeys.includes(charKey)
          ? (TIER_ROMAN[tierIndex] ?? String(tierIndex + 1))
          : ""
      )
    }))
  };

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
    await buildItemLinkInlineHtml(
      "skill",
      system.skills,
      SKILLS_PACK
    );

  const talentsHtml =
    await buildItemLinkInlineHtml(
      "talent",
      system.talents,
      TALENTS_PACK
    );

  const workSkillHtml =
    await buildItemLinkInlineHtml(
      "skill",
      system.workSkill,
      SKILLS_PACK
    );

  return {
    heading: `${roman}. ${name}`,
    standing: localizeStanding(system.standing),
    skillsHtml,
    talentsHtml,
    workSkillHtml,
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
  const view = getCareerPageView(page);
  const showIntro = view === "full" || view === "intro";
  const showTiers = view === "full" || view === "tiers";

  const tiers = [];
  const tierCharacteristicKeys = [];

  for (const tierKey of tierKeys) {

    const careerItem =
      await findCompendiumItemByRef(
        CAREER_PACK,
        "career",
        tierKey
      );

    if (!careerItem) continue;

    if (showIntro) {
      tierCharacteristicKeys.push(
        parseKeyList(careerItem.system?.characteristics)
      );
    }

    if (showTiers) {
      tiers.push(
        await prepareTierContext(
          careerItem,
          tiers.length
        )
      );
    }

  }

  const progressionTable =
    showIntro
      ? buildProgressionTable(tierCharacteristicKeys)
      : null;

  const title =
    localizeJournalField(journalKey, "Title")
    || getLocalizedItemName(
      "career",
      journalKey,
      journalKey
    );

  const primaryCareer =
    await getPrimaryCareerItem(tierKeys);

  const speciesFromItem =
    primaryCareer?.system?.species;

  const speciesFromLang =
    localizeJournalField(journalKey, "Species");

  const speciesSource =
    speciesFromItem || speciesFromLang;

  const species =
    speciesSource
      ? formatLocalizedKeyList(
          speciesSource,
          { type: "specie" }
        )
      : "";

  const groupFromItem =
    primaryCareer?.system?.careerGroup;

  const groupFromLang =
    localizeJournalField(journalKey, "CareerGroup");

  const groupKey =
    groupFromItem || groupFromLang;

  const group =
    groupKey
      ? localizeCareerGroupRef(groupKey)
      : "";

  return {
    journalKey,
    view,
    showIntro,
    showTiers,
    title,
    epigraph1: showIntro
      ? localizeJournalField(journalKey, "Epigraph1")
      : "",
    epigraph2: showIntro
      ? localizeJournalField(journalKey, "Epigraph2")
      : "",
    intro: showIntro
      ? formatIntro(
          localizeJournalField(journalKey, "Intro")
        )
      : "",
    species: showIntro ? species : "",
    group: showIntro ? group : "",
    progressionTable,
    tiers,
    missingTiers: showTiers && !tiers.length
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

function resolveJournalPageFromApp(app) {

  const directPage =
    app.page
    ?? (app.document?.documentName === "JournalEntryPage"
      ? app.document
      : null);

  if (directPage) return directPage;

  const journal =
    app.document?.documentName === "JournalEntry"
      ? app.document
      : app.document?.parent?.documentName === "JournalEntry"
        ? app.document.parent
        : null;

  if (!journal?.pages?.size) return null;

  const root =
    app.element instanceof HTMLElement
      ? app.element
      : app.element?.[0];

  const pageId =
    root?.querySelector?.("[data-page-id]")?.dataset?.pageId
    ?? root?.querySelector?.(".journal-entry-page.active")?.dataset?.pageId
    ?? app._currentPageId
    ?? app.viewedPage?.id;

  if (pageId) {
    return journal.pages.get(pageId) ?? null;
  }

  return journal.pages.contents.find(page =>
    isCareerJournalPage(page)
  ) ?? null;

}

function findJournalPageContent(root, page) {

  if (!root) return null;

  const byPageId =
    page?.id
      ? root.querySelector(`[data-page-id="${page.id}"] .editor-content`)
        ?? root.querySelector(`[data-page-id="${page.id}"] .journal-entry-content`)
        ?? root.querySelector(`[data-page-id="${page.id}"] .journal-page-content`)
      : null;

  if (byPageId) return byPageId;

  return root.querySelector(".journal-entry-page .journal-entry-content")
    ?? root.querySelector(".journal-entry-page-content")
    ?? root.querySelector(".journal-page-content")
    ?? root.querySelector("article.journal-entry-page .content")
    ?? root.querySelector(".journal-sheet .journal-body .editor-content")
    ?? root.querySelector(".journal-entry-pages .editor-content");

}

function applyCareerJournalHtml(content, html) {

  if (
    !content
    || !html
    || content.classList.contains("ProseMirror")
    || content.closest(".ProseMirror")
  ) {
    return false;
  }

  content.innerHTML = html;
  content.classList.add("sdp-career-journal-host");

  return true;

}

function scheduleCareerJournalInjection(app, element, page) {

  if (!isCareerJournalPage(page)) return;

  const inject = () => {

    const root =
      element instanceof HTMLElement
        ? element
        : element?.[0];

    const html =
      getCachedCareerJournalHtml(page);

    if (!html) {

      refreshCareerJournalCache(page).then(() => {

        if (app.rendered !== false) {
          scheduleCareerJournalInjection(app, element, page);
        }

      });

      return;

    }

    const content =
      findJournalPageContent(root, page);

    applyCareerJournalHtml(content, html);

  };

  requestAnimationFrame(() => {
    requestAnimationFrame(inject);
  });

}

export function injectCareerJournalPage(app, element) {

  const page =
    resolveJournalPageFromApp(app);

  if (!page) return;

  scheduleCareerJournalInjection(app, element, page);

}

/**
 * Crée un journal carrière SDP (contenu auto-généré).
 */
export async function createSdpCareerJournal({
  name = null,
  journalKey = "merchant",
  tiers = ["trader"],
  splitPages = false
} = {}) {

  const title =
    name
    ?? (game.i18n.has(`SDP.Journal.Career.${journalKey}.Title`)
      ? game.i18n.localize(`SDP.Journal.Career.${journalKey}.Title`)
      : journalKey);

  const tiersLabel =
    game.i18n.has("SDP.Journal.Career.TiersPageName")
      ? game.i18n.localize("SDP.Journal.Career.TiersPageName")
      : "Paliers";

  const baseFlags = {
    type: "career",
    key: journalKey,
    tiers
  };

  const pages = splitPages
    ? [
      {
        name: title,
        type: "text",
        text: { content: "", format: 1 },
        flags: {
          sdp: {
            ...baseFlags,
            view: "intro"
          }
        }
      },
      {
        name: `${title} — ${tiersLabel}`,
        type: "text",
        text: { content: "", format: 1 },
        flags: {
          sdp: {
            ...baseFlags,
            view: "tiers"
          }
        }
      }
    ]
    : [{
      name: title,
      type: "text",
      text: { content: "", format: 1 },
      flags: {
        sdp: {
          ...baseFlags,
          view: "full"
        }
      }
    }];

  const entry = await JournalEntry.create({
    name: getCareerJournalEntryTitle(),
    flags: {
      sdp: {
        type: "career",
        key: journalKey
      }
    },
    pages
  });

  await syncCareerJournalDisplayNames(entry);

  for (const page of entry.pages) {
    if (isCareerJournalPage(page)) {
      await refreshCareerJournalCache(page);
    }
  }

  entry.sheet.render(true);

  return entry;

}

/**
 * Configure une page journal carrière SDP existante.
 */
export async function configureCareerJournalPage(
  page,
  {
    journalKey = "merchant",
    tiers = ["trader"],
    view = "full"
  } = {}
) {

  if (!page) {
    throw new Error("configureCareerJournalPage: page introuvable");
  }

  await page.setFlag("sdp", "type", "career");
  await page.setFlag("sdp", "key", journalKey);
  await page.setFlag("sdp", "tiers", tiers);
  await page.setFlag("sdp", "view", view);

  await refreshCareerJournalCache(page);

  const entry = page.parent;

  if (entry) {
    await syncCareerJournalDisplayNames(entry);
  }

  const journalSheet =
    entry?.sheet ?? page.sheet;

  if (journalSheet?.rendered !== false) {
    journalSheet.render(true);
  }

  return page;

}

export function registerCareerJournalHooks() {

  const pageHooks = [
    "renderJournalEntryPageTextSheet",
    "renderJournalEntryPageProseMirrorSheet",
    "renderJournalEntryPageSheet"
  ];

  for (const hookName of pageHooks) {

    Hooks.on(hookName, (app, element) => {

      injectCareerJournalPage(app, element);

    });

  }

  Hooks.on(
    "renderJournalEntrySheet",
    (app, element) => {

      injectCareerJournalPage(app, element);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          localizeCareerJournalSheet(app, element);
        });
      });

    }
  );

  Hooks.on(
    "renderSidebarTab",
    (app, element) => {

      if (app.tabName !== "journal") return;

      const root =
        element instanceof HTMLElement
          ? element
          : element?.[0];

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          localizeCareerJournalDirectory(root);
        });
      });

    }
  );

  Hooks.on(
    "renderApplicationV2",
    (app, element) => {

      const docName =
        app.document?.documentName;

      if (
        docName === "JournalEntryPage"
        || docName === "JournalEntry"
      ) {
        injectCareerJournalPage(app, element);
      }

    }
  );

  Hooks.on(
    "updateJournalEntryPage",
    (page) => {

      if (!isCareerJournalPage(page)) return;

      refreshCareerJournalCache(page).then(() => {
        page.sheet?.render?.(true);
        page.parent?.sheet?.render?.(true);
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
