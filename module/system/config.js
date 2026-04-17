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
    type: "positive",
    description: `Designed to intercept blows and protect their wielder, these defensive weapons excel at parrying attacks.
    If you use such a weapon, you gain a +1 bonus to your Parry.`,
    hasValue: false
  },

  fast: {
    label: "Fast",
    type: "positive",
    description: `Fast weapons are designed to strike with such swiftness that parrying is not an option, leaving the opponent pierced before they have been able to react.
    The wielder of a Fast weapon may choose to attack outside the normal initiative order, whether to strike first, last, or at a moment of their choosing.
    Additionally, a character attacked by a Fast weapon suffers a -1 penalty to parry and evasion.
    Two opponents equipped with Fast weapons act according to the normal initiative order (relative to each other).
    A Fast weapon can never be Slow (the Slow property takes precedence).`,
    hasValue: false
  },

  impaling: {
    label: "Impaling",
    type: "positive",
    description: `Impaling weapons, provided they hit, inflict a critical hit on any result divisible by 10 (for example: 10, 20, 30, etc.).
    If the impalement comes from a ranged weapon, the ammunition used becomes firmly lodged in the target’s body.
    Arrows and bolts require an Intermediate Healing Test to be removed; bullets require a surgeon (see the Surgery Talent).
    Each arrow or bullet that is not removed prevents the recovery of 1 Wound.`,
    hasValue: false
  },

  light: {
    label: "Light",
    type: "positive",
    description: "Light weapons are small and easy to handle, allowing you to attack with another Light weapon during the same turn.",
    hasValue: false
  },

  semiLight: {
    label: "Semi-Light",
    type: "positive",
    description: "Semi-light weapons can only be used to attack alongside a Light weapon during the same turn.",
    hasValue: false
  },

  versatile: {
    label: "Versatile",
    type: "positive",
    description: `Versatile weapons can be held with two hands in order to apply greater force.
    When used with two hands, their damage increases and this may add or modify the skill(s) that can be used.
    For example, a weapon that uses the Melee (Axe) skill, when wielded with two hands, may also use the Two-Handed Melee skill.
    The value indicated after “Versatile” corresponds to the die used for two-handed damage.`,
    hasValue: true
  },

  stunning: {
    label: "Stunning",
    type: "positive",
    description: `Stunning weapons are particularly effective at forcing enemies to submit.
    The rating corresponds to the bonus you gain when attempting to stun a target.
    If you strike the head with a stunning weapon, perform an opposed test using the melee skill used, based on Strength, against the target’s Resilience.
    If you win the test, your opponent gains the Stunned condition (if the degree of success reaches +6, the target falls unconscious).
    The rating represents any modifiers applied when attempting to stun the target.`,
    hasValue: true
  },

  bleeding: {
    label: "Bleeding",
    type: "positive",
    description: `Designed to tear flesh and draw blood, this weapon excels at inflicting open wounds.
    A weapon with this trait can cause a bleeding effect on the target.
    The rating indicates the minimum result required on a die roll to trigger this effect, and it can stack if multiple dice are rolled.
    For versatile weapons, the corresponding value is indicated after it.`,
    hasValue: true
  },

  impactful: {
    label: "Impactful",
    type: "positive",
    description: `Some weapons can inflict devastating damage due to their weight or design.
    The Impact trait only activates on a charge: if you hit, add the die indicated by the rating to the damage.
    A Harmless weapon can never also be Impact (Harmless takes precedence).
    Impact applies only to melee weapons.`,
    hasValue: true
  },

  entangling: {
    label: "Entangling",
    type: "positive",
    description: `Entangling weapons, often made of long chains ending in weighted heads, are particularly difficult to parry effectively.
    Attacks made with this type of weapon impose a -1 penalty to the target’s Parry, as strikes can wrap over shields, around blades, and have an unpredictable reach.`,
    hasValue: false
  },

  devastating: {
    label: "Devastating",
    type: "positive",
    description: `hese weapons generally deal heavy damage when they hit their target.
    You may reroll one or more damage dice, but you must keep the new results.`,
    hasValue: false
  },

  size: {
    label: "Size",
    type: "positive",
    description: `Forged to split steel and shatter defenses, these cutting weapons slice through armor with terrifying ease.
    If you hit an opponent, you deal 1 point of damage to the struck piece of armor or shield while also wounding the target.`,
    hasValue: true
  },

  finesse: {
    label: "Finesse",
    type: "positive",
    description: `Precise and elegant, these weapons reward skill and agility over sheer brute strength.
    When making an attack with a finesse weapon, you may choose to apply either your Strength or Dexterity modifier to your attack and damage rolls.
    The same modifier applies to both rolls.`,
    hasValue: false
  },

  antiLarge: {
    label: "Anti-Large",
    type: "positive",
    description: `Designed to keep enemies at bay and break even the fiercest charges, these weapons excel against mounted foes and large creatures.
    They allow attacks at a range of 4 meters, or even up to 6 meters.
    They gain a +2 bonus to hit against larger creatures, in addition to the base bonus.
    When a mounted character charges with such a weapon, its value is doubled (double both the dice and the bonuses; for example, 1d6 +2 becomes 2d6 +4).`,
    hasValue: false
  },

  trapBlade: {
    label: "Trap Blade",
    type: "positive",
    description: `Each time you defend with such a weapon and the opponent’s attack fails, you may perform an opposed Strength test with a +20 bonus.
    If the test succeeds, you may either disarm your opponent or remove 1 point of durability from their weapon.
    On a critical success, you may remove 5 durability points from their weapon or send it flying far away.`,
    hasValue: false
  },

  entangling: {
    label: "Entangling",
    type: "positive",
    description: `Flexible and insidious, your weapon coils around its targets to hinder their movements.
    Any opponent successfully hit by this weapon gains the Entangled condition, with a Strength value equal to your Strength characteristic.
    While you are entangling an opponent, you cannot use the weapon to make other attacks.
    You may end this effect at any time.`,
    hasValue: false
  },

  precise: {
    label: "Precise",
    type: "positive",
    description: `Deadly accurate, this weapon is designed to strike its target where others would fail.
    You gain a +1 SL bonus to your attack roll.`,
    hasValue: false
  },

  protectrice: {
    label: "Protectrice",
    type: "positive",
    description: `A true barrier between you and danger, this weapon surrounds you with constant protection against incoming attacks.
    If you use this weapon to defend yourself, you are considered to benefit from its PA rating on all parts of your body.
    If your weapon has a Protective rating of 2 or higher (for example: Protective 2 or Protective 3), you may also oppose projectiles coming from your line of sight.
    The attacker must meet or exceed the weapon's Protective rating in DR to successfully hit you.`,
    hasValue: true
  },

  pistol: {
    label: "Pistol",
    type: "positive",
    description: `Small and quick to use, it fits easily in one hand and can be drawn in an instant, even in the thick of melee.
    You may use this weapon to attack in close combat, applying the rules of melee combat.`,
    hasValue: false
  },

  explosion: {
    label: "Explosion",
    type: "positive",
    description: `Designed to unleash a sudden blast, this weapon spreads its destructive force to all those nearby.
    All characters within a number of meters equal to the rating from the point of impact suffer the weapon’s damage and gain all conditions inflicted by it.`,
    hasValue: true
  },

  blackPowder: {
    label: "Black Powder",
    type: "positive",
    description: `The thunder of gunfire, followed by smoke and confusion, is enough to shake even the steadiest minds.
    If you are targeted by a black powder weapon, you must succeed on an Easy (+20) Composure Test or gain the Frightened condition, even if the shot misses you.
    If it is not your first time facing it, or if you expected it, you instead gain the Shaken condition.`,
    hasValue: false
  },

  imprecise: {
    label: "Imprecise",
    type: "negative",
    description: `Heavy or difficult to handle, these weapons sacrifice accuracy for raw power or unwieldy design.
    You suffer a -1 DR penalty when using this weapon to attack.
    An Imprecise weapon can never also be Precise (Imprecise takes precedence).`,
    hasValue: false
  },

  inoffensive: {
    label: "Inoffensive",
    description: `ll-suited for piercing defenses, these weapons struggle to breach even the most basic armor.
    All AP values are doubled against Harmless weapons.
    Additionally, you do not automatically inflict the minimum of 1 Wound on a successful hit in combat.`,
    hasValue: false,
    type: "negative"
  },

  slow: {
    label: "Slow",
    description: `Heavy and cumbersome, these weapons require time and commitment to wield effectively.
    Characters using Slow weapons always strike last in a round, regardless of Initiative order.
    Additionally, you suffer a -1 penalty to your attack rolls.`,
    hasValue: false,
    type: "negative"
  },

  reload: {
  label: "Reload",
  description: `This weapon must be reloaded after use.
  The rating indicates how many actions are required to reload it.
  A weapon must be loaded before it can be used to attack.`,
  hasValue: true,
  type: "negative"
},

};

CONFIG.SDP.WEAPON_TRAITS = WEAPON_TRAITS;