export class SdpActor extends Actor {

  prepareBaseData() {
    super.prepareBaseData();

    const system = this.system;

    // =====================
    // ATTRIBUTES DEFAULT
    // =====================

    const defaultAttributes = {
      meleeAbility: { label: "MA", initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      rangedAbility: { label: "RA", initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      strength: { label: "S", initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      toughness: { label: "T", initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      initiative: { label: "I", initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      agility: { label: "A", initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      dexterity: { label: "D", initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      intelligence: { label: "Int", initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      willpower: { label: "WP", initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      charisma: { label: "C", initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 }
    };

    system.attributes ??= {};

    for (let [key, defaults] of Object.entries(defaultAttributes)) {

      const attr = system.attributes[key] ??= {};

      attr.label ??= defaults.label;
      attr.initial ??= defaults.initial;
      attr.advances ??= defaults.advances;
      attr.modifier ??= defaults.modifier;
      attr.levelBonus ??= defaults.levelBonus;

    }

    // =====================
    // DERIVED DEFAULT
    // =====================

system.derived ??= {};

system.derived.woundThreshold ??= { value: 0 };
system.derived.evasion ??= { value: 0 };
system.derived.parry ??= { value: 0 };
system.derived.attack ??= { value: 0 };
system.derived.carryingCapacity ??= { value: 0 };

    // =====================
    // HEALTH DEFAULT
    // =====================

system.health ??= {};
system.health.value ??= 8;
system.health.max ??= 8;

    // =====================
    // RESOURCES DEFAULT
    // =====================

system.resources ??= {};
system.resources.mana ??= system.resources.mana ?? {};
system.resources.mana.value ??= 0;

system.resources.movement ??= {};
system.resources.movement.value ??= 4;
system.resources.movement.current ??= 4;
system.resources.movement.walk ??= 0;
system.resources.movement.run ??= 0;

    // =====================
    // CUSTOM MODIFIERS
    // =====================

    system.custom ??= {};
    system.custom.offhandReduction ??= 0;
  }

  _getItemModifiers(targetKey){

  let total = 0;

  for(const item of this.items.contents){

    if(item.type !== "injury") continue;

 const effects = Array.isArray(item.system.effects?.value)
  ? item.system.effects.value
  : [];

    for(const effect of effects){

      if(effect.target !== targetKey) continue;

      total += Number(effect.value ?? 0);

    }

  }

  return total;

}


  prepareDerivedData() {

    super.prepareDerivedData();

    const system = this.system;

    system.custom.offhandReduction = 0;

    // =====================
    // ATTRIBUTES
    // =====================

for (let [key, attr] of Object.entries(system.attributes)) {

  const itemMod = this._getItemModifiers(key) ?? 0;

  attr.itemModifier = itemMod;

  attr.totalModifier =
    Number(attr.modifier || 0) + itemMod;

  attr.value =
    Number(attr.initial || 0) +
    Number(attr.advances || 0) +
    attr.totalModifier +
    Number(attr.levelBonus || 0);

  attr.bonus = Math.floor(attr.value / 10);

}

   // =====================
   // HEALTH CALCULATION
   // =====================

   const TB = system.attributes.toughness.bonus;
   const SB = system.attributes.strength.bonus;
   const WPB = system.attributes.willpower.bonus;

   const maxHealth = (TB * 2) + SB + WPB;

   system.health.max = maxHealth;

   if (system.health.value === undefined || system.health.value === null) {
     system.health.value = maxHealth;
   }

   // ⚠️ IMPORTANT
   // On empêche seulement de dépasser le max
   // MAIS on autorise les valeurs négatives
   if (system.health.value > maxHealth) {
     system.health.value = maxHealth;
   }

    // =====================
    // SKILLS
    // =====================

    const skills = this.items.filter(i => i.type === "skill");

    for (let skill of skills) {

      const attribute =
        system.attributes[skill.system.characteristic]?.value ?? 0;

      skill.system.value =
        attribute +
        Number(skill.system.advances || 0) +
        Number(skill.system.modifier || 0);

      skill.system.bonus =
        Math.floor(skill.system.value / 10);

    }

    // =====================
    // HELPER
    // =====================

    const getSkill = (key) => {
      return skills.find(s => s.system.key === key);
    };

    const resistance = getSkill("resistance") || null;
    const dodge = getSkill("dodge") || null;
    const brawl = getSkill("brawl") || null;

    // =====================
    // WEAPON DAMAGE
    // =====================

    const SB_damage = system.attributes.strength.bonus;

    const weapons = this.items.filter(i => i.type === "weapon");

    for (let weapon of weapons) {

      let formula = weapon.system.damage || "0";

      formula = formula.replace("SB", SB_damage);

      let value = 0;

      try {
        value = Roll.safeEval(formula);
      } catch {
        value = 0;
      }

      weapon.system.finalDamage = value;

    }

    // =====================
    // WEAPONS
    // =====================

    const equippedWeapons = this.items.filter(
      i => i.type === "weapon" && i.system.equipped === true
    );

    let usableWeapons = equippedWeapons;

    const OFFHAND_PENALTY = 2;

    const offhandPenalty =
      Math.max(0, OFFHAND_PENALTY - system.custom.offhandReduction);

    // =====================
    // PARRY
    // =====================

let parryBase = 0;

const meleeWeapons = usableWeapons.filter(
  w => w.system.category === "melee"
);

if (meleeWeapons.length > 0) {

  const parryValues = [];

  for (let weapon of meleeWeapons) {

    const weaponSkill = getSkill(weapon.system.skill);

    let baseBonus = weaponSkill
      ? weaponSkill.system.bonus
      : system.attributes.meleeAbility.bonus;

    let value =
      baseBonus +
      Number(weapon.system.parryBonus || 0);

    if (weapon.system.offhand) {
      value -= offhandPenalty;
    }

    parryValues.push(value);
  }

  parryBase = Math.max(...parryValues);

} else {

  // 🔥 NO WEAPON → BRAWL
  const brawlSkill = getSkill("brawl");

  parryBase = brawlSkill
    ? brawlSkill.system.bonus
    : system.attributes.meleeAbility.bonus;
}

    // =====================
    // ATTACK
    // =====================

let attackBase = 0;

if (usableWeapons.length > 0) {

  const attackValues = [];

  for (let weapon of usableWeapons) {

    const weaponSkill = getSkill(weapon.system.skill);

    let baseBonus;

    // ===== RANGED =====
    if (weapon.system.category === "ranged") {

      baseBonus = weaponSkill
        ? weaponSkill.system.bonus
        : system.attributes.rangedAbility.bonus;

    }

    // ===== MELEE =====
    else {

      baseBonus = weaponSkill
        ? weaponSkill.system.bonus
        : system.attributes.meleeAbility.bonus;
    }

    let value =
      baseBonus +
      Number(weapon.system.attackBonus || 0);

    if (weapon.system.offhand) {
      value -= offhandPenalty;
    }

    attackValues.push(value);
  }

  attackBase = Math.max(...attackValues);

} else {

  // 🔥 NO WEAPON → BRAWL
  const brawlSkill = getSkill("brawl");

  attackBase = brawlSkill
    ? brawlSkill.system.bonus
    : system.attributes.meleeAbility.bonus;
}

    // =====================
    // DERIVED
    // =====================

    system.derived.woundThreshold.value =
      resistance?.system.bonus ?? 0;

    system.derived.evasion.value =
      (dodge?.system.bonus ??
      system.attributes.agility.bonus ??
      0) + 5;

    system.derived.parry.value =
      parryBase + 5;

    // =====================
    // CONDITION MODIFIER
    // =====================

    const poisonStacks = system.conditions?.poisoned ?? 0;
    const exhaustedStacks = system.conditions?.exhausted ?? 0;
    const deafenedStacks = system.conditions?.deafened ?? 0;
    const shaken = system.conditions?.shaken ? 1 : 0;
    const frightened = system.conditions?.frightened ? 3 : 0;

    const conditionPenalty =
      poisonStacks +
      exhaustedStacks +
      deafenedStacks +
      shaken +
      frightened;

    system.derived.attack.value =
      Math.max(attackBase - conditionPenalty, 0);

    system.derived.carryingCapacity.value =
      system.attributes.toughness.bonus;

    // =====================
    // MOVEMENT
    // =====================

    const baseMove = system.resources.movement.value ?? 0;

    const slowedStacks = system.conditions?.slowed ?? 0;

    const currentMove = Math.max(baseMove - slowedStacks, 0);

    system.resources.movement.current = currentMove;

    system.resources.movement.walk = currentMove * 2;

    system.resources.movement.run = system.resources.movement.walk * 2;

    if(currentMove === 0 && slowedStacks > 0){
      system.conditions.entangled = true;
    }

  }

  // =====================
  // TALENT MAX
  // =====================

  getTalentMax(talent){

    const max = talent.system.max;

    if(!isNaN(max)){
      return Number(max);
    }

    const attr = this.system.attributes[max];

    return attr?.bonus ?? 1;

  }

}