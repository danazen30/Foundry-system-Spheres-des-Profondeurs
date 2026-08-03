export class SdpSizeEngine {

  // =========================
  // GET SIZE DATA
  // =========================

  static getSizeData(size) {

    const sizes = CONFIG.SDP.sizes || {};

    return sizes[size] || sizes.average;

  }

  // =========================
  // GET SIZE ORDER
  // =========================

  static getSizeOrder(size) {

    return this.getSizeData(size).order || 0;

  }

  // =========================
  // SIZE DIFFERENCE
  // =========================

  static getSizeDifference(attackerSize, defenderSize) {

    return (
      this.getSizeOrder(attackerSize) -
      this.getSizeOrder(defenderSize)
    );

  }

  // =========================
  // ATTRIBUTE MODIFIERS
  // =========================

  static getAttributeModifiers(size) {

    const data = this.getSizeData(size);

    return {
      strength: data.strength || 0,
      toughness: data.toughness || 0,
      agility: data.agility || 0
    };

  }

  // =========================
  // DAMAGE MULTIPLIER
  // =========================

  static getDamageMultiplier(size) {

    return this.getSizeData(size).damageMultiplier || 1;

  }

// =========================
// MELEE ATTACK MODIFIER
// +10 per size if target larger
// -10 per size if target smaller
// =========================

static getAttackModifier(attackerSize, defenderSize) {

  const attackerOrder = this.getSizeOrder(attackerSize);
  const defenderOrder = this.getSizeOrder(defenderSize);

  return (defenderOrder - attackerOrder) * 10;

}

// =========================
// RANGED MODIFIER
// based ONLY on target size
// =========================

static getRangedAttackModifier(targetSize) {

  const sizeMap = {

    tiny: -30,
    verySmall: -20,
    small: -10,
    average: 0,
    large: 10,
    enormous: 20,
    gigantic: 30

  };

  return sizeMap[targetSize] ?? 0;

}

  // =========================
  // PARRY MODIFIER
  // =========================

static getParryModifier(defenderSize, attackerSize) {

  const diff = this.getSizeDifference(
    attackerSize,
    defenderSize
  );

  // attaquant pas plus grand
  if (diff <= 0) return 0;

  // +1 taille = -10
  if (diff === 1) return -10;

  // puis -20 supplémentaire
  return -10 - ((diff - 1) * 20);

}

  // =========================
  // DEVASTATING
  // =========================

  static grantsDevastating(attackerSize, defenderSize) {

    return this.getSizeDifference(
      attackerSize,
      defenderSize
    ) > 0;

  }

}