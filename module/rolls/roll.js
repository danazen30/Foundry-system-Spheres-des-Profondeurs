import { SdpRollApp } from "./roll-app.js";

export class SdpRoll {

  static async openDialog(data){
    const app = new SdpRollApp(data);
    app.render(true);
  }

  // 🔥 AJOUT CRITIQUE (MANQUANT)
  static getCritical(result){

    return {
      success: result % 11 === 0 && result <= 55,
      failure: result % 11 === 0 && result >= 66
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

if (SL >= 6) return "Spectacular Success";
if (SL >= 4) return "Impressive Success";
if (SL >= 2) return "Success";
if (SL >= 0) return "Minor Success";

if (SL <= -6) return "Spectacular Failure";
if (SL <= -4) return "Impressive Failure";
if (SL <= -2) return "Failure";

return "Minor Failure";
}

}
