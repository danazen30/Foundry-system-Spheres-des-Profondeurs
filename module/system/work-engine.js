import { SdpRoll } from "../rolls/roll.js";
import {
  findActorItemByRef,
  getLocalizedItemName
} from "../system/item-localization.js";

export class SdpWorkEngine {

  static async work(actor) {

    // =========================
    // CURRENT CAREER
    // =========================

    const career = actor.items.find(i =>
      i.type === "career" &&
      i.system.current
    );

    if (!career) {

      ui.notifications.warn(
  game.i18n.localize("SDP.WarningNoCurrentCareer")
);

      return;
    }

    // =========================
    // WORK SKILL
    // =========================

    const workSkillRef =
      career.system.workSkill;

    if (!workSkillRef) {

      ui.notifications.warn(
  game.i18n.localize("SDP.WarningNoWorkSkill")
);

      return;
    }

    // =========================
    // FIND SKILL
    // =========================

    const skill = findActorItemByRef(
      actor,
      "skill",
      workSkillRef
    );

    if (!skill) {

      ui.notifications.warn(
  game.i18n.format("SDP.WarningSkillNotFound", {
    skill: workSkillRef
  })
);

      return;
    }

    // =========================
    // SKILL VALUE
    // =========================

    const target =
      Number(skill.system.value || 0);

    // =========================
    // ROLL TEST
    // =========================

    const testRoll =
      await new Roll("1d100").evaluate();

    // =========================
    // CALCULATE SL
    // =========================

    const targetSL =
      Math.floor(target / 10);

    const rollSL =
      Math.floor(testRoll.total / 10);

    const sl =
      targetSL - rollSL;

    // =========================
    // STANDING
    // =========================

    const standing =
      actor.system.details.standing.value || "";

    const parts =
      standing.split(" ");

    if (parts.length < 2) {

      ui.notifications.warn(
  game.i18n.localize("SDP.WarningInvalidStandingFormat")
);

      return;
    }

    const tier =
  parts[0].toLowerCase();

const tierMap = {
  copper: "SDP.StandingCopper",
  silver: "SDP.StandingSilver",
  gold: "SDP.StandingGold",
  platinum: "SDP.StandingPlatinum"
};

const localizedTier =
  game.i18n.localize(
    tierMap[tier] || tier
  );

    const standingValue =
      Number(parts[1]);

    // =========================
    // DICE TYPE
    // =========================

    let dice = "d8";

    switch (tier) {

      case "copper":
        dice = "d8";
        break;

      case "silver":
        dice = "d6";
        break;

      case "gold":
        dice = "d4";
        break;

      case "platinum":
        dice = "d4";
        break;

    }

    // =========================
    // MONEY ROLL
    // =========================

    const moneyRoll =
      await new Roll(
        `${standingValue}${dice}`
      ).evaluate();

    // =========================
    // APPLY SL
    // =========================

    const finalMoney =
      Math.max(
        0,
        moneyRoll.total + sl
      );

    // =========================
    // DICE 3D
    // =========================

    if (game.dice3d) {

      await game.dice3d.showForRoll(testRoll);

      await game.dice3d.showForRoll(moneyRoll);

    }

    const careerLabel = getLocalizedItemName(
      "career",
      career.system?.key,
      career.name
    );

    const skillLabel = getLocalizedItemName(
      "skill",
      skill.system?.key,
      skill.name
    );

    // =========================
// RENDER DICE HTML
// =========================

const moneyHTML =
  await moneyRoll.render();

// =========================
// CHAT MESSAGE
// =========================

await ChatMessage.create({

  speaker:
    ChatMessage.getSpeaker({
      actor
    }),

 content: `

<div class="sdp-work-roll">

  <h2>
    ${game.i18n.localize("SDP.WorkTitle")}
  </h2>

  <p>
    <strong>${game.i18n.localize("SDP.WorkCareerLabel")}</strong>
    ${careerLabel}
  </p>

  <p>
    <strong>${game.i18n.localize("SDP.WorkSkillLabel")}</strong>
    ${skillLabel}
  </p>

  <p>
  <strong>${game.i18n.localize("SDP.WorkRollLabel")}</strong>
  ${testRoll.total}
</p>

  <p>
    <strong>${game.i18n.localize("SDP.WorkTargetLabel")}</strong>
    ${target}
  </p>

  <p>
    <strong>${game.i18n.localize("SDP.WorkSLLabel")}</strong>
    ${sl}
  </p>

  ${moneyHTML}

  <p>
    <strong>${game.i18n.localize("SDP.WorkFinalEarningsLabel")}</strong>
    ${finalMoney}
    ${localizedTier}
  </p>

</div>

`

});

  }

}