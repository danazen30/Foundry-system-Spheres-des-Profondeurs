const { ApplicationV2 } = foundry.applications.api;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class SkillSelectorApp extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    window: {
      title: "Select Skill"
    }
  };

  static PARTS = {
    main: {
      template: "systems/sdp/templates/dialogs/skill-selector.hbs"
    }
  };

  constructor(options = {}) {
    super(options);

    this.skills = options.skills || [];
    this.callback = options.callback;
  }

  async _prepareContext() {
    return {
      skills: this.skills
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const root = this.element;

    root.querySelector("#confirm").addEventListener("click", () => {

      const select = root.querySelector("#skill-select");
      const skillId = select.value;

      if (this.callback) this.callback(skillId);

      this.close();

    });
  }

}