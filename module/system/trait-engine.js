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

    switch (trait) {

      case "defensive":
        data.parry += 10;
        break;

    }

  }

  return data;
}

}