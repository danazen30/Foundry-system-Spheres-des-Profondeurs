export const SDP = {};

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
  confused: "Confused"

};

SDP.turnConditions = {

  bleeding: true,
  burning: true,
  stunned: true

};

SDP.conditionConfig = {

  stunned: {
    stackable: true,
    modifier: -10,
    trigger: "endTurn",
    test: "resistance",
    onRecover: "exhausted"
  },

  bleeding: {
    stackable: true,
    trigger: "startTurn",
    damagePerStack: 1
  },

  burning: {
    stackable: true,
    trigger: "startTurn",
    dicePerStack: "1d6"
  }

};