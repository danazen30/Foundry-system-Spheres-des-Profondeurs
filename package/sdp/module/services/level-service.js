export class SdpLevelService {

  static LEVELS = [
    { level: 0, xp: 0 },
    { level: 1, xp: 500 },
    { level: 2, xp: 1500 },
    { level: 3, xp: 3000 },
    { level: 4, xp: 5000 },
    { level: 5, xp: 8000 }
  ];

  static getLevelFromXP(xp) {
    let currentLevel = 0;

    for (const entry of this.LEVELS) {
      if (xp >= entry.xp) {
        currentLevel = entry.level;
      }
    }

    return currentLevel;
  }

  static getNextLevelXP(level) {
    const next = this.LEVELS.find(l => l.level === level + 1);
    return next ? next.xp : null;
  }

  static canLevelUp(actor) {

  const xp = actor.system.details?.experience?.total ?? 0;

  const currentLevel =
    actor.system.details?.level?.value ??
    actor.system.details?.level ??
    0;

  const computedLevel = this.getLevelFromXP(xp);

  return computedLevel > currentLevel;
}

  static getAvailableLevel(actor) {

  const xp = actor.system.details?.experience?.total ?? 0;

  return this.getLevelFromXP(xp);
}

}