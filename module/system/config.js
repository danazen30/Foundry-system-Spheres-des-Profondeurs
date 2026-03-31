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