import { SdpRoll } from "../rolls/roll.js";

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
        "No current career"
      );

      return;
    }

    // =========================
    // WORK SKILL
    // =========================

    const workSkillName =
      career.system.workSkill;

    if (!workSkillName) {

      ui.notifications.warn(
        "No work skill on career"
      );

      return;
    }

    // =========================
    // FIND SKILL
    // =========================

    const skill = actor.items.find(i =>
      i.type === "skill" &&
      i.name === workSkillName
    );

    if (!skill) {

      ui.notifications.warn(
        `Skill not found: ${workSkillName}`
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
        "Invalid standing format"
      );

      return;
    }

    const tier =
      parts[0].toLowerCase();

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

    // =========================
// RENDER DICE HTML
// =========================

const testHTML =
  await testRoll.render();

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
      Work
    </h2>

    <p>
      <strong>Career:</strong>
      ${career.name}
    </p>

    <p>
      <strong>Skill:</strong>
      ${skill.name}
    </p>

    ${testHTML}

    <p>
      <strong>Target:</strong>
      ${target}
    </p>

    <p>
      <strong>SL:</strong>
      ${sl}
    </p>

    ${moneyHTML}

    <p>
      <strong>Final Earnings:</strong>
      ${finalMoney}
      ${tier}
    </p>

  </div>

  `

});

  }

}