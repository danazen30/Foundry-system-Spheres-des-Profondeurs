export class SdpLevelEngine {

  // =========================
  // HEALTH DICE
  // =========================

  static getHealthDice(level) {

    if (level === 0) return "1d4";
    if (level === 1) return "1d4";
    if (level === 2) return "1d6";
    if (level === 3) return "1d8";
    if (level === 4) return "2d4";
    if (level === 5) return "2d6";

    return "1d4";

  }

  // =========================
  // DICE MAX
  // =========================

  static getDiceMax(dice) {
    return Number(dice.split("d")[1]);
  }

  // =========================
  // ROLL LEVEL
  // =========================

  static async generateLevelData(actor, level) {

    const hitDice =
      this.getHealthDice(level);

    // =========================
    // BASE HP
    // =========================

    const baseRoll =
      await new Roll(hitDice).evaluate();

    const baseHP =
      baseRoll.total;

    // =========================
    // SIGN
    // =========================

    const sign =
      actor.getSign();

    const levelData =
      sign?.system?.levels?.[level];

    const signDice =
      levelData?.hp || null;

    let signHP = 0;

    if (signDice) {

      const signRoll =
        await new Roll(signDice).evaluate();

      signHP =
        signRoll.total;

    }

    // =========================
    // TOTAL
    // =========================

    return {

      level,

      hp:
        baseHP + signHP,

      hitDice,

      hpRoll:
        baseHP,

      signDice,

      signHP,

      damageBonus:
        levelData?.damageBonus || 0,

      inspirationDice:
        levelData?.inspirationDice || null,

      description:
        levelData?.description || ""

    };

  }

  // =========================
  // APPLY LEVEL
  // =========================

  static async applyLevel(actor, levelData) {

    const progression =
      foundry.utils.deepClone(
        actor.system.details?.levelProgression ?? []
      );

    progression.push(levelData);

    await actor.update({

      "system.details.level":
        levelData.level,

      "system.health.levelBonus":
        (actor.system.health.levelBonus || 0)
        + levelData.hp,

      "system.details.levelProgression":
        progression

    });

  }

}