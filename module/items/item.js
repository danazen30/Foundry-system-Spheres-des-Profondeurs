import { getLocalizedItemName } from "../system/item-localization.js";

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

  ability:
    "systems/sdp/assets/icons/items/abilities.png",

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

_preparePhysicalFields(system) {

  if (typeof system.quantity === "number") {
    system.quantity = { value: system.quantity };
  }

  system.quantity ??= { value: 1 };

  if (system.quantity.value !== undefined) {
    system.quantity.value =
      Number(system.quantity.value) || 0;
  }

  if (typeof system.encumbrance === "number") {
    system.encumbrance = { value: system.encumbrance };
  }

  system.encumbrance ??= { value: 0 };

  if (system.encumbrance.value !== undefined) {
    system.encumbrance.value =
      Number(system.encumbrance.value) || 0;
  }

  system.price ??= {};

  for (const coin of [
    "platinum",
    "gold",
    "silver",
    "copper"
  ]) {

    const raw =
      system.price[coin];

    system.price[coin] =
      raw === "" ||
      raw === null ||
      raw === undefined
        ? 0
        : Number(raw) || 0;

  }

}

_prepareWeaponSystem(system) {

  this._preparePhysicalFields(system);

  system.category ??= "melee";
  system.natural ??= false;
  system.skill ??= "melee";
  system.weaponGroup ??= "basic";
  system.handedness ??= "one";
  system.equipped ??= false;
  system.offhand ??= false;
  system.consumesAmmo ??= true;
  system.forceReload ??= false;
  system.isDefenseWeapon ??= false;
  system.reach ??= 0;
  system.traits ??= [];
  system.itemTraits ??= [];

}

_prepareSkillSystem(system) {

  const advancedRaw = system.advanced;
  const typeRaw = system.type;

  if (
    advancedRaw === true ||
    advancedRaw === "true"
  ) {
    system.advanced = true;
    system.type = "advanced";
    return;
  }

  if (
    advancedRaw === false ||
    advancedRaw === "false"
  ) {
    system.advanced = false;
    system.type = "basic";
    return;
  }

  if (typeRaw === "advanced") {
    system.advanced = true;
    system.type = "advanced";
    return;
  }

  system.advanced = false;
  system.type = "basic";

}

_getSkillDefaultUpdates() {

  if (this.type !== "skill") return {};

  const system = this.system;

  if (
    system.advanced === true ||
    system.advanced === "true" ||
    system.type === "advanced"
  ) {
    return {};
  }

  if (
    system.advanced === false ||
    system.advanced === "false" ||
    system.type === "basic"
  ) {
    return {};
  }

  return {
    "system.advanced": false,
    "system.type": "basic"
  };

}

_getPhysicalDefaultUpdates() {

  const system = this.system;
  const updates = {};

  if (
    typeof system.quantity === "number" ||
    system.quantity?.value === undefined
  ) {

    updates["system.quantity"] = {
      value:
        Number(
          typeof system.quantity === "number"
            ? system.quantity
            : system.quantity?.value
        ) || 1
    };

  }

  if (
    typeof system.encumbrance === "number" ||
    system.encumbrance?.value === undefined
  ) {

    updates["system.encumbrance"] = {
      value:
        Number(
          typeof system.encumbrance === "number"
            ? system.encumbrance
            : system.encumbrance?.value
        ) || 0
    };

  }

  const price = system.price ?? {};

  for (const coin of [
    "platinum",
    "gold",
    "silver",
    "copper"
  ]) {

    const raw = price[coin];

    if (
      raw === undefined ||
      raw === null ||
      raw === ""
    ) {

      updates[`system.price.${coin}`] = 0;

    }

  }

  return updates;

}

_getWeaponDefaultUpdates() {

  if (this.type !== "weapon") return {};

  const system = this.system;
  const updates = {
    ...this._getPhysicalDefaultUpdates()
  };

  const ensure = (path, value) => {

    const key =
      path.replace(/^system\./, "");

    const current =
      foundry.utils.getProperty(
        system,
        key
      );

    if (
      current === undefined ||
      current === null ||
      current === ""
    ) {

      updates[path] = value;

    }

  };

  ensure("system.category", "melee");
  ensure("system.skill", "melee");
  ensure("system.weaponGroup", "basic");
  ensure("system.handedness", "one");
  ensure("system.equipped", false);
  ensure("system.offhand", false);
  ensure("system.consumesAmmo", true);
  ensure("system.forceReload", false);
  ensure("system.isDefenseWeapon", false);
  ensure("system.reach", 0);
  ensure("system.traits", []);
  ensure("system.itemTraits", []);

  return updates;

}

_usesPhysicalFields() {

  return [
    "weapon",
    "armor",
    "clothing",
    "container",
    "ammunition",
    "possession",
    "currency"
  ].includes(this.type);

}

_getArmorDefaultUpdates() {

  if (this.type !== "armor") return {};

  const system = this.system;

  const updates = {
    ...this._getPhysicalDefaultUpdates()
  };

  if (
    typeof system.worn === "boolean" ||
    system.worn?.value === undefined
  ) {

    updates["system.worn"] = {
      value: !!(
        typeof system.worn === "boolean"
          ? system.worn
          : system.worn?.value
      )
    };

  }

  return updates;

}

_getItemDefaultUpdates() {

  if (this.type === "weapon") {
    return this._getWeaponDefaultUpdates();
  }

  if (this.type === "armor") {
    return this._getArmorDefaultUpdates();
  }

  if (this.type === "skill") {
    return this._getSkillDefaultUpdates();
  }

  if (this._usesPhysicalFields()) {
    return this._getPhysicalDefaultUpdates();
  }

  return {};

}

prepareDerivedData(){

  const system = this.system;

  if (this.type === "armor") {

    system.AP ??= {
      head: 0,
      body: 0,
      leftArm: 0,
      rightArm: 0,
      leftLeg: 0,
      rightLeg: 0
    };

    if (typeof system.worn === "boolean") {
      system.worn = { value: system.worn };
    }

    system.worn ??= { value: false };
    system.worn.value = !!system.worn.value;

  }

  if (this.type === "weapon") {
    this._prepareWeaponSystem(system);
  }
  else if (this.type === "ability") {
    system.passive ??= false;
    system.passive = !!system.passive;
    system.ignoreArmor ??= false;
    system.ignoreArmor = !!system.ignoreArmor;
    system.damageType ??= "special";
    system.damageType = String(system.damageType || "special");
    system.maintainRange ??= {};
    system.maintainRange.value ??= "";
    system.maintainRange.value = String(system.maintainRange.value ?? "");
  }
  else if (this.type === "spell") {
    system.ignoreArmor ??= false;
    system.ignoreArmor = !!system.ignoreArmor;
    system.resolveMacro ??= false;
    system.resolveMacro = !!system.resolveMacro;
    system.damageType ??= "special";
    system.damageType = String(system.damageType || "special");
    system.hitLocationMode ??= {};
    system.hitLocationMode.value =
      system.hitLocationMode.value === "fixed" ? "fixed" : "random";
    system.fixedHitLocation ??= {};
    system.fixedHitLocation.value =
      system.fixedHitLocation.value
        ? String(system.fixedHitLocation.value)
        : "body";
    system.movable ??= {};
    system.movable.value ??= "";
    system.movable.value = String(system.movable.value ?? "");
    system.maintainRange ??= {};
    system.maintainRange.value ??= "";
    system.maintainRange.value = String(system.maintainRange.value ?? "");
    const raw = system.overcastSpecialEffects?.value;
    system.overcastSpecialEffects ??= {};
    if (!Array.isArray(raw)) {
      if (raw && typeof raw === "object") {
        system.overcastSpecialEffects.value = Object.keys(raw)
          .sort((a, b) => Number(a) - Number(b))
          .map((key) => raw[key])
          .filter((entry) => entry && typeof entry === "object");
      } else {
        system.overcastSpecialEffects.value = [];
      }
    }
    system.overcastSpecialEffects.value =
      system.overcastSpecialEffects.value.map((entry) => ({
        label: entry?.label ?? "",
        start:
          entry?.start !== undefined && entry?.start !== null && entry?.start !== ""
            ? String(entry.start)
            : "0",
        value:
          entry?.value !== undefined && entry?.value !== null
            ? String(entry.value)
            : "1"
      }));
  }
  else if (this.type === "ammunition") {
    this._preparePhysicalFields(system);
    system.weaponGroup ??= "";
    system.traits ??= [];
    system.damage ??= {
      base: { value: 0 },
      dice: { value: "" }
    };
    system.damage.base ??= { value: 0 };
    system.damage.dice ??= { value: "" };
    system.rangeModifier ??= 0;
  }
  else if (this.type === "skill") {
    this._prepareSkillSystem(system);
  }
  else if (this._usesPhysicalFields()) {
    this._preparePhysicalFields(system);
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

  // Only the creating user may write defaults / sync effects
  if (userId !== game.user.id) return;

  const updates = {
    ...this._getItemDefaultUpdates()
  };

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

    updates.img = defaultImg;

  }

  if (Object.keys(updates).length) {
    await this.update(updates);
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

  const advancesChanged =
    foundry.utils.hasProperty(
      data,
      "system.advances"
    );

  if (advancesChanged) {
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

    case "talent":
      active =
        Number(this.system.advances || 0) > 0;
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

get localizedName() {

  return getLocalizedItemName(
    this.type,
    this.system?.key,
    this.name
  );

}

}