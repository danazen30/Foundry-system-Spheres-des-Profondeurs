import { SdpItemSheet } from "./item-sheet.js";
import { SkillSelectorApp } from "../apps/skill-selector.js";

export class SdpSpecieSheet extends SdpItemSheet {

  constructor(...args) {

    super(...args);

    this.activeTab = "description";

  }

  static PARTS = {
    sheet: {
      template:
        "systems/sdp/templates/items/specie-sheet.hbs"
    }
  };

  // =========================
  // CONTEXT
  // =========================

 async _prepareContext() {

    const context =
      await super._prepareContext();

   // =========================
// WORLD TABLES
// =========================

const worldTables =
  game.tables.map(table => ({

    id:
      table.id,

    name:
      `[World] ${table.name}`

  }));

// =========================
// COMPENDIUM TABLES
// =========================

const compendiumTables = [];

for (const pack of game.packs) {

  if (
    pack.documentName !==
    "RollTable"
  ) continue;

  const index =
    await pack.getIndex();

  for (const entry of index) {

    compendiumTables.push({

      id:
`Compendium.${pack.metadata.id}.RollTable.${entry._id}`,

      name:
`[${pack.metadata.label}] ${entry.name}`

    });

  }

}

// =========================
// MERGE
// =========================

context.tables = [

  ...worldTables,
  ...compendiumTables

];

    context.startingSkills =
  await this._resolveDocuments(
        this.document.system
          .startingSkills?.choices || [],
        game.i18n.localize(
  "SDP.UnknownSkill"
)
      );

    context.startingTalents =
  await this._resolveDocuments(
        this.document.system
          .startingTalents?.fixed || [],
        game.i18n.localize(
  "SDP.UnknownTalent"
)
      );

    context.choiceTalents =
  await Promise.all(

    (
      this._getTalentData().choices || []
    ).map(async group => ({

        count: group.count,

        options:
  await this._resolveDocuments(
            group.options || [],
            game.i18n.localize(
  "SDP.UnknownTalent"
)
          )

            }))

  );

  context.isCompendium =

  this.document.pack
  !==
  null;

    return context;

  }

  // =========================
  // RENDER
  // =========================

  _onRender(context, options) {

    super._onRender(
      context,
      options
    );

    const root =
      this.getRoot();

    root.querySelectorAll(
      "[data-action]"
    ).forEach(el => {

      el.addEventListener(
        "click",
        event => {

          const action =
            el.dataset.action;

          switch (action) {

            case "add-skill":
              this._addSkill();
              break;

            case "remove-skill":
              this._removeSkill(event);
              break;

            case "add-talent":
              this._addTalent();
              break;

            case "remove-talent":
              this._removeTalent(event);
              break;

            case "add-talent-choice":
              this._addTalentChoice();
              break;

            case "remove-talent-choice":
              this._removeTalentChoice(event);
              break;

            case "add-choice-option":
              this._addChoiceOption(event);
              break;

            case "remove-choice-option":
              this._removeChoiceOption(event);
              break;

          }

        }
      );

    });

    root.querySelectorAll(
      ".choice-count"
    ).forEach(input => {

      input.addEventListener(
        "change",
        async event => {

          const index =
            Number(
              event.target.dataset.index
            );

          const value =
            Number(
              event.target.value
            );

          const talents =
            this._getTalentData();

          if (!talents.choices[index]) {
            return;
          }

          talents.choices[index].count =
            value;

          await this._updateTalents(
            talents
          );

        }
      );

    });

    root.querySelector(
      ".random-table-select"
    )?.addEventListener(
      "change",
      async event => {

        const talents =
          this._getTalentData();

        talents.random.tableId =
          event.target.value;

        await this._updateTalents(
          talents
        );

      }
    );

    root.querySelector(
      ".random-count"
    )?.addEventListener(
      "change",
      async event => {

        const talents =
          this._getTalentData();

        talents.random.count =
          Number(
            event.target.value
          );

        await this._updateTalents(
          talents
        );

      }
    );

  }

  // =========================
  // HELPERS
  // =========================

async _resolveDocuments(
  ids,
  fallback
) {

  const cleaned =
    ids.filter(id =>

      typeof id === "string"
      &&
      id.length > 0

    );

  return await Promise.all(

    cleaned.map(async id => {

      let doc = null;

      // =========================
      // UUID COMPENDIUM
      // =========================

      if (
        id.startsWith(
          "Compendium."
        )
      ) {

        try {

          doc =
            await fromUuid(id);

        }

        catch(error) {

          console.error(
            "SDP | UUID ERROR",
            id,
            error
          );

        }

      }

      // =========================
      // WORLD ITEM
      // =========================

      else {

        doc =
          game.items.get(id);

      }

      console.log(
        "SDP DEBUG RESOLVE",
        id,
        doc
      );

      return {

        id,
        uuid: id,

        name:
          doc?.name || fallback

      };

    })

  );

}

  _getTalentData() {

    const base =
      this.document.system
        .startingTalents || {};

    return {

      fixed:
        Array.isArray(base.fixed)
          ? [...base.fixed]
          : [],

      choices:
        Array.isArray(base.choices)
          ? foundry.utils.deepClone(
              base.choices
            )
          : [],

      random:
        typeof base.random === "object"
          ? foundry.utils.deepClone(
              base.random
            )
          : {
              tableId: "",
              count: 1
            }

    };

  }

async _updateTalents(talents) {

  // =========================
  // COMPENDIUM DOCUMENT
  // =========================

  if (this.document.pack) {

    const pack =
      game.packs.get(
        this.document.pack
      );

    if (!pack) return;

    const doc =
      await pack.getDocument(
        this.document.id
      );

    if (!doc) return;

    await doc.update({

      "system.startingTalents":
        talents

    });

    // =========================
    // REFRESH LOCAL DOCUMENT
    // =========================

    this.document.system.startingTalents =
      foundry.utils.deepClone(
        talents
      );

    this.render();

    return;

  }

  // =========================
  // WORLD DOCUMENT
  // =========================

  await this.document.update({

    "system.startingTalents":
      talents

  });

}

async _openSelector(
  type,
  callback
) {

  // =========================
  // WORLD ITEMS
  // =========================

  const worldItems =
    game.items
      .filter(i => i.type === type)
      .map(i => ({

        id: i.id,
        name: i.name

      }));

  // =========================
  // COMPENDIUM ITEMS
  // =========================

  const compendiumItems = [];

  for (const pack of game.packs) {

    if (
      pack.documentName !== "Item"
    ) continue;

    const docs =
      await pack.getDocuments();

    const filtered =
      docs
        .filter(doc =>
          doc.type === type
        )
        .map(doc => ({

          id: doc.uuid,
          name: doc.name

        }));

    compendiumItems.push(
      ...filtered
    );

  }

  // =========================
  // MERGE
  // =========================

  const items = [

    ...worldItems,
    ...compendiumItems

  ];

  // =========================
  // OPEN APP
  // =========================

  const app =
    new SkillSelectorApp({

      skills: items,
      callback

    });

  app.render(true);

}

  // =========================
  // SKILLS
  // =========================

 async _addSkill() {

  await this._openSelector(
    "skill",
    async skillId => {

      let startingSkills =
        foundry.utils.deepClone(

          this.document.system
            .startingSkills

          || {}

        );

      // =========================
      // INIT
      // =========================

      if (!startingSkills.choices) {

        startingSkills = {

          choices: [],

          groups: [
            {
              count: 3,
              value: 3
            },
            {
              count: 3,
              value: 5
            }
          ]

        };

      }

      // =========================
      // PUSH
      // =========================

      startingSkills.choices.push(
        skillId
      );

      // =========================
      // COMPENDIUM
      // =========================

      if (this.document.pack) {

        const pack =
          game.packs.get(
            this.document.pack
          );

        const doc =
          await pack.getDocument(
            this.document.id
          );

        await doc.update({

          "system.startingSkills":
            startingSkills

        });

        this.document.system.startingSkills =
          foundry.utils.deepClone(
            startingSkills
          );

        this.render();

        return;

      }

      // =========================
      // WORLD
      // =========================

      await this.document.update({

        "system.startingSkills":
          startingSkills

      });

    }
  );

}

async _removeSkill(event) {

  const skillId =
    event.currentTarget.dataset.skill;

  let startingSkills =
    foundry.utils.deepClone(

      this.document.system
        .startingSkills

      || {}

    );

  // =========================
  // FILTER
  // =========================

  startingSkills.choices =
    (startingSkills.choices || [])
      .filter(id =>

        id !== skillId

      );

  // =========================
  // COMPENDIUM
  // =========================

  if (this.document.pack) {

    const pack =
      game.packs.get(
        this.document.pack
      );

    if (!pack) return;

    const doc =
      await pack.getDocument(
        this.document.id
      );

    if (!doc) return;

    await doc.update({

      "system.startingSkills":
        startingSkills

    });

    // =========================
    // REFRESH LOCAL
    // =========================

    this.document.system.startingSkills =
      foundry.utils.deepClone(
        startingSkills
      );

    this.render();

    return;

  }

  // =========================
  // WORLD
  // =========================

  await this.document.update({

    "system.startingSkills":
      startingSkills

  });

}
  // =========================
  // FIXED TALENTS
  // =========================

  async _addTalent() {

    await this._openSelector(
      "talent",
      async talentId => {

        const talents =
          this._getTalentData();

        talents.fixed.push(
          talentId
        );

        await this._updateTalents(
          talents
        );

      }
    );

  }

  async _removeTalent(event) {

    const id =
      event.currentTarget.dataset.id;

    const talents =
      this._getTalentData();

    talents.fixed =
      talents.fixed.filter(
        t => t !== id
      );

    await this._updateTalents(
      talents
    );

  }

  // =========================
  // TALENT CHOICES
  // =========================

  async _addTalentChoice() {

    const talents =
      this._getTalentData();

    talents.choices.push({
      count: 1,
      options: []
    });

    await this._updateTalents(
      talents
    );

  }

  async _removeTalentChoice(event) {

    const index =
      Number(
        event.currentTarget.dataset.index
      );

    const talents =
      this._getTalentData();

    if (
      Number.isNaN(index) ||
      !talents.choices[index]
    ) {
      return;
    }

    talents.choices.splice(
      index,
      1
    );

    await this._updateTalents(
      talents
    );

  }

  async _addChoiceOption(event) {

    const index =
      Number(
        event.currentTarget.dataset.index
      );

    await this._openSelector(
      "talent",
      async talentId => {

        const talents =
          this._getTalentData();

        if (
          !talents.choices[index]
        ) {

          talents.choices[index] = {
            count: 1,
            options: []
          };

        }

        talents.choices[index]
          .options.push(
            talentId
          );

        await this._updateTalents(
          talents
        );

      }
    );

  }

  async _removeChoiceOption(event) {

    const index =
      Number(
        event.currentTarget.dataset.index
      );

    const id =
      event.currentTarget.dataset.id;

    const talents =
      this._getTalentData();

    const group =
      talents.choices[index];

    if (!group) return;

    group.options =
      (group.options || [])
        .filter(t => t !== id);

    await this._updateTalents(
      talents
    );

  }

}