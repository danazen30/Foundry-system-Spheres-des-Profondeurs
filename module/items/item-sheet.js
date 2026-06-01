import { ITEM_TRAITS, ARMOR_TRAITS} from "../system/config.js";
import { formatPlainTextAsHtml } from "../system/text-format.js";
import { getLocalizedItemDescription } from "../system/item-localization.js";
import { restoreItemScroll, registerEditorToggles, setupRichTextEditors, setupTextareaResize} from "../actors/actor-sheet-ui.js";

const { ItemSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class SdpItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  constructor(...args) {

  super(...args);

  this.activeTab = "description";

  this._scrollPositions = {};

  this._isRestoringScroll = false;

}

getRoot() {

  return this.element?.querySelector?.(".window-content")
    || this.element;

}

static DEFAULT_OPTIONS = {
 classes: ["sdp", "sheet", "item"],
position: { width: 450, height: 500 },
window: { resizable: true },
form: { submitOnChange: true }
};

static LAYOUT = {
 template: "templates/applications/sheet.hbs",
 parts: ["sheet"]
 };

get title() {

  const itemType =
    this.document.type.charAt(0).toUpperCase()
    + this.document.type.slice(1);

 const key =
  this.document.system.key?.trim?.() ?? "";

  if (!key) {
    return this.document.name;
  }

  const translationKey =
    `SDP.Item.${itemType}.${key}.Name`;

  return game.i18n.has(translationKey)
    ? game.i18n.localize(translationKey)
    : this.document.name;

}

async _prepareContext() {

  const traitsArray = this.document.system.itemTraits ?? [];
  const armorTraitsArray =
  this.document.system.armorTraits ?? [];

const mapTraits = (
  source,
  traits,
  type
) => {

  return Object.entries(source)

    .filter(([_, v]) => v.type === type)

    .map(([key, value]) => {

      const existing = traits.find(t => {

        if (!t) return false;

        if (typeof t === "string") {
          return t === key;
        }

        return t.key === key;

      });

      return {

        key,

        label:
          game.i18n.localize(
            value.label
          ),

        description:
          game.i18n.localize(
            value.description
          ),

        hasValue:
          value.hasValue,

        checked:
          !!existing,

        value:
          existing?.value || ""

      };

    });

};

const positiveItemTraits =
  mapTraits(
    ITEM_TRAITS,
    traitsArray,
    "positive"
  );

const negativeItemTraits =
  mapTraits(
    ITEM_TRAITS,
    traitsArray,
    "negative"
  );

const positiveArmorTraits =
  mapTraits(
    ARMOR_TRAITS,
    armorTraitsArray,
    "positive"
  );

const negativeArmorTraits =
  mapTraits(
    ARMOR_TRAITS,
    armorTraitsArray,
    "negative"
  );

      // =========================
// EDITORS
// =========================

const itemType =
  this.document.type.charAt(0).toUpperCase()
  + this.document.type.slice(1);

const itemKey =
  this.document.system.key?.trim?.() ?? "";

const nameKey =
  `SDP.Item.${itemType}.${itemKey}.Name`;

const localizedName =
  itemKey && game.i18n.has(nameKey)
    ? game.i18n.localize(nameKey)
    : this.document.name;

const localizedDescription =
  itemKey
    ? formatPlainTextAsHtml(
        getLocalizedItemDescription(
          this.document.type,
          itemKey
        )
      )
    : "";

const customDescription =
  this.document.system.description ?? "";

let description = "";

if (localizedDescription && customDescription) {

  description =
    `${localizedDescription}<hr>${customDescription}`;

}
else if (localizedDescription) {

  description =
    localizedDescription;

}
else {

  description =
    customDescription;

}

const playerNotes =
  this.document.system.playerNotes ?? "";

const gmNotes =
  this.document.system.gmNotes ?? "";

const editors = {


  description:
  await foundry.applications.ux.TextEditor
    .enrichHTML(description, {
      async: true
    }),

  playerNotes:
    await foundry.applications.ux.TextEditor
      .enrichHTML(playerNotes, {
        async: true
      }),

  gmNotes:
    await foundry.applications.ux.TextEditor
      .enrichHTML(gmNotes, {
        async: true
      })
};

  return {
  item: {
  ...this.document,
  displayName: localizedName
},
  system: this.document.system,
  positiveItemTraits,
  negativeItemTraits,
  positiveArmorTraits,
negativeArmorTraits,
  activeTab: this.activeTab,
  editors,
  effects: this.document.effects,
  isGM: game.user.isGM
};

}

_onRender(context, options) {

  super._onRender(context, options);

  const root = this.getRoot();

 const scrollEl =
  root?.querySelector(".sdp-content")
  || root?.querySelector(".window-content")
  || root?.querySelector(".sheet-body")
  || root?.querySelector(".tab")
  || root?.querySelector('[data-application-part="sheet"]');

if (scrollEl && !scrollEl.dataset.scrollRegistered) {

  scrollEl.dataset.scrollRegistered = "true";

  scrollEl.addEventListener("scroll", () => {

    if (this._isRestoringScroll) {
      return;
    }

    this._scrollPositions.main =
      scrollEl.scrollTop;

  });

}

  const oldScroll =
  this._scrollPositions.main;

  const img =
    root.querySelector(".item-header-image img");

  if (img) {

    img.addEventListener("click", () => {

      new foundry.applications.apps.FilePicker.implementation({

        type: "image",

        current: this.document.img,

        callback: async (path) => {

          await this.document.update({
            img: path
          });

        }

      }).render(true);

    });

  }

  this._registerTabs(root);

  registerEditorToggles(root);

  setupRichTextEditors(root);

  setupTextareaResize(root);

  root.querySelectorAll("[data-action]").forEach(el => {

  el.addEventListener("click", (event) => {

    const action =
      el.dataset.action;

    switch (action) {

      case "create-effect":
        this._createEffect();
        break;

      case "edit-effect":
        this._editEffect(event);
        break;

      case "delete-effect":
        this._deleteEffect(event);
        break;

    }

  });

});

  this._isRestoringScroll = true;

requestAnimationFrame(() => {

  restoreItemScroll(this);

  requestAnimationFrame(() => {

    this._isRestoringScroll = false;

  });

});

}
_registerTabs(root) {

  root.querySelectorAll("[data-tab]").forEach(btn => {

    if (btn.dataset.tab === this.activeTab) {
      btn.classList.add("active");
    }
    else {
      btn.classList.remove("active");
    }

    btn.addEventListener("click", () => {

      this.activeTab = btn.dataset.tab;

      this.render();

    });

  });

}

async _createEffect() {

  await this.document.createEmbeddedDocuments(
    "ActiveEffect",
    [{
      name: game.i18n.localize("SDP.NewEffect"),
      icon: "icons/svg/aura.svg",
      changes: []
    }]
  );

}

async _editEffect(event) {

  const li =
    event.target.closest(".effect");

  if (!li) return;

  const effect =
    this.document.effects.get(
      li.dataset.effectId
    );

  if (effect) {
    effect.sheet.render(true);
  }

}

async _deleteEffect(event) {

  const li =
    event.target.closest(".effect");

  if (!li) return;

  const effect =
    this.document.effects.get(
      li.dataset.effectId
    );

  if (effect) {
    await effect.delete();
  }

}

async _onChangeForm(formConfig, event) {

  await super._onChangeForm(
    formConfig,
    event
  );

  const root = this.getRoot();

  const proseMirrors =
    root.querySelectorAll("prose-mirror");

  const updates = {};

  proseMirrors.forEach(editor => {

    const name =
      editor.getAttribute("name");

    if (!name) return;

    updates[name] =
      editor.value || "";

  });

  if (
    Object.keys(updates).length > 0
  ) {

    await this.document.update(
      updates
    );

  }

}



}
