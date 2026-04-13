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
  ]
}
SDP.hitLocations = {

  head: "Head",
  body: "Body",

  rightArm: "Right Arm",
  leftArm: "Left Arm",

  rightLeg: "Right Leg",
  leftLeg: "Left Leg"

};

SDP.conditions = {

  staggering: "Staggering",
  stunned: "Stunned",
  bleeding: "Bleeding",
  poisoned: "Poisoned",
  burning: "Burning",
  exhausted: "Exhausted",
  deafened: "Deafened",
  prone: "Prone",
  shaken: "Shaken",
  frightened: "Frightened",
  entangled: "Entangled",
  unconscious: "Unconscious",
  dying: "Dying",
  surprised: "Surprised"

};

SDP.turnConditions = {

  bleeding: true,
  burning: true,
  stunned: true

};

CONFIG.SDP = CONFIG.SDP || {};

CONFIG.SDP.magicTypes = {
  minor: "Minor",
  advanced: "Advanced",
  superior: "Superior"
};

SDP.conditionConfig = {

  stunned: {
    type: "stack",
    modifier: -10,
    attackBonusAgainst: 1,
    trigger: "startTurn",
    test: "resistance",
    onRecover: "exhausted"
  },

  bleeding: {
    type: "stack",
    trigger: "endTurn",
    damagePerStack: 1
  },

  staggered: {
    type: "state"

  },
  poisoned: {
    type: "stack",
    trigger: "endTurn",
    damagePerStack: 1,
    modifier: -10,
    test: "resistance",
    onRecover: "exhausted"
  },

  burning: {
    type: "stack",
    trigger: "endTurn",
    dicePerStack: "d6",
    armor:"lowest"
  },
  exhausted: {
    type: "stack",
    modifier: -10
  },
  deafened: {
    type: "stack",
    modifier: -10,
    attackBonusAgainst : 1,
    trigger: "endTurn",
    removePerTurn: 1
  },
  prone: {
    type: "state"
  },
  shaken: {
    type : "state",
    modifier: -10
  },
  frightened: {
    type: "state",
    modifier: -30,
    trigger: "endTurn",
    test: "calm"
  },
  slowed: {
    type: "stack",
    movementPenalty: 1
  },
  entangled: {
    type: "state",
    trigger: "startTurn",
    test: "strength"
  },
  unconscious: {
    type: "state"
  },
  dying: {
    type: "state",
    trigger: "startTurn",
    test: "dying"
  },
  surprised: {
    type: "state",
    trigger: "endTurn",
    removePerTurn: 1,
    attackBonusAgainst: 3
  }

};

export const WEAPON_TRAITS = {

  defensive: {
    label: "Defensive",
    description: "Grants a bonus to parry."
  },

  fast: {
    label: "Fast",
    description: `Fast weapons are designed to strike with such swiftness that parrying is not an option, leaving the opponent pierced before they have been able to react.
    The wielder of a Fast weapon may choose to attack outside the normal initiative order, whether to strike first, last, or at a moment of their choosing.
    Additionally, a character attacked by a Fast weapon suffers a -1 penalty to parry and evasion.
    Two opponents equipped with Fast weapons act according to the normal initiative order (relative to each other).
    A Fast weapon can never be Slow (the Slow property takes precedence).`
  },

  impaling: {
    label: "Impaling",
    description: `Impaling weapons, provided they hit, inflict a critical hit on any result divisible by 10 (for example: 10, 20, 30, etc.).
    If the impalement comes from a ranged weapon, the ammunition used becomes firmly lodged in the target’s body.
    Arrows and bolts require an Intermediate Healing Test to be removed; bullets require a surgeon (see the Surgery Talent).
    Each arrow or bullet that is not removed prevents the recovery of 1 Wound.`
  },

  light: {
    label: "Light",
    description: "Light weapons are small and easy to handle, allowing you to attack with another Light weapon during the same turn."
  },

  semiLight: {
    label: "Semi-Light",
    description: "Semi-light weapons can only be used to attack alongside a Light weapon during the same turn."
  },

  versatile: {
    label: "Versatile",
    description: `Versatile weapons can be held with two hands in order to apply greater force.
    When used with two hands, their damage increases and this may add or modify the skill(s) that can be used.
    For example, a weapon that uses the Melee (Axe) skill, when wielded with two hands, may also use the Two-Handed Melee skill.
    The value indicated after “Versatile” corresponds to the die used for two-handed damage.`,
    hasValue: true
  }

};

CONFIG.SDP.WEAPON_TRAITS = WEAPON_TRAITS;