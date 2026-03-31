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

const skills = choices.map(id => {
  const skill = game.items.get(id);
  return {
    id,
    name: skill?.name || "Unknown Skill"
  };
});

return {
  item: this.document,
  system: this.document.system,
  effects: this.document.effects,
  startingSkills: skills
};
  }

_onRender(context, options) {
  super._onRender(context, options);

  const root = this.element;

  root.querySelectorAll("[data-action]").forEach(el => {

    el.addEventListener("click", (event) => {

      const action = el.dataset.action;

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

        // =========================
        // ADD SKILL
        // =========================
        case "add-skill":
          this._addSkill();
          break;

        // =========================
        // REMOVE SKILL
        // =========================
        case "remove-skill":
          this._removeSkill(event);
          break;

      }

    });

  });

}

  async _addSkill() {

  const skills = game.items
    .filter(i => i.type === "skill")
    .map(s => ({ id: s.id, name: s.name }));

  const app = new SkillSelectorApp({
    skills,
    callback: async (skillId) => {

      // ensure structure exists
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

  const updated = current.filter(id => id !== skillId);

  await this.document.update({
    "system.startingSkills.choices": updated
  });

}

  async _createEffect() {
    await this.document.createEmbeddedDocuments("ActiveEffect", [{
      name: "New Effect",
      icon: "icons/svg/aura.svg",
      changes: []
    }]);
  }

  async _editEffect(event) {
    const li = event.target.closest(".effect");
    if (!li) return;

    const effect = this.document.effects.get(li.dataset.effectId);
    if (effect) effect.sheet.render(true);
  }

  async _deleteEffect(event) {
    const li = event.target.closest(".effect");
    if (!li) return;

    const effect = this.document.effects.get(li.dataset.effectId);
    if (effect) await effect.delete();
  }

}