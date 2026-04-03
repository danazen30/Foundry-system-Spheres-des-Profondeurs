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

}