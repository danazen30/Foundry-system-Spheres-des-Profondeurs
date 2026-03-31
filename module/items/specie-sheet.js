import { SdpItemSheet } from "./item-sheet.js";
import { SkillSelectorApp } from "../apps/skill-selector.js";

export class SdpSpecieSheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template: "systems/sdp/templates/items/specie-sheet.hbs"
    }
  };

  async _prepareContext() {

    const choices = this.document.system.startingSkills?.choices || [];

    const tables = game.tables.map(t => ({
      id: t.id,
      name: t.name
    }));

    const skills = choices.map(id => {
      const skill = game.items.get(id);
      return {
        id,
        name: skill?.name || "Unknown Skill"
      };
    });

    const talentIds = this.document.system.startingTalents?.fixed || [];

    const talents = talentIds.map(id => {
      const talent = game.items.get(id);
      return {
        id,
        name: talent?.name || "Unknown Talent"
      };
    });

    const choiceTalents = (this.document.system.startingTalents?.choices || []).map(group => {

      const options = (group.options || []).map(id => {
        const talent = game.items.get(id);
        return {
          id,
          name: talent?.name || "Unknown Talent"
        };
      });

      return {
        count: group.count,
        options
      };

    });

    return {
      item: this.document,
      system: this.document.system,
      effects: this.document.effects,
      startingSkills: skills,
      startingTalents: talents,
      choiceTalents,
      tables
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const root = this.element;

    // =========================
    // BUTTON HANDLERS
    // =========================

    root.querySelectorAll("[data-action]").forEach(el => {

      el.addEventListener("click", (event) => {

        const action = el.dataset.action;

        switch (action) {

          case "create-effect": this._createEffect(); break;
          case "edit-effect": this._editEffect(event); break;
          case "delete-effect": this._deleteEffect(event); break;

          case "add-skill": this._addSkill(); break;
          case "remove-skill": this._removeSkill(event); break;

          case "add-talent": this._addTalent(); break;
          case "remove-talent": this._removeTalent(event); break;

          case "add-talent-choice": this._addTalentChoice(); break;
          case "add-choice-option": this._addChoiceOption(event); break;
          case "remove-choice-option": this._removeChoiceOption(event); break;

        }

      });

    });

    // =========================
    // CHOICE COUNT
    // =========================

    root.querySelectorAll(".choice-count").forEach(input => {

      input.addEventListener("change", async (event) => {

        const index = Number(event.target.dataset.index);
        const value = Number(event.target.value);

        const base = this.document.system.startingTalents || {};

        const talents = {
          fixed: Array.isArray(base.fixed) ? base.fixed : [],
          choices: Array.isArray(base.choices) ? base.choices : [],
          random: typeof base.random === "object" ? base.random : { tableId: "", count: 1 }
        };

        const choices = [...talents.choices];

        if (!choices[index]) return;

        choices[index].count = value;

        await this.document.update({
          "system.startingTalents": {
            ...talents,
            choices
          }
        });

      });

    });

    // =========================
    // RANDOM TABLE
    // =========================

    root.querySelector(".random-table-select")?.addEventListener("change", async (e) => {

      const tableId = e.target.value;

      const base = this.document.system.startingTalents || {};

      const talents = {
        fixed: Array.isArray(base.fixed) ? base.fixed : [],
        choices: Array.isArray(base.choices) ? base.choices : [],
        random: typeof base.random === "object" ? base.random : { tableId: "", count: 1 }
      };

      await this.document.update({
        "system.startingTalents": {
          ...talents,
          random: {
            ...talents.random,
            tableId
          }
        }
      });

    });

    // =========================
    // RANDOM COUNT
    // =========================

    root.querySelector(".random-count")?.addEventListener("change", async (e) => {

      const count = Number(e.target.value);

      const base = this.document.system.startingTalents || {};

      const talents = {
        fixed: Array.isArray(base.fixed) ? base.fixed : [],
        choices: Array.isArray(base.choices) ? base.choices : [],
        random: typeof base.random === "object" ? base.random : { tableId: "", count: 1 }
      };

      await this.document.update({
        "system.startingTalents": {
          ...talents,
          random: {
            ...talents.random,
            count
          }
        }
      });

    });

  }

  // =========================
  // SKILLS
  // =========================

  async _addSkill() {

    const skills = game.items
      .filter(i => i.type === "skill")
      .map(s => ({ id: s.id, name: s.name }));

    const app = new SkillSelectorApp({
      skills,
      callback: async (skillId) => {

        if (!this.document.system.startingSkills) {
          await this.document.update({
            "system.startingSkills": {
              choices: [],
              groups: [
                { count: 3, value: 3 },
                { count: 3, value: 5 }
              ]
            }
          });
        }

        const current = this.document.system.startingSkills?.choices || [];

        await this.document.update({
          "system.startingSkills.choices": [...current, skillId]
        });

      }
    });

    app.render(true);
  }

  async _removeSkill(event) {

    const skillId = event.currentTarget.dataset.skill;
    const current = this.document.system.startingSkills.choices || [];

    await this.document.update({
      "system.startingSkills.choices": current.filter(id => id !== skillId)
    });

  }

  // =========================
  // TALENTS FIXED
  // =========================

  async _addTalent() {

    const talents = game.items
      .filter(i => i.type === "talent")
      .map(t => ({ id: t.id, name: t.name }));

    const app = new SkillSelectorApp({
      skills: talents,
      callback: async (talentId) => {

        if (!this.document.system.startingTalents) {
          await this.document.update({
            "system.startingTalents": {
              fixed: [],
              choices: [],
              random: { tableId: "", count: 1 }
            }
          });
        }

        const current = this.document.system.startingTalents.fixed || [];

        await this.document.update({
          "system.startingTalents.fixed": [...current, talentId]
        });

      }
    });

    app.render(true);
  }

  async _removeTalent(event) {

    const id = event.currentTarget.dataset.id;
    const current = this.document.system.startingTalents.fixed || [];

    await this.document.update({
      "system.startingTalents.fixed": current.filter(t => t !== id)
    });

  }

  // =========================
  // TALENT CHOICES
  // =========================

  async _addTalentChoice() {

    const base = this.document.system.startingTalents || {};

    const talents = {
      fixed: Array.isArray(base.fixed) ? base.fixed : [],
      choices: Array.isArray(base.choices) ? base.choices : [],
      random: typeof base.random === "object" ? base.random : { tableId: "", count: 1 }
    };

    const choices = [...talents.choices, { count: 1, options: [] }];

    await this.document.update({
      "system.startingTalents": {
        ...talents,
        choices
      }
    });

  }

  async _addChoiceOption(event) {

    const index = Number(event.currentTarget.dataset.index);

    const talentsList = game.items
      .filter(i => i.type === "talent")
      .map(t => ({ id: t.id, name: t.name }));

    const app = new SkillSelectorApp({
      skills: talentsList,
      callback: async (talentId) => {

        const base = this.document.system.startingTalents || {};

        const talents = {
          fixed: Array.isArray(base.fixed) ? base.fixed : [],
          choices: Array.isArray(base.choices) ? base.choices : [],
          random: typeof base.random === "object" ? base.random : { tableId: "", count: 1 }
        };

        const choices = [...talents.choices];
        const group = choices[index] || { count: 1, options: [] };

        const options = Array.isArray(group.options) ? [...group.options] : [];

        group.options = [...options, talentId];
        choices[index] = group;

        await this.document.update({
          "system.startingTalents": {
            ...talents,
            choices
          }
        });

      }
    });

    app.render(true);
  }

  async _removeChoiceOption(event) {

    const index = Number(event.currentTarget.dataset.index);
    const id = event.currentTarget.dataset.id;

    const base = this.document.system.startingTalents || {};

    const talents = {
      fixed: Array.isArray(base.fixed) ? base.fixed : [],
      choices: Array.isArray(base.choices) ? base.choices : [],
      random: typeof base.random === "object" ? base.random : { tableId: "", count: 1 }
    };

    const choices = [...talents.choices];
    const group = choices[index];

    if (!group) return;

    const options = Array.isArray(group.options) ? [...group.options] : [];

    group.options = options.filter(t => t !== id);
    choices[index] = group;

    await this.document.update({
      "system.startingTalents": {
        ...talents,
        choices
      }
    });

  }

}