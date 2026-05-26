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

    context.tables =
      game.tables.map(t => ({
        id: t.id,
        name: t.name
      }));

    context.startingSkills =
      this._resolveDocuments(
        this.document.system
          .startingSkills?.choices || [],
        game.i18n.localize(
  "SDP.UnknownSkill"
)
      );

    context.startingTalents =
      this._resolveDocuments(
        this.document.system
          .startingTalents?.fixed || [],
        game.i18n.localize(
  "SDP.UnknownTalent"
)
      );

    context.choiceTalents =
      (
        this._getTalentData().choices || []
      ).map(group => ({

        count: group.count,

        options:
          this._resolveDocuments(
            group.options || [],
            game.i18n.localize(
  "SDP.UnknownTalent"
)
          )

      }));

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

  _resolveDocuments(ids, fallback) {

    return ids.map(id => {

      const doc =
        game.items.get(id);

      return {
        id,
        name:
          doc?.name || fallback
      };

    });

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

    await this.document.update({
      "system.startingTalents":
        talents
    });

  }

  async _openSelector(type, callback) {

    const items =
      game.items
        .filter(i => i.type === type)
        .map(i => ({
          id: i.id,
          name: i.name
        }));

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

        if (
          !this.document.system
            .startingSkills
        ) {

          await this.document.update({
            "system.startingSkills": {
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
            }
          });

        }

        const current =
          this.document.system
            .startingSkills?.choices || [];

        await this.document.update({
          "system.startingSkills.choices": [
            ...current,
            skillId
          ]
        });

      }
    );

  }

  async _removeSkill(event) {

    const skillId =
      event.currentTarget.dataset.skill;

    const current =
      this.document.system
        .startingSkills?.choices || [];

    await this.document.update({
      "system.startingSkills.choices":
        current.filter(
          id => id !== skillId
        )
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