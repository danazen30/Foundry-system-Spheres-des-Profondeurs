import { SdpRollApp } from "./roll-app.js";

export class SdpRoll {

  static async openDialog(data){
    const app = new SdpRollApp(data);
    app.render(true);
  }

  // 🔥 AJOUT CRITIQUE (MANQUANT)
static getCritical(result, target, options = {}) {

  const {
    critFailBase = 96,
    critFailMax = 100,
    critSuccessBase = 5
  } = options;

  // =========================
  // 🔥 HARD RULE
  // =========================

  if (result === 100) {
    return {
      success: false,
      failure: true
    };
  }

  // =========================
  // FAILURE
  // =========================

  let critFailMin;

  if (target >= critFailMax) {
    critFailMin = critFailMax;
  }
  else if (target >= critFailBase) {
    critFailMin = target + 1;
  }
  else {
    critFailMin = critFailBase;
  }

  // =========================
  // SUCCESS
  // =========================

  let critSuccessMax;

  if (target <= 5) {
  critSuccessMax = target;
}
  else if (target <= critSuccessBase) {
    critSuccessMax = target;
  }
  else {
    critSuccessMax = critSuccessBase;
  }

  return {
    success: result >= 1 && result <= critSuccessMax,
    failure: result >= critFailMin && result <= critFailMax
  };
}

  // =====================
// TALENT SL MODIFIERS
// =====================

static _getTalentEffectBonus(actor, selectedTalents, effectKey) {

  let bonus = 0;

  for (const item of actor.items) {

    if (item.type !== "talent") continue;
    if (!selectedTalents.includes(item.id)) continue;

    const level = Number(item.system.advances || 1);

    for (const effect of item.effects) {

      if (effect.disabled) continue;

      for (const change of effect.changes) {

        if (change.key !== effectKey) continue;

        bonus += Number(change.value || 0) * level;
      }
    }
  }

  return bonus;
}

static applySLBonus(SL, actor, selectedTalents = []) {

  return SL + this._getTalentEffectBonus(
    actor,
    selectedTalents,
    "system.modifiers.slBonus"
  );
}

static applySuccessBonus(SL, actor, selectedTalents = []) {

  if (SL <= 0) return SL;

  return SL + this._getTalentEffectBonus(
    actor,
    selectedTalents,
    "system.modifiers.successBonus"
  );
}

static applyTalentSLModifiers(SL, actor, selectedTalents = []) {

  SL = this.applySLBonus(SL, actor, selectedTalents);
  return this.applySuccessBonus(SL, actor, selectedTalents);
}

static getAttackDamageBonus(actor, selectedTalents = []) {

  return this._getTalentEffectBonus(
    actor,
    selectedTalents,
    "system.modifiers.attackDamageBonus"
  );

}

static getLocationPenaltyReduction(actor, selectedTalents = []) {

  return this._getTalentEffectBonus(
    actor,
    selectedTalents,
    "system.modifiers.locationPenaltyReduction"
  );

}

static getRangePenaltyReduction(actor, selectedTalents = []) {

  return this._getTalentEffectBonus(
    actor,
    selectedTalents,
    "system.modifiers.rangePenaltyReduction"
  );

}

static getTargetBonus(actor, selectedTalents = []) {

  return this._getTalentEffectBonus(
    actor,
    selectedTalents,
    "system.modifiers.targetBonus"
  );

}

static applyLocationModifierReduction(modifier, reduction = 0) {

  const value = Number(modifier || 0);

  if (value >= 0 || !reduction) {
    return value;
  }

  return Math.min(
    value + Number(reduction),
    0
  );

}

static adjustDynamicModifiersForRange(
  modifiers,
  reduction = 0
) {

  if (!reduction || !modifiers?.length) {
    return modifiers;
  }

  const rangePrefix =
    game.i18n.localize("SDP.Range");

  return modifiers.map(m => {

    if (!String(m.label || "").startsWith(rangePrefix)) {
      return m;
    }

    return {
      ...m,
      value: this.applyLocationModifierReduction(
        m.value,
        reduction
      )
    };

  });

}

static getMeleeLocationModifier(locationMod, reductionRanged = 0) {

  const meleeMod = Math.floor(Number(locationMod || 0) / 10);

  if (meleeMod >= 0 || !reductionRanged) {
    return meleeMod;
  }

  const meleeReduction = Math.floor(Number(reductionRanged) / 10);

  if (!meleeReduction) {
    return meleeMod;
  }

  return Math.min(
    meleeMod + meleeReduction,
    0
  );

}

// =====================
// SL LABEL
// =====================

static formatSL(SL, success = null) {

  if (SL === 0 && success === false) {
    return "-0";
  }

  return String(SL);

}

static getSLLabel(SL, success = null){

if (SL === 0 && success === false) {
  return game.i18n.localize("SDP.MinorFailure");
}

if (SL >= 6) {
  return game.i18n.localize("SDP.SpectacularSuccess");
}

if (SL >= 4) {
  return game.i18n.localize("SDP.ImpressiveSuccess");
}

if (SL >= 2) {
  return game.i18n.localize("SDP.Success");
}

if (SL >= 0) {
  return game.i18n.localize("SDP.MinorSuccess");
}

if (SL <= -6) {
  return game.i18n.localize("SDP.SpectacularFailure");
}

if (SL <= -4) {
  return game.i18n.localize("SDP.ImpressiveFailure");
}

if (SL <= -2) {
  return game.i18n.localize("SDP.Failure");
}

return game.i18n.localize("SDP.MinorFailure");
}

static getOvercast(SL){

  if (SL <= 0) return 0;

  return Math.floor(SL / 2);

}

static applyDynamicResult(result, target, success, SL){

  // =========================
  // HIGH TARGET (>=100)
  // =========================
 const critFailBase = 96;

if (target >= critFailBase && result >= critFailBase){

  if (result < 100){
    return {
      success: false,
      SL: 0
    };
  }
}

  // =========================
  // LOW TARGET (<=0)
  // =========================
  if (target <= 0){

    if (result >= 2 && result <= 5){
      return {
        success: true,
        SL: 0
      };
    }

    if (result === 1){
      return {
        success: true,
        SL: 1
      };
    }
  }

  return { success, SL };
}

}
