export const SDP = {

  ATTRIBUTE_ORDER: [
    "meleeAbility",
    "rangedAbility",
    "strength",
    "toughness",
    "initiative",
    "agility",
    "dexterity",
    "intelligence",
    "willpower",
    "charisma"
  ],

  rangeBands: {

    pointBlank: {
  label: "SDP.RangePointBlank",
      multiplier: 0.1,
      modifier: 30
    },

    short: {
  label: "SDP.RangeShort",
      multiplier: 0.5,
      modifier: 10
    },

   normal: {
  label: "SDP.RangeNormal",
      multiplier: 1,
      modifier: 0
    },

    long: {
  label: "SDP.RangeLong",
      multiplier: 2,
      modifier: -10
    },

    extreme: {
  label: "SDP.RangeExtreme",
      multiplier: 3,
      modifier: -30
    }

  }

};

CONFIG.SDP = CONFIG.SDP || {};

SDP.ATTRIBUTE_ABBREVIATIONS = {
  meleeAbility: "MA",
  rangedAbility: "RA",
  strength: "S",
  toughness: "T",
  initiative: "I",
  agility: "A",
  dexterity: "D",
  intelligence: "Int",
  willpower: "WP",
  charisma: "C"
};

SDP.ATTRIBUTE_LABELS = {

  meleeAbility: "SDP.MeleeAbility",
  rangedAbility: "SDP.RangedAbility",
  strength: "SDP.Strength",
  toughness: "SDP.Toughness",
  initiative: "SDP.Initiative",
  agility: "SDP.Agility",
  dexterity: "SDP.Dexterity",
  intelligence: "SDP.Intelligence",
  willpower: "SDP.Willpower",
  charisma: "SDP.Charisma"

};

export const DAMAGE_TYPES = {
  slashing: "SDP.DamageTypeSlashing",
  piercing: "SDP.DamageTypePiercing",
  bludgeoning: "SDP.DamageTypeBludgeoning",
  ethereal: "SDP.DamageTypeEthereal"
};

CONFIG.SDP.hitLocations = {

  head: "SDP.HitLocationHead",
  body: "SDP.HitLocationBody",
  rightArm: "SDP.HitLocationRightArm",
  leftArm: "SDP.HitLocationLeftArm",
  rightLeg: "SDP.HitLocationRightLeg",
  leftLeg: "SDP.HitLocationLeftLeg"

};

CONFIG.SDP.hitLocationModifiers = {

  head: -30,
  body: -10,
  rightArm: -20,
  leftArm: -20,
  rightLeg: -20,
  leftLeg: -20

};

CONFIG.SDP.hitLocationProfiles = {

  humanoid: {

    label: "SDP.ProfileHumanoid",

    table: {
      1: "head",
      2: "rightArm",
      3: "rightArm",
      4: "leftArm",
      5: "leftArm",
      6: "body",
      7: "body",
      8: "body",
      9: "rightLeg",
      10: "rightLeg",
      11: "leftLeg",
      12: "leftLeg"
    },

    locations: {

      head: {
        label: "SDP.HitLocationHead",
        modifier: -30
      },

      body: {
        label: "SDP.HitLocationBody",
        modifier: -10
      },

      rightArm: {
        label: "SDP.HitLocationRightArm",
        modifier: -20
      },

      leftArm: {
        label: "SDP.HitLocationLeftArm",
        modifier: -20
      },

      rightLeg: {
        label: "SDP.HitLocationRightLeg",
        modifier: -20
      },

      leftLeg: {
        label: "SDP.HitLocationLeftLeg",
        modifier: -20
      }

    }

  },

  serpent: {

    label: "SDP.ProfileSerpent",

    table: {
      1: "head",
      2: "head",
      3: "head",
      4: "body",
      5: "body",
      6: "body",
      7: "body",
      8: "body",
      9: "body",
      10: "body",
      11: "body",
      12: "body"
    },

    locations: {

      head: {
        label: "SDP.HitLocationHead",
        modifier: -30
      },

      body: {
        label: "SDP.HitLocationBody",
        modifier: -10
      },

    }

  }

};
SDP.hitLocationProfiles = CONFIG.SDP.hitLocationProfiles;

SDP.conditions = {

  staggering: "SDP.ConditionStaggering",
  stunned: "SDP.ConditionStunned",
  bleeding: "SDP.ConditionBleeding",
  poisoned: "SDP.ConditionPoisoned",
  burning: "SDP.ConditionBurning",
  exhausted: "SDP.ConditionExhausted",
  deafened: "SDP.ConditionDeafened",
  prone: "SDP.ConditionProne",
  shaken: "SDP.ConditionShaken",
  frightened: "SDP.ConditionFrightened",
  entangled: "SDP.ConditionEntangled",
  unconscious: "SDP.ConditionUnconscious",
  dying: "SDP.ConditionDying",
  surprised: "SDP.ConditionSurprised"

};

SDP.turnConditions = {

  bleeding: true,
  burning: true,
  stunned: true

};

CONFIG.SDP.magicTypes = {
  minor: "SDP.MagicMinor",
  advanced: "SDP.MagicAdvanced",
  superior: "SDP.MagicSuperior"
};

SDP.rollTables = {

  criticalAttackFailure: {
    key: "critical-attack-failure",
    label: "SDP.RollTableCriticalAttackFailure"
  },

  minorMagicalConsequence: {
    key: "minor-magical-consequence",
    label: "SDP.RollTableMinorMagicalConsequence"
  },

  majorMagicalConsequence: {
    key: "major-magical-consequence",
    label: "SDP.RollTableMajorMagicalConsequence"
  }
};

SDP.conditionConfig = {

  stunned: {
    label: "SDP.ConditionStunned",
    type: "stack",
    modifier: -10,
    attackBonusAgainst: 1,
    trigger: "startTurn",
    test: "resistance",
    onRecover: "exhausted",
    description: "SDP.ConditionStunnedDescription"
  },

  bleeding: {
    label: "SDP.ConditionBleeding",
    type: "stack",
    trigger: "endTurn",
    damagePerStack: 1,
    description: "SDP.ConditionBleedingDescription"
  },

  staggered: {
    label: "SDP.ConditionStaggered",
    type: "state",
    description: "SDP.ConditionStaggeredDescription"
  },

  poisoned: {
    label: "SDP.ConditionPoisoned",
    type: "stack",
    trigger: "endTurn",
    damagePerStack: 1,
    modifier: -10,
    test: "resistance",
    onRecover: "exhausted",
    description: "SDP.ConditionPoisonedDescription"
  },

  burning: {
    label: "SDP.ConditionBurning",
    type: "stack",
    trigger: "endTurn",
    dicePerStack: "d6",
    armor:"lowest",
    description: "SDP.ConditionBurningDescription"
  },

  exhausted: {
    label: "SDP.ConditionExhausted",
    type: "stack",
    modifier: -10,
    description: "SDP.ConditionExhaustedDescription"
  },

  deafened: {
    label: "SDP.ConditionDeafened",
    type: "stack",
    modifier: -10,
    attackBonusAgainst : 1,
    trigger: "endTurn",
    removePerTurn: 1,
    description: "SDP.ConditionDeafenedDescription"
  },

  prone: {
    label: "SDP.ConditionProne",
    type: "state",
    description: "SDP.ConditionProneDescription"
  },

  shaken: {
    label: "SDP.ConditionShaken",
    type : "state",
    modifier: -10,
    description: "SDP.ConditionShakenDescription"
  },

  frightened: {
    label: "SDP.ConditionFrightened",
    type: "state",
    modifier: -30,
    trigger: "endTurn",
    test: "calm",
    description: "SDP.ConditionFrightenedDescription"
  },

  slowed: {
    label: "SDP.ConditionSlowed",
    type: "stack",
    movementPenalty: 1,
    description: "SDP.ConditionSlowedDescription"
  },

  entangled: {
    label: "SDP.ConditionEntangled",
    type: "state",
    trigger: "startTurn",
    test: "strength",
    description: "SDP.ConditionEntangledDescription"
  },

  unconscious: {
    label: "SDP.ConditionUnconscious",
    type: "state",
    description: "SDP.ConditionUnconsciousDescription"
  },

  dying: {
    label: "SDP.ConditionDying",
    type: "state",
    trigger: "startTurn",
    test: "dying",
    description: "SDP.ConditionDyingDescription"
  },

  surprised: {
    label: "SDP.ConditionSurprised",
    type: "state",
    trigger: "endTurn",
    removePerTurn: 1,
    attackBonusAgainst: 3,
    description: "SDP.ConditionSurprisedDescription"
  }

};

export const WEAPON_TRAITS = {

  defensive: {
    label: "SDP.WeaponTraitDefensive",
    type: "positive",
    description: "SDP.WeaponTraitDefensiveDescription",
    hasValue: false
  },

  fast: {
    label: "SDP.WeaponTraitFast",
    type: "positive",
    description: "SDP.WeaponTraitFastDescription",
    hasValue: false
  },

  impaling: {
    label: "SDP.WeaponTraitImpaling",
    type: "positive",
    description: "SDP.WeaponTraitImpalingDescription",
    hasValue: false
  },

  light: {
    label: "SDP.WeaponTraitLight",
    type: "positive",
    description: "SDP.WeaponTraitLightDescription",
    hasValue: false
  },

  semiLight: {
    label: "SDP.WeaponTraitSemiLight",
    type: "positive",
    description: "SDP.WeaponTraitSemiLightDescription",
    hasValue: false
  },

  versatile: {
    label: "SDP.WeaponTraitVersatile",
    type: "positive",
    description: "SDP.WeaponTraitVersatileDescription",
    hasValue: true
  },

  stunning: {
    label: "SDP.WeaponTraitStunning",
    type: "positive",
    description: "SDP.WeaponTraitStunningDescription",
    hasValue: true
  },

  bleeding: {
    label: "SDP.WeaponTraitBleeding",
    type: "positive",
    description: "SDP.WeaponTraitBleedingDescription",
    hasValue: true
  },

  impactful: {
    label: "SDP.WeaponTraitImpactful",
    type: "positive",
    description: "SDP.WeaponTraitImpactfulDescription",
    hasValue: true
  },

  entangling: {
    label: "SDP.WeaponTraitEntangling",
    type: "positive",
    description: "SDP.WeaponTraitEntanglingDescription",
    hasValue: false
  },

  devastating: {
    label: "SDP.WeaponTraitDevastating",
    type: "positive",
    description: "SDP.WeaponTraitDevastatingDescription",
    hasValue: false
  },

  sundering: {
    label: "SDP.WeaponTraitSundering",
    type: "positive",
    description: "SDP.WeaponTraitSunderingDescription",
    hasValue: false
  },

  finesse: {
    label: "SDP.WeaponTraitFinesse",
    type: "positive",
    description: "SDP.WeaponTraitFinesseDescription",
    hasValue: false
  },

  antiLarge: {
    label: "SDP.WeaponTraitAntiLarge",
    type: "positive",
    description: "SDP.WeaponTraitAntiLargeDescription",
    hasValue: false
  },

  trapBlade: {
    label: "SDP.WeaponTraitTrapBlade",
    type: "positive",
    description: "SDP.WeaponTraitTrapBladeDescription",
    hasValue: false
  },

  ensnaring: {
    label: "SDP.WeaponTraitEnsnaring",
    type: "positive",
    description: "SDP.WeaponTraitEnsnaringDescription",
    hasValue: false
  },

  precise: {
    label: "SDP.WeaponTraitPrecise",
    type: "positive",
    description: "SDP.WeaponTraitPreciseDescription",
    hasValue: false
  },

  protective: {
    label: "SDP.WeaponTraitProtective",
    type: "positive",
    description: "SDP.WeaponTraitProtectiveDescription",
    hasValue: true
  },

  pistol: {
    label: "SDP.WeaponTraitPistol",
    type: "positive",
    description: "SDP.WeaponTraitPistolDescription",
    hasValue: false
  },

  repetition: {
    label: "SDP.WeaponTraitRepetition",
    type: "positive",
    description: "SDP.WeaponTraitRepetitionDescription",
    hasValue: true
  },

  explosion: {
    label: "SDP.WeaponTraitExplosion",
    type: "positive",
    description: "SDP.WeaponTraitExplosionDescription",
    hasValue: true
  },

  blackPowder: {
    label: "SDP.WeaponTraitBlackPowder",
    type: "positive",
    description: "SDP.WeaponTraitBlackPowderDescription",
    hasValue: false
  },

  imprecise: {
    label: "SDP.WeaponTraitImprecise",
    type: "negative",
    description: "SDP.WeaponTraitImpreciseDescription",
    hasValue: false
  },

  inoffensive: {
    label: "SDP.WeaponTraitInoffensive",
    description: "SDP.WeaponTraitInoffensiveDescription",
    hasValue: false,
    type: "negative"
  },

  slow: {
    label: "SDP.WeaponTraitSlow",
    description: "SDP.WeaponTraitSlowDescription",
    hasValue: false,
    type: "negative"
  },

  reload: {
    label: "SDP.WeaponTraitReload",
    description: "SDP.WeaponTraitReloadDescription",
    hasValue: true,
    type: "negative"
  },

  dangerous: {
    label: "SDP.WeaponTraitDangerous",
    description: "SDP.WeaponTraitDangerousDescription",
    hasValue: false,
    type: "negative"
  }

};

export const ITEM_TRAITS = {

  refined: {
    label: "SDP.ItemTraitRefined",
    description: "SDP.ItemTraitRefinedDescription",
    type: "positive",
    hasValue: true
  },

  lightweight: {
    label: "SDP.ItemTraitLightweight",
    description: "SDP.ItemTraitLightweightDescription",
    type: "positive",
    hasValue: false
  },

  practical: {
    label: "SDP.ItemTraitPractical",
    description: "SDP.ItemTraitPracticalDescription",
    type: "positive",
    hasValue: false
  },

  durable: {
    label: "SDP.ItemTraitDurable",
    description: "SDP.ItemTraitDurableDescription",
    type: "positive",
    hasValue: false
  },

  flawed: {
    label: "SDP.ItemTraitFlawed",
    description: "SDP.ItemTraitFlawedDescription",
    type: "negative",
    hasValue: false
  },

  ugly: {
    label: "SDP.ItemTraitUgly",
    description: "SDP.ItemTraitUglyDescription",
    type: "negative",
    hasValue: false
  },

  impractical: {
    label: "SDP.ItemTraitImpractical",
    description: "SDP.ItemTraitImpracticalDescription",
    type: "negative",
    hasValue: false
  },

  bulky: {
    label: "SDP.ItemTraitBulky",
    description: "SDP.ItemTraitBulkyDescription",
    type: "negative",
    hasValue: false
  }

};

export const ARMOR_TRAITS = {

  flexible: {
    label: "SDP.ArmorTraitFlexible",
    type: "positive",
    description: "SDP.ArmorTraitFlexibleDescription",
    hasValue: false
  },

  padded: {
    label: "SDP.ArmorTraitPadded",
    type: "positive",
    description: "SDP.ArmorTraitPaddedDescription",
    hasValue: false
  },

  dense: {
    label: "SDP.ArmorTraitDense",
    type: "positive",
    description: "SDP.ArmorTraitDenseDescription",
    hasValue: false
  },

  layered: {
    label: "SDP.ArmorTraitLayered",
    type: "positive",
    description: "SDP.ArmorTraitLayeredDescription",
    hasValue: false
  },

  robust: {
    label: "SDP.ArmorTraitRobust",
    type: "positive",
    description: "SDP.ArmorTraitRobustDescription",
    hasValue: false
  },

  encumbering: {
    label: "SDP.ArmorTraitEncumbering",
    type: "negative",
    description: "SDP.ArmorTraitEncumberingDescription",
    hasValue: false
  },

  defective: {
    label: "SDP.ArmorTraitDefective",
    type: "negative",
    description: "SDP.ArmorTraitDefectiveDescription",
    hasValue: true
  },

  restrictive: {
    label: "SDP.ArmorTraitRestrictive",
    type: "negative",
    description: "SDP.ArmorTraitRestrictiveDescription",
    hasValue: false
  },

  heavy: {
    label: "SDP.ArmorTraitHeavy",
    type: "negative",
    description: "SDP.ArmorTraitHeavyDescription",
    hasValue: true
  },

  conspicuous: {
    label: "SDP.ArmorTraitConspicuous",
    type: "negative",
    description: "SDP.ArmorTraitConspicuousDescription",
    hasValue: false
  },

  limitedVision: {
    label: "SDP.ArmorTraitLimitedVision",
    type: "negative",
    description: "SDP.ArmorTraitLimitedVisionDescription",
    hasValue: false
  }

};

SDP.sizes = {

  
    tiny: {
    label: "SDP.SizeTiny",
    order: 0,
    strength: -30,
    toughness: -30,
    agility: 0,
    damageMultiplier: 0.2
  },

    verySmall: {
    label: "SDP.SizeVerySmall",
    order: 1,
    strength: -20,
    toughness: -20,
    agility: 0,
    damageMultiplier: 0.5
  },

  small: {
    label: "SDP.SizeSmall",
    order: 2,
    strength: -10,
    toughness: -10,
    agility: 0,
    damageMultiplier: 1
  },

  average: {
    label: "SDP.SizeAverage",
    order: 3,
    strength: 0,
    toughness: 0,
    agility: 0,
    damageMultiplier: 1
  },

  large: {
    label: "SDP.SizeLarge",
    order: 4,
    strength: 10,
    toughness: 10,
    agility: 0,
    damageMultiplier: 1.5
  },

  enormous: {
    label: "SDP.SizeEnormous",
    order: 5,
    strength: 20,
    toughness: 20,
    agility: 0,
    damageMultiplier: 2
  },

  gigantic: {
    label: "SDP.SizeGigantic",
    order: 6,
    strength: 30,
    toughness: 30,
    agility: 0,
    damageMultiplier: 3
  }

};

export const WEAPON_GROUPS = {

  basic: {
    label: "SDP.WeaponGroups.basic"
  },

  polearm: {
    label: "SDP.WeaponGroups.polearm"
  },

  twohanded: {
    label: "SDP.WeaponGroups.twohanded"
  },

  brawl: {
    label: "SDP.WeaponGroups.brawl"
  },

  cavalry: {
    label: "SDP.WeaponGroups.cavalry"
  },

  fencing: {
    label: "SDP.WeaponGroups.fencing"
  },

  sword: {
    label: "SDP.WeaponGroups.sword"
  },

  axe: {
    label: "SDP.WeaponGroups.axe"
  },

  hammer: {
    label: "SDP.WeaponGroups.hammer"
  },

  shield: {
    label: "SDP.WeaponGroups.shield"
  },

  flail: {
    label: "SDP.WeaponGroups.flail"
  },

  parry: {
    label: "SDP.WeaponGroups.parry"
  },

  crossbow: {
    label: "SDP.WeaponGroups.crossbow"
  },

  bow: {
    label: "SDP.WeaponGroups.bow"
  },

  entangle: {
    label: "SDP.WeaponGroups.entangle"
  },

  explosives: {
    label: "SDP.WeaponGroups.explosives"
  },

  sling: {
    label: "SDP.WeaponGroups.sling"
  },

  engineering: {
    label: "SDP.WeaponGroups.engineering"
  },

  throwing: {
    label: "SDP.WeaponGroups.throwing"
  },

  blackpowder: {
    label: "SDP.WeaponGroups.blackpowder"
  }

};

CONFIG.SDP.WEAPON_TRAITS = WEAPON_TRAITS;
CONFIG.SDP.WEAPON_GROUPS = WEAPON_GROUPS;
SDP.WEAPON_GROUPS = WEAPON_GROUPS;
SDP.ARMOR_TRAITS = ARMOR_TRAITS;
SDP.WEAPON_TRAITS = WEAPON_TRAITS;
SDP.ITEM_TRAITS = ITEM_TRAITS;