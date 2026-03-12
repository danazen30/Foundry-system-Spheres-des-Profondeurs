export class SdpDefense {

  static getDefense(target){

    const parry = target.system.derived.parry.value;
    const evasion = target.system.derived.evasion.value;

    return Math.max(parry, evasion);

  }

}