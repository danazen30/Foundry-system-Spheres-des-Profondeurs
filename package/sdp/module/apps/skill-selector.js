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
    this.itemType = options.itemType || "skill";

    const titleKey =
      this.itemType === "talent"
        ? "SDP.SelectTalent"
        : "SDP.SelectSkill";

    this.options.window.title =
      game.i18n.localize(titleKey);

  }

  async _prepareContext() {
    return {
      skills: this.skills,
      itemType: this.itemType
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const root = this.element;

    const select =
      root.querySelector("#skill-select");

    const filter =
      root.querySelector("#skill-filter");

    const rebuildOptions = (query = "") => {

      const normalized =
        query.trim().toLowerCase();

      select.innerHTML = "";

      this.skills
        .filter(entry =>
          !normalized
          || entry.name.toLowerCase().includes(normalized)
        )
        .forEach(entry => {

          const option =
            document.createElement("option");

          option.value = entry.id;
          option.textContent = entry.name;

          select.appendChild(option);

        });

    };

    rebuildOptions();

    filter?.addEventListener(
      "input",
      event => {
        rebuildOptions(event.target.value);
      }
    );

    root.querySelector("#confirm").addEventListener("click", () => {

      const skillId = select.value;

      if (this.callback) this.callback(skillId);

      this.close();

    });

  }

}