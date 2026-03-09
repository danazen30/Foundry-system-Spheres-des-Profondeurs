export class SdpActor extends Actor {

  prepareBaseData() {
    super.prepareBaseData();

    const system = this.system;

    // Création des attributes si absent
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

    // Création derived si absent
    if (!system.derived) {

      system.derived = {
        woundThreshold: { value: 0 },
        evasion: { value: 0 },
        parry: { value: 0 },
        attack: { value: 0 },
        carryingCapacity: { value: 0 }
      };

    }

  }


  prepareDerivedData() {

    const system = this.system;

    // =====================
    // ATTRIBUTES
    // =====================

    for (let attr of Object.values(system.attributes)) {

      attr.value =
        Number(attr.initial || 0) +
        Number(attr.advances || 0) +
        Number(attr.modifier || 0) +
        Number(attr.levelBonus || 0);

      attr.bonus = attr.value / 10;

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
        Math.round((skill.system.value / 10) * 10) / 10;

    }


    // =====================
    // HELPER : récupérer skill
    // =====================

    const getSkill = (key) => {
      return skills.find(s => s.system.key === key);
    };


    const resistance = getSkill("resistance") || null;
    const dodge = getSkill("dodge") || null;
    const brawl = getSkill("brawl") || null;


    // =====================
    // TALENTS
    // =====================

    const talents = this.items.filter(i => i.type === "talent");

    // réduction du malus offhand
    let offhandReduction = 0;

    for (let talent of talents) {
      offhandReduction += Number(talent.system.offhandReduction || 0);
    }


    // =====================
    // WEAPONS
    // =====================
    const equippedWeapons = this.items.filter(
      i => i.type === "weapon" && i.system.equipped === true
    );
console.log("Equipped weapons:", equippedWeapons);
    // =====================
    // MAIN HAND / OFFHAND
    // =====================

    // arme principale = première arme non offhand
    let mainWeapon = equippedWeapons.find(w => !w.system.offhand);

    // si aucune définie → première arme
    if (!mainWeapon && equippedWeapons.length > 0) {
      mainWeapon = equippedWeapons[0];
    }

    // =====================
    // GESTION 2 MAINS
    // =====================

    const twoHandedWeapon = equippedWeapons.find(
      w => w.system.handedness === "two"
    );

    let usableWeapons;

    if (twoHandedWeapon) {

      // si arme à deux mains → seule utilisable
      usableWeapons = [twoHandedWeapon];

    } else {

      usableWeapons = equippedWeapons.filter(
        w => w.system.handedness !== "two"
      );

    }


    // =====================
    // OFFHAND PENALTY
    // =====================

    const OFFHAND_PENALTY = 2;

    const offhandPenalty =
      Math.max(0, OFFHAND_PENALTY - offhandReduction);


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

        let baseBonus;

        if (weaponSkill) {

          baseBonus = weaponSkill.system.bonus;

        } else {

          baseBonus = system.attributes.meleeAbility.bonus;

        }

        let value =
          baseBonus +
          Number(weapon.system.parryBonus || 0);

        // malus offhand
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

          if (weapon.system.category === "ranged") {

            baseBonus = system.attributes.rangedAbility.bonus;

          } else {

            baseBonus = system.attributes.meleeAbility.bonus;

          }

        }

        let value =
          baseBonus +
          Number(weapon.system.attackBonus || 0);

        // malus offhand
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

}

