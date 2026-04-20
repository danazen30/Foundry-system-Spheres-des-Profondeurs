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

_onCreate(data, options, userId) {
  super._onCreate(data, options, userId);

  if (this.type === "armor") {
    this._syncArmorEffects();
  }
}

async _syncArmorEffects() {

  if (this.type !== "armor") return;

  const isWorn = this.system.worn?.value;

  for (const effect of this.effects) {

    await effect.update({
      disabled: !isWorn
    });

  }

}

async update(data, options) {

  const result = await super.update(data, options);

  if (this.type === "armor") {

    const wornChanged = foundry.utils.hasProperty(data, "system.worn");

    if (wornChanged) {
      await this._syncArmorEffects();
    }

  }

  return result;
}

}
