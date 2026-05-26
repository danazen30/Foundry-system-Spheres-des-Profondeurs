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
// SUCCESS LEVEL BONUS
// =====================

static applySuccessBonus(SL, actor, selectedTalents = []){

  if (SL <= 0) return SL;

let bonus = 0;

for (const item of actor.items){

  if (item.type !== "talent") continue;

  // ✔ DOIT être sélectionné
  if (!selectedTalents.includes(item.id)) continue;

  const level = Number(item.system.advances || 1);

  for (const effect of item.effects){

    if (effect.disabled) continue;

    for (const change of effect.changes){

      if (change.key !== "system.modifiers.successBonus") continue;

      const value = Number(change.value || 0);

      bonus += value * level;
    }
  }
}

return SL + bonus;

}

// =====================
// SL LABEL
// =====================

static getSLLabel(SL){

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
        SL: 1 // crit → SL positif
      };
    }
  }

  return { success, SL };
}

}
