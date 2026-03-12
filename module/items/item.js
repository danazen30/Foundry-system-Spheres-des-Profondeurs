export class SdpItem extends Item {

  prepareDerivedData(){

    const system = this.system;

    if(this.type === "armor"){

      system.AP ??= {
        head: 0,
        body: 0,
        leftArm: 0,
        rightArm: 0,
        leftLeg: 0,
        rightLeg: 0
      };

    }

  }

}