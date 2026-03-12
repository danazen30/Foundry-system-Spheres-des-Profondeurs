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

    if (!system.derived) {

      system.derived = {
        woundThreshold: { value: 0 },
        evasion: { value: 0 },
        parry: { value: 0 },
        attack: { value: 0 },
        carryingCapacity: { value: 0 }
      };

    }

    // =====================
    // HEALTH DEFAULT
    // =====================

if (!system.health) {
  system.health = { value: 8, max: 8 };
}

    // =====================
    // CUSTOM MODIFIERS
    // =====================

    system.custom ??= {};
    system.custom.offhandReduction ??= 0;
  }


  prepareDerivedData() {

    super.prepareDerivedData();

    const system = this.system;

    system.custom.offhandReduction = 0;

    // =====================
    // ATTRIBUTES
    // =====================

    for (let attr of Object.values(system.attributes)) {

      attr.value =
        Number(attr.initial || 0) +
        Number(attr.advances || 0) +
        Number(attr.modifier || 0) +
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

// si aucune valeur actuelle → initialise
if (system.health.value === undefined || system.health.value === null) {
  system.health.value = maxHealth;
}

// empêcher dépassement
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

    let mainWeapon = equippedWeapons.find(w => !w.system.offhand);

    if (!mainWeapon && equippedWeapons.length > 0) {
      mainWeapon = equippedWeapons[0];
    }

    const twoHandedWeapon = equippedWeapons.find(
      w => w.system.handedness === "two"
    );

    let usableWeapons;

    if (twoHandedWeapon) {
      usableWeapons = [twoHandedWeapon];
    } else {
      usableWeapons = equippedWeapons.filter(
        w => w.system.handedness !== "two"
      );
    }

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

    } else if (brawl !== null) {

      parryBase = brawl.system.bonus;

    } else {

      parryBase = system.attributes.meleeAbility.bonus;

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

        if (weaponSkill) {
          baseBonus = weaponSkill.system.bonus;
        } else {
          baseBonus = weapon.system.category === "ranged"
            ? system.attributes.rangedAbility.bonus
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

    } else if (brawl !== null) {

      attackBase = brawl.system.bonus;

    } else {

      attackBase = system.attributes.meleeAbility.bonus;

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

    system.derived.attack.value =
      attackBase;

    system.derived.carryingCapacity.value =
      system.attributes.toughness.bonus;

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