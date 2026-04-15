import { SdpTraitEngine } from "../system/trait-engine.js";

export class SdpDefense {

  static getDefense(target){

    let parry = target.system.derived.parry.value;
    const evasion = target.system.derived.evasion.value;

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