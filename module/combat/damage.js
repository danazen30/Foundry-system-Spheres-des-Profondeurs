export class SdpDamage {

  static getDamageFormula(actor, weapon){

    const SB = actor.system.attributes.strength.bonus;

    let baseFormula = weapon.system.damage || "0";

    baseFormula = baseFormula.replace("SB", SB);

    const dice = weapon.system.damageDice || "";

    if(dice){
      return `${baseFormula} + ${dice}`;
    }

    return baseFormula;

  }

  static async applyDamage(target, damage){

    const current = target.system.health.value;

    const newHealth = Math.max(current - damage, 0);

    await target.update({
      "system.health.value": newHealth
    });

  }

  static getArmorValue(actor, location){

  let armor = 0;

  const armors = actor.items.filter(
    i => i.type === "armor" && i.system.worn.value
  );

  for (let item of armors){

    armor += item.system.AP[location] ?? 0;

  }

  return armor;

}

static async applyDamage(target, damage, location){

  const armor = this.getArmorValue(target, location);

  const finalDamage = Math.max(damage - armor, 0);

  const current = target.system.health.value;

  const newHealth = Math.max(current - finalDamage, 0);

  await target.update({
    "system.health.value": newHealth
  });

  return {
    armor,
    finalDamage
  };

}

}