const DEFAULT_ITEM_IMAGES = {

  weapon:
    "systems/sdp/assets/icons/items/weapons.png",

  armor:
    "systems/sdp/assets/icons/items/armors.png",

  talent:
    "systems/sdp/assets/icons/items/talent.png",

  skill:
    "systems/sdp/assets/icons/items/skills.png",

  spell:
    "systems/sdp/assets/icons/items/spells.png",

  injury:
    "systems/sdp/assets/icons/items/injury.png",

  disease:
    "systems/sdp/assets/icons/items/diseases.png",

  ammunition:
    "systems/sdp/assets/icons/items/ammunitions.png",

  clothing:
    "systems/sdp/assets/icons/items/clothings.png",

  container:
    "systems/sdp/assets/icons/items/containers.png",

  career:
    "systems/sdp/assets/icons/items/careers.png",

  specie:
    "systems/sdp/assets/icons/items/species.png",

  sign:
    "systems/sdp/assets/icons/items/sign.png",

  trait:
    "systems/sdp/assets/icons/items/traits.png"

};

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

async _onCreate(data, options, userId) {

  console.log("ON CREATE");

  console.log(this.system);

  await super._onCreate(
    data,
    options,
    userId
  );

  // =========================
  // DEFAULT IMAGE
  // =========================

  const defaultImg =
    DEFAULT_ITEM_IMAGES[this.type];

  const hasDefaultCoreIcon =
    !this.img ||
    this.img === "icons/svg/item-bag.svg";

  if (
    defaultImg &&
    hasDefaultCoreIcon
  ) {

    await this.update({
      img: defaultImg
    });

  }

  // =========================
  // EFFECTS
  // =========================

  await this._syncActiveEffects();

}

async update(data, options) {

  const result =
    await super.update(data, options);

  const equippedChanged =
    foundry.utils.hasProperty(
      data,
      "system.equipped"
    );

  const wornChanged =
    foundry.utils.hasProperty(
      data,
      "system.worn.value"
    );

  if (
    equippedChanged ||
    wornChanged
  ) {

    await this._syncActiveEffects();

  }

  return result;

}

async _syncActiveEffects() {

  // =========================
  // DETERMINE ACTIVE STATE
  // =========================

  let active = true;

  switch (this.type) {

    case "weapon":
    case "clothing":
      active =
        this.system.equipped === true;
      break;

    case "armor":
      active =
        this.system.worn?.value === true;
      break;

    default:
      return;

  }

  // =========================
  // SYNC EFFECTS
  // =========================

  for (const effect of this.effects) {

    await effect.update({
      disabled: !active
    });

  }

}

}