import { SdpTraitEngine } from "../system/trait-engine.js";
import { SdpSizeEngine } from "../system/size-engine.js";

export class SdpDefense {

  static getDefense(target, attacker = null){

    let parry = target.system.derived.parry.value;
    const evasion = target.system.derived.evasion.value;

    // =========================
// SIZE MODIFIER
// =========================

let sizeModifier = 0;

if (attacker) {

  sizeModifier = SdpSizeEngine.getParryModifier(
    target.system.size,
    attacker.system.size
  );

  parry += Math.floor(sizeModifier / 10);

  console.log("SDP | SIZE MODIFIER (DEFENSE)", {
    defender: target.name,
    attacker: attacker.name,
    modifier: sizeModifier,
    finalParry: parry
  });

}

    // =========================
    // APPLY DEFENSE TRAITS
    // =========================

    const defenseWeapons = target.items.filter(i =>
      i.type === "weapon" &&
      i.system.equipped &&
      i.system.isDefenseWeapon
    );

    for (const weapon of defenseWeapons) {

      const data = { parry };

      SdpTraitEngine.applyDefenseTraits({
        actor: target,
        weapon,
        data
      });

      parry = data.parry;
    }

    console.log("=== FINAL DEFENSE ===", {
      actor: target.name,
      parry,
      evasion
    });

    return Math.max(parry, evasion);

  }

}