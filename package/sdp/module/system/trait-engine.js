export class SdpTraitEngine {

  static applyAttackTraits({ actor, weapon, data }) {

    const traits = weapon.system.traits || [];

    for (const trait of traits) {

      switch (trait) {

        case "brutal":
          data.damage += 2;
          break;

        case "fast":
          data.initiativeBonus = (data.initiativeBonus || 0) + 10;
          break;

      }

    }

    return data;
  }

  static applyDefenseTraits({ actor, weapon, data }) {

  const traits = weapon.system.traits || [];

 for (const trait of traits) {

  switch (trait.key) {

      case "defensive":

  // =========================
  // DEFENSIVE BONUS
  // =========================

  if (weapon.system.isDefenseWeapon) {

    console.log("=== DEFENSIVE TRAIT APPLIED ===", {
      weapon: weapon.name,
      parryBefore: data.parry
    });

    data.parry += 1;

    console.log("=== DEFENSIVE RESULT ===", {
      parryAfter: data.parry
    });

  }

  break;

    }

  }

  return data;
}

}