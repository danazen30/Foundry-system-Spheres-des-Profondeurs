import { SdpActorInventory } from "./actor-inventory.js";
import { SdpSizeEngine } from "../system/size-engine.js";
import { SdpDamage } from "../combat/damage.js";
import { SdpMount } from "../system/mount-utils.js";
import {
  actorHasWeaponSkill,
  findActorSkillForRef,
  parseWeaponSkillRefs
} from "../system/weapon-skill-utils.js";
import {
  hasWeaponDamageStatBonus,
  resolveWeaponDamageBase
} from "../system/formula-utils.js";
import {
  CREATURE_TRAIT_KEYS,
  getActiveTraitAttackBonus,
  getActiveTraitAttributeBonus,
  getTraitIndexTotal
} from "../system/creature-trait-utils.js";

export class SdpActor extends Actor {

  prepareBaseData() {
    super.prepareBaseData();

    const system = this.system;

    // =====================
    // ATTRIBUTES DEFAULT
    // =====================

    const defaultAttributes = {
      meleeAbility: { label: game.i18n.localize("SDP.AttributeAbbr.MeleeAbility"), name: game.i18n.localize("SDP.Attribute.Strength"), initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      rangedAbility: { label: game.i18n.localize("SDP.AttributeAbbr.RangedAbility"), name: game.i18n.localize("SDP.Attribute.RangedAbility"),initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      strength: { label: game.i18n.localize("SDP.AttributeAbbr.Strength"), name: game.i18n.localize("SDP.Attribute.Strength"),initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      toughness: { label: game.i18n.localize("SDP.AttributeAbbr.Toughness"), name: game.i18n.localize("SDP.Attribute.Toughness"),initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      initiative: { label: game.i18n.localize("SDP.AttributeAbbr.Initiative"), name: game.i18n.localize("SDP.Attribute.Initiative"),initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      agility: { label: game.i18n.localize("SDP.AttributeAbbr.Agility"), name: game.i18n.localize("SDP.Attribute.Agility"),initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      dexterity: { label: game.i18n.localize("SDP.AttributeAbbr.Dexterity"), name: game.i18n.localize("SDP.Attribute.Dexterity"),initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      intelligence: { label: game.i18n.localize("SDP.AttributeAbbr.Intelligence"), name: game.i18n.localize("SDP.Attribute.Intelligence"),initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      willpower: { label: game.i18n.localize("SDP.AttributeAbbr.Willpower"), name: game.i18n.localize("SDP.Attribute.Willpower"),initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 },
      charisma: { label: game.i18n.localize("SDP.AttributeAbbr.Charisma"), name: game.i18n.localize("SDP.Attribute.Charisma"),initial: 20, advances: 0, modifier: 0, levelBonus: 0, value: 20, bonus: 2 }
    };

    system.attributes ??= {};

    for (let [key, defaults] of Object.entries(defaultAttributes)) {

      const attr = system.attributes[key] ??= {};

      attr.label ??= defaults.label;
      attr.name ??= defaults.name;
      attr.initial ??= defaults.initial;
      attr.advances ??= defaults.advances;
      attr.modifier ??= defaults.modifier;
      attr.levelBonus ??= defaults.levelBonus;

    }

    // =====================
    // DERIVED DEFAULT
    // =====================

    system.derived ??= {};

    system.derived.woundThreshold ??= { value: 0 };
    system.derived.evasion ??= { value: 0 };
    system.derived.parry ??= { value: 0 };
    system.derived.attack ??= { value: 0 };
    system.derived.carryingCapacity ??= { value: 0 };

    // =====================
    // HEALTH DEFAULT
    // =====================

    system.health ??= {};
    system.health.value ??= 8;
    system.health.max ??= 8;
    system.health.levelBonus ??= 0;

    // =====================
    // RESOURCES DEFAULT
    // =====================

    system.resources ??= {};
    system.resources.mana ??= {};
    system.resources.mana.value ??= 0;

    system.resources.movement ??= {};
    system.resources.movement.value ??= 4;
    system.resources.movement.current ??= 4;
    system.resources.movement.walk ??= 0;
    system.resources.movement.run ??= 0;
    system.resources.corruption ??= {};
    system.resources.corruption.value ??= 0;
    system.resources.corruption.max ??= 0;

    // =====================
    // CUSTOM
    // =====================

    system.custom ??= {};
    system.custom.offhandReduction ??= 0;
    system.custom.manaMultiplierBonus ??= 0;

    system.custom.healthBonus ??= 0;
system.custom.manaBonus ??= 0;
    system.custom.meleeActionBonus ??= 0;
    system.custom.parryBonus ??= 0;
    system.custom.evasionBonus ??= 0;
    system.custom.mountedEvasionPenaltyReduction ??= 0;
    system.custom.combatInitiativeBonus ??= 0;
    system.custom.reflexesValue ??= 0;
    system.custom.injurySeverityBonus ??= 0;
    system.custom.toughnessHealthMultiplier ??= 0;
    system.custom.encumbranceStatMultiplier ??= 0;
    system.custom.woundThresholdModifier ??= 0;
    system.custom.carryingCapacityModifier ??= 0;

    system.details ??= {};

    system.details.size ??= {};
    if (typeof system.details.size === "string") {
      system.details.size = { value: system.details.size };
    }

    // Canonical: details.size.value (character / vehicle / creature sheet).
    // Legacy creatures only stored system.size — keep that if details is still default.
    const sourceDetailsSize = this._source?.system?.details?.size;
    const sourceDetailsValue =
      typeof sourceDetailsSize === "string"
        ? sourceDetailsSize
        : sourceDetailsSize?.value;
    const sourceFlatSize =
      typeof this._source?.system?.size === "string"
        ? this._source.system.size
        : undefined;

    let resolvedSize = "average";
    if (sourceDetailsValue && sourceDetailsValue !== "average") {
      resolvedSize = sourceDetailsValue;
    } else if (sourceFlatSize) {
      resolvedSize = sourceFlatSize;
    } else if (sourceDetailsValue) {
      resolvedSize = sourceDetailsValue;
    }

    system.details.size.value = resolvedSize;
    // Keep system.size in sync for combat code that still reads it.
    system.size = resolvedSize;

    if (this.type === "creature") {
      system.description ??= { value: "" };
      if (typeof system.description === "string") {
        system.description = { value: system.description };
      }
      system.description.value ??= "";

      system.naturalArmor ??= { value: 0 };
      if (typeof system.naturalArmor === "number") {
        system.naturalArmor = { value: system.naturalArmor };
      }
      system.naturalArmor.value = Number(system.naturalArmor.value || 0);
    }

system.combat ??= {};

system.combat.defenseMode ??= "auto";

    system.conditionOverride ??= {};

for (const item of this.items) {

  if (item.type === "armor") {
    item.system.worn ??= { value: false };
  }

  if (item.type === "trait") {
    item.system.active ??= false;
  }

  // 🔥 FIX POSSESSION
  if (item.type === "possession") {
    item.system.encumbrance ??= { value: 0 };
    item.system.quantity ??= { value: 1 };
  }
}

  }

getSign() {
  return this.items.find(i => i.type === "sign");
}

getSignEffects() {

  const sign = this.getSign();
  if (!sign) return {};

  const level = this.system.details.level || 0;
  const levels = sign.system.levels || {};

  let effects = {
  damageBonus: null,
  inspirationDice: null
};

  const lvl = levels[level];

if (!lvl) return effects;

// =========================
// DAMAGE BONUS (OVERRIDE)
// =========================

if (lvl.damageBonus) {
  effects.damageBonus = lvl.damageBonus;
}

// =========================
// INSPIRATION DICE (OVERRIDE)
// =========================

if (lvl.inspirationDice) {
  effects.inspirationDice = lvl.inspirationDice;
}

  return effects;
  }

  _prepareVehicleDerivedData() {
    const system = this.system;

    system.custom ??= {};
    system.bonuses ??= {};

    system.description ??= { value: "" };
    if (typeof system.description === "string") {
      system.description = { value: system.description };
    }
    system.description.value ??= "";

    system.details ??= {};
    system.details.vehicleType ??= { value: "" };
    if (typeof system.details.vehicleType === "string") {
      system.details.vehicleType = { value: system.details.vehicleType };
    }
    system.details.vehicleType.value ??= "";

    system.details.size ??= { value: "average" };
    if (typeof system.details.size === "string") {
      system.details.size = { value: system.details.size };
    }
    system.details.size.value ??= "average";

    // Keep combat helpers (size engine / damage) in sync with sheet field.
    system.size = system.details.size.value;

    system.details.gmNotes ??= { value: "" };
    system.details.playerNotes ??= { value: "" };
    if (typeof system.details.gmNotes === "string") {
      system.details.gmNotes = { value: system.details.gmNotes };
    }
    if (typeof system.details.playerNotes === "string") {
      system.details.playerNotes = { value: system.details.playerNotes };
    }
    system.details.gmNotes.value ??= "";
    system.details.playerNotes.value ??= "";

    system.price ??= {};
    system.price.platinum ??= 0;
    system.price.gold ??= 0;
    system.price.silver ??= 0;
    system.price.copper ??= 0;

    system.armor ??= { value: 0 };
    if (typeof system.armor === "number") {
      system.armor = { value: system.armor };
    }
    system.armor.value = Math.max(
      0,
      Number(system.armor.value) || 0
    );

    // Strict booleans only — never treat objects as selected.
    system.armorTraits = SdpDamage.normalizeVehicleArmorTraits(
      system.armorTraits
    );

    for (const key of ["platinum", "gold", "silver", "copper"]) {
      const priceValue = system.price?.[key];
      system.price[key] = typeof priceValue === "object"
        ? Math.max(0, Number(priceValue?.value) || 0)
        : Math.max(0, Number(priceValue) || 0);
    }

    system.woundThreshold ??= { value: 3 };
    if (typeof system.woundThreshold === "number") {
      system.woundThreshold = { value: system.woundThreshold };
    }
    system.woundThreshold.value = Math.max(
      0,
      Number(system.woundThreshold.value) || 0
    );

    system.criticalWounds ??= { value: 0, max: 3 };
    if (typeof system.criticalWounds === "number") {
      system.criticalWounds = { value: system.criticalWounds, max: 3 };
    }
    system.criticalWounds.max = Math.max(
      1,
      Number(system.criticalWounds.max) || 3
    );
    system.criticalWounds.value = Math.max(
      0,
      Math.min(
        system.criticalWounds.max,
        Number(system.criticalWounds.value) || 0
      )
    );

    system.capacity ??= { value: 0 };
    if (typeof system.capacity === "number") {
      system.capacity = { value: system.capacity };
    }
    system.capacity.value ??= 0;

    system.crew ??= {};
    system.crew.drivers ??= { value: 1 };
    system.crew.passengers ??= { value: 0 };
    if (typeof system.crew.drivers === "number") {
      system.crew.drivers = { value: system.crew.drivers };
    }
    if (typeof system.crew.passengers === "number") {
      system.crew.passengers = { value: system.crew.passengers };
    }
    system.crew.drivers.value ??= 1;
    system.crew.passengers.value ??= 0;

    system.draft ??= {};
    system.draft.required ??= { value: 0 };
    if (typeof system.draft.required === "number") {
      system.draft.required = { value: system.draft.required };
    }
    system.draft.required.value ??= 0;

    system.health ??= {};
    system.health.value ??= 10;
    system.health.max ??= 10;
    if (system.health.value > system.health.max) {
      system.health.value = system.health.max;
    }
    if (system.health.value < 0) {
      system.health.value = 0;
    }

    system.resources ??= {};
    system.resources.movement ??= {};
    system.resources.movement.value ??= 4;
    const baseMove = Math.max(0, Number(system.resources.movement.value) || 0);
    system.resources.movement.current = baseMove;
    system.resources.movement.walk = baseMove * 2;
    system.resources.movement.run = baseMove * 4;

    system.derived ??= {};
    system.derived.carryingCapacity = {
      value: Math.max(0, Number(system.capacity.value) || 0)
    };
    system.derived.woundThreshold = {
      value: system.woundThreshold.value
    };

    const outOfService =
      system.health.value <= 0 ||
      system.criticalWounds.value >= system.criticalWounds.max;

    system.outOfService = outOfService;

    SdpActorInventory.applyEncumbrance(this);
  }

  // =====================
  // ACTIVE EFFECTS (ATTRIBUTES)
  // =====================

  /**
   * Attribute storage/derived fields are computed in prepareDerivedData.
   * Foundry must not mutate them each prepare cycle (would stack on save).
   */
  static isRuntimeAttributeEffectKey(key) {
    if (!key || typeof key !== "string") return false;
    return /^system\.attributes\.[a-zA-Z]+\.(initial|advances|levelBonus|value|bonus|itemModifier|totalModifier|encumbranceModifier|sizeModifier)$/.test(key)
      || /^system\.attributes\.[a-zA-Z]+$/.test(key);
  }

  /** @inheritdoc */
  applyActiveEffects() {
    const pendingRestore = [];

    for (const effect of this.allApplicableEffects()) {
      const original = effect.changes ?? [];
      const filtered = original.filter(
        change => !SdpActor.isRuntimeAttributeEffectKey(change.key)
      );

      if (filtered.length !== original.length) {
        pendingRestore.push([effect, original]);
        effect.changes = filtered;
      }
    }

    try {
      super.applyActiveEffects();
    } finally {
      for (const [effect, original] of pendingRestore) {
        effect.changes = original;
      }
    }
  }

  // =====================
  // ITEM MODIFIERS (ATTRIBUTES)
  // =====================

  _isItemEffectSourceActive(item) {

    if (!item?.documentName || item.documentName !== "Item") return true;

    switch (item.type) {

      case "armor":
        return item.system?.worn?.value === true;

      case "clothing":
        return item.system?.equipped === true;

      case "talent":
        return Number(item.system?.advances || 0) > 0;

      default:
        return true;

    }

  }

  _getAttributeEffectModifiers(targetKey, { initialOnly = false, excludeInitial = false } = {}) {

    let total = 0;
    const initialKey = `system.attributes.${targetKey}.initial`;

    for (const effect of this.allApplicableEffects()) {

      if (effect.disabled) continue;

      const source = effect.parent;
      if (source?.documentName === "Item" && !this._isItemEffectSourceActive(source)) continue;

      for (const change of effect.changes ?? []) {

        if (!change.key) continue;
        if (change.key.startsWith("system.conditions")) continue;
        if (change.key.endsWith(".modifier")) continue;

        if (initialOnly) {
          if (change.key !== initialKey) continue;
        } else if (excludeInitial) {
          if (change.key === initialKey) continue;
          if (!change.key.startsWith(`system.attributes.${targetKey}`)) continue;
        } else if (!change.key.startsWith(`system.attributes.${targetKey}`)) {
          continue;
        }

        total += Number(change.value || 0);

      }

    }

    return total;

  }

  _getInitialFieldModifiers(targetKey) {

    return this._getAttributeEffectModifiers(targetKey, { initialOnly: true });

  }

  _getItemModifiers(targetKey) {

    return this._getAttributeEffectModifiers(targetKey, { excludeInitial: true });

  }

  _getStoredAttributeInitial(key) {

    const fromSource = foundry.utils.getProperty(
      this._source,
      `system.attributes.${key}.initial`
    );

    if (fromSource !== undefined && fromSource !== null) {
      return Number(fromSource);
    }

    return 20;

  }

  static getPersistedAttributeInitial(actor, key) {

    const fromSource = foundry.utils.getProperty(
      actor._source,
      `system.attributes.${key}.initial`
    );

    if (fromSource !== undefined && fromSource !== null) {
      return Number(fromSource);
    }

    return 20;

  }

  /**
   * Initial inputs show base + active effect bonus.
   * Persist only the base; ignore accidental saves of the effective value.
   */
  static normalizeInitialUpdate(actor, update) {

    const normalizeKey = (key, submitted) => {

      const bonus = actor._getInitialFieldModifiers?.(key) ?? 0;
      if (!bonus) return submitted;

      const stored = actor._getStoredAttributeInitial(key);
      const effective = stored + bonus;

      if (submitted === effective) return stored;

      return submitted;

    };

    const attributes = foundry.utils.getProperty(update, "system.attributes");

    if (attributes && typeof attributes === "object") {

      for (const [key, data] of Object.entries(attributes)) {

        if (!data || data.initial === undefined) continue;

        data.initial = normalizeKey(key, Number(data.initial));

      }

    }

    for (const [path, value] of Object.entries(update)) {

      const match = path.match(/^system\.attributes\.([^.]+)\.initial$/);
      if (!match) continue;

      update[path] = normalizeKey(match[1], Number(value));

    }

  }

_getActiveEffectModifier(changeKey) {

  let total = 0;

  for (const item of this.items.contents) {

    for (const effect of item.effects ?? []) {

      if (effect.disabled) continue;

      for (const change of effect.changes ?? []) {

        if (change.key !== changeKey) {
          continue;
        }

        total += Number(change.value || 0);

      }

    }

  }

  return total;

}

_getWoundThresholdModifier() {

  let total = 0;

  for (const item of this.items.contents) {

    for (const effect of item.effects ?? []) {

      if (effect.disabled) continue;

      for (const change of effect.changes ?? []) {

        if (change.key !== "system.custom.woundThresholdModifier") {
          continue;
        }

        const base = Number(change.value || 0);

        if (item.type === "talent") {

          const level = Number(item.system.advances || 0);

          if (level <= 0) continue;

          total += base * level;

        } else {

          total += base;

        }

      }

    }

  }

  return total;

}

_getCarryingCapacityModifier() {

  return this._getActiveEffectModifier(
    "system.custom.carryingCapacityModifier"
  );

}

/**
 * Malus des défauts d'armure portées (worn).
 * Lourde : −10 Agilité × valeur du trait.
 */
_getWornArmorTraitPenalties() {

  const penalties = {
    move: 0,
    agility: 0,
    dexterity: 0,
    discretion: 0,
    perception: 0
  };

  for (const item of this.items) {

    if (item.type !== "armor") continue;
    if (!item.system?.worn?.value) continue;

    const traits = Array.isArray(item.system.armorTraits)
      ? item.system.armorTraits
      : [];

    for (const t of traits) {

      const key = typeof t === "string" ? t : t?.key;
      if (!key) continue;

      const rawValue = Number(typeof t === "object" ? t.value : NaN);
      const stacks =
        Number.isFinite(rawValue) && rawValue > 0
          ? Math.floor(rawValue)
          : 1;

      switch (key) {

        case "encumbering":
          penalties.move -= 1;
          break;

        case "heavy":
          penalties.agility -= 10 * stacks;
          break;

        case "restrictive":
          penalties.dexterity -= 10;
          break;

        case "conspicuous":
          penalties.discretion -= 10;
          break;

        case "limitedVision":
          penalties.perception -= 10;
          break;

        default:
          break;

      }

    }

  }

  // Voyante : s'additionne par pièce, plafonné à -30
  penalties.discretion = Math.max(penalties.discretion, -30);

  return penalties;

}


  // =====================
  // DERIVED DATA
  // =====================

  prepareDerivedData() {

    for (const [key, attr] of Object.entries(this.system.attributes ?? {})) {
      attr.initial = this._getStoredAttributeInitial(key);
    }

    super.prepareDerivedData();

    if (this.type === "vehicle") {
      this._prepareVehicleDerivedData();
      return;
    }

const system = this.system;
system.custom.manaMultiplierBonus = 0;
system.bonuses = system.bonuses || {};
system.bonuses.successSL = system.bonuses.successSL || 0;

// =====================
// CUSTOM MODIFIERS
// =====================

system.custom.offhandReduction = 0;
system.custom.meleeActionBonus = 0;
system.custom.parryBonus = 0;
system.custom.evasionBonus = 0;
system.custom.mountedEvasionPenaltyReduction = 0;
system.custom.combatInitiativeBonus = 0;
system.custom.injurySeverityBonus = 0;
system.custom.toughnessHealthMultiplier = 0;
system.custom.encumbranceStatMultiplier = 0;
system.custom.woundThresholdModifier = 0;
system.custom.carryingCapacityModifier = 0;

for (const item of this.items.contents) {

  if (item.type !== "talent") continue;

  const level = Number(item.system.advances || 0);

  if (level <= 0) continue;

  for (const effect of item.effects) {

    if (effect.disabled) continue;

    for (const change of effect.changes) {

      if (change.key === "system.custom.offhandReduction") {

        const base = Number(change.value || 0);

        system.custom.offhandReduction += base * level * 10;

      }

      if (change.key === "system.custom.manaMultiplierBonus") {

  const base = Number(change.value || 0);

  if (level > 0) {
    system.custom.manaMultiplierBonus += base * level;
  }

}

if (change.key === "system.custom.healthBonus") {

  const base = Number(change.value || 0);

  system.custom.healthBonus += base;

}

if (change.key === "system.custom.manaBonus") {

  const base = Number(change.value || 0);

  system.custom.manaBonus += base;

}

if (change.key === "system.custom.meleeActionBonus") {

  const base = Number(change.value || 0);

  system.custom.meleeActionBonus += base * level;

}

if (change.key === "system.custom.parryBonus") {

  const base = Number(change.value || 0);

  system.custom.parryBonus += base * level;

}

if (change.key === "system.custom.evasionBonus") {

  const base = Number(change.value || 0);

  system.custom.evasionBonus += base * level;

}

if (change.key === "system.custom.mountedEvasionPenaltyReduction") {

  const base = Number(change.value || 0);

  system.custom.mountedEvasionPenaltyReduction += base * level;

}

if (change.key === "system.custom.combatInitiativeBonus") {

  const base = Number(change.value || 0);

  system.custom.combatInitiativeBonus += base * level;

}

if (change.key === "system.custom.injurySeverityBonus") {

  const base = Number(change.value || 0);

  system.custom.injurySeverityBonus += base * level;

}

if (change.key === "system.custom.toughnessHealthMultiplier") {

  const base = Number(change.value || 1);

  system.custom.toughnessHealthMultiplier += base * level;

}

if (change.key === "system.custom.encumbranceStatMultiplier") {

  const base = Number(change.value || 1);

  system.custom.encumbranceStatMultiplier += base * level;

}

    }
  }
}


    // =====================
    // CONDITIONS
    // =====================

system.conditions ??= {};
system.conditions.numbed ??= 0;
system.conditions.dazzled ??= 0;

system.conditionTotals = {};

for (const key in system.conditions) {

  const base = system.conditions[key] ?? 0;

  system.conditionTotals[key] = base;

}


// =====================
// SIZE MODIFIERS
// =====================

const actorSize =
  system.details?.size?.value ||
  system.size ||
  "average";

const sizeModifiers =
  SdpSizeEngine.getAttributeModifiers(actorSize);

const armorTraitPenalties = this._getWornArmorTraitPenalties();
system.custom.armorTraitPenalties = armorTraitPenalties;

    // =====================
    // ATTRIBUTES
    // =====================

    for (let [key, attr] of Object.entries(system.attributes)) {

      const storedInitial = this._getStoredAttributeInitial(key);
      const initialBonus = this._getInitialFieldModifiers(key);
      const itemMod = this._getItemModifiers(key) ?? 0;
      const manualMod = Number(attr.modifier || 0);

      attr.initial = storedInitial + initialBonus;
      attr.initialBonus = initialBonus;
      attr.itemModifier = itemMod + initialBonus;

let sizeMod = 0;

if (key === "strength") {
  sizeMod = sizeModifiers.strength;
}

if (key === "toughness") {
  sizeMod = sizeModifiers.toughness;
}

if (key === "agility") {
  sizeMod = sizeModifiers.agility;
}

// Encumbrance applied after carrying capacity is known
attr.encumbranceModifier = 0;
attr.sizeModifier = sizeMod;

let armorTraitMod = 0;
if (key === "agility") armorTraitMod = armorTraitPenalties.agility;
if (key === "dexterity") armorTraitMod = armorTraitPenalties.dexterity;
attr.armorTraitModifier = armorTraitMod;

const traitMod = getActiveTraitAttributeBonus(this, key);
attr.traitModifier = traitMod;

attr.totalModifier = manualMod + itemMod + sizeMod + traitMod + armorTraitMod;

let baseValue =
  attr.initial +
  Number(attr.advances || 0) +
  attr.totalModifier +
  Number(attr.levelBonus || 0);

attr.value = baseValue;
attr.bonus = Math.floor(attr.value / 10);
    }

// =========================
// CARRYING CAPACITY + ENCUMBRANCE (before malus)
// =========================

const STR = system.attributes.strength.value;
const TGH = system.attributes.toughness.value;
const TB = Math.max(0, system.attributes.toughness.bonus);
const SB = Math.max(0, system.attributes.strength.bonus);

const baseCapacity = Math.floor((STR + TGH) / 2);
const encumbranceTalentBonus =
  (system.custom.encumbranceStatMultiplier || 0) * (SB + TB);

system.custom.carryingCapacityModifier =
  this._getCarryingCapacityModifier();

system.derived.carryingCapacity = {
  value: Math.max(
    0,
    baseCapacity +
      encumbranceTalentBonus +
      (system.custom.carryingCapacityModifier || 0)
  )
};

SdpActorInventory.applyEncumbrance(this);

// =====================
// ENCUMBRANCE MALUS
// =====================

const enc = system.resources.encumbrance?.state?.level ?? 0;

let agiPenalty = 0;
let movePenalty = 0;

if (enc === 1) {
  agiPenalty = -10;
  movePenalty = -1;
}
else if (enc === 2) {
  agiPenalty = -20;
  movePenalty = -2;
}
else if (enc >= 3) {
  agiPenalty = 50; // immobilisé
  movePenalty = -10;
}

if (agiPenalty !== 0) {
  const agi = system.attributes.agility;
  agi.encumbranceModifier = agiPenalty;
  agi.totalModifier += agiPenalty;
  agi.value += agiPenalty;
  agi.bonus = Math.floor(agi.value / 10);
}

    // =====================
// HEALTH
// =====================

const WPB = Math.max( 0, system.attributes.willpower.bonus);

system.resources.corruption.max =
  Math.floor((TB + WPB) / 2);

const healthSize =
  system.details?.size?.value ||
  system.size ||
  "average";

let baseHealth = 0;

// =====================
// SIZE HEALTH CALCULATION
// =====================

switch (healthSize) {

  case "tiny":
    baseHealth = TB;
    break;

  case "verySmall":
    baseHealth = TB + WPB;
    break;

  case "large":
    baseHealth = ((SB + (TB * 2) + WPB) * 2);
    break;

  case "enormous":
    baseHealth = ((SB + (TB * 2) + WPB) * 3);
    break;

  case "gigantic":
    baseHealth = ((SB + (TB * 2) + WPB) * 5);
    break;

  // average / small (same formula)
  case "small":
  case "average":
  default:
    baseHealth = SB + (TB * 2) + WPB;
    break;

}

// =====================
// LEVEL BONUS
// =====================

const levelBonus =
  system.health.levelBonus ?? 0;

const healthBonus =
  system.custom.healthBonus || 0;

const toughnessHealthBonus =
  (system.custom.toughnessHealthMultiplier || 0) * TB;

const superiorConstitutionIndex = getTraitIndexTotal(
  this,
  CREATURE_TRAIT_KEYS.superiorConstitution
);
const superiorConstitutionBonus = TB * superiorConstitutionIndex;

const particularAnatomy = getTraitIndexTotal(
  this,
  CREATURE_TRAIT_KEYS.particularAnatomy
);

system.health.max = particularAnatomy > 0
  ? particularAnatomy
  : baseHealth +
    levelBonus +
    healthBonus +
    toughnessHealthBonus +
    superiorConstitutionBonus;

const finalMax = system.health.max;

if (system.health.value == null) {
  system.health.value = finalMax;
}

if (system.health.value > finalMax) {
  system.health.value = finalMax;
}

if (system.resources.corruption.value > system.resources.corruption.max) {
  system.resources.corruption.value =
    system.resources.corruption.max;
}

    // =====================
    // SKILLS
    // =====================

system.skillModifiers = {};

for (const item of this.items.contents) {

if (
  item.type !== "armor" &&
  item.type !== "injury" &&
  item.type !== "possession" &&
  item.type !== "trait" &&
  item.type !== "disease" &&
  item.type !== "weapon" &&
  item.type !== "clothing" &&
  item.type !== "container"
) continue;

  // 👉 armor seulement si équipée
  if (item.type === "armor" && !item.system?.worn?.value) continue;
  if (item.type === "clothing" && !item.system?.equipped) continue;

  for (const effect of item.effects) {

    if (effect.disabled) continue;

    for (const change of effect.changes) {

      if (!change.key) continue;

      // 👉 ON VEUT UNIQUEMENT LES SKILLS
      if (!change.key.startsWith("system.skillModifiers.")) continue;

      const key = change.key.split(".").pop();

      if (!system.skillModifiers[key]) {
        system.skillModifiers[key] = 0;
      }

      system.skillModifiers[key] += Number(change.value || 0);

    }
  }
}

const armorSkillPenalties = system.custom.armorTraitPenalties || {};
const skills = this.items.filter(i => i.type === "skill");

for (const skill of skills) {
  const skillKey = (skill.system.key || "").toLowerCase().trim();
  if (!skillKey) continue;

  if (
    armorSkillPenalties.discretion &&
    (skillKey === "stealth" ||
      skillKey === "discretion" ||
      skillKey.startsWith("discretion"))
  ) {
    system.skillModifiers[skillKey] =
      (system.skillModifiers[skillKey] || 0) +
      armorSkillPenalties.discretion;
  }

  if (
    armorSkillPenalties.perception &&
    (skillKey === "perception" ||
      skillKey.startsWith("perception"))
  ) {
    system.skillModifiers[skillKey] =
      (system.skillModifiers[skillKey] || 0) +
      armorSkillPenalties.perception;
  }
}

    const getSkill = (key) => skills.find(s => s.system.key === key);

    const resistance = getSkill("resistance");
    const dodge = getSkill("dodge");
    const brawl = getSkill("brawl");

for (let skill of skills) {

  const attribute =
    system.attributes[skill.system.characteristic]?.value ?? 0;

 const key = (skill.system.key || "").toLowerCase().trim();

const extraMod =
  system.skillModifiers?.[key] || 0;

  skill.system.value =
    attribute +
    Number(skill.system.advances || 0) +
    Number(skill.system.modifier || 0) +
    extraMod;
}

    const reflexes = getSkill("reflexes");
    system.custom.reflexesValue =
      reflexes?.system.value ??
      system.attributes.initiative?.value ??
      0;

    // =====================
    // WEAPON DAMAGE
    // =====================

    const weapons = this.items.filter(i => i.type === "weapon");

    for (let weapon of weapons) {

      const formula = weapon.system.damage || "0";

      weapon.system.usesSB = hasWeaponDamageStatBonus(formula);
      weapon.system.finalDamage = resolveWeaponDamageBase(formula, this);
    }

    // =====================
    // WEAPONS
    // =====================

    const equippedWeapons = this.items.filter(
  i => i.type === "weapon" &&
       (i.system.equipped || i.system.natural) &&
       i.system.category === "melee"
);

    const OFFHAND_PENALTY = 20;
    const offhandPenalty =
      Math.max(0, OFFHAND_PENALTY - system.custom.offhandReduction);

    // =====================
// PARRY (DEFENSE WEAPON)
// =====================

let parryBase = 0;

const meleeWeapons = equippedWeapons.filter(w => w.system.category === "melee");

// 🔥 DEFENSE WEAPON PRIORITY
const defenseWeapon = this.items.find(w =>
  w.type === "weapon" &&
  w.system.isDefenseWeapon === true
);

if (defenseWeapon) {

  const skill = getSkill(defenseWeapon.system.skill);

  let base = skill
    ? skill.system.value
    : system.attributes.meleeAbility.value;

let value = base + (Number(defenseWeapon.system.parryBonus || 0) * 10);

if (defenseWeapon.system.offhand) value -= offhandPenalty;

// =========================
// DEFENSIVE TRAIT
// =========================

const traits = defenseWeapon.system.traits || [];

// =========================
// CHECK DEFENSIVE TRAIT
// =========================

const hasDefensive = traits.some(t => t.key === "defensive");

// =========================
// SKILL CHECK
// =========================

const hasValidSkill = actorHasWeaponSkill(
  this,
  defenseWeapon
);

// =========================
// TRAIT BONUS (PROPRE)
// =========================

const traitBonus = this._getWeaponTraitParryBonus(defenseWeapon, hasValidSkill);

value += traitBonus;
parryBase = value;

  console.log("SDP | Parry from defense weapon", {
    weapon: defenseWeapon.name,
    value
  });

}

// 🔥 FALLBACK NORMAL
else if (meleeWeapons.length > 0) {

  const values = [];

for (let weapon of meleeWeapons) {

  const hasValidSkill = actorHasWeaponSkill(this, weapon);

  const skill = getSkill(weapon.system.skill);

  let base = skill
    ? skill.system.value
    : system.attributes.meleeAbility.value;

  let value = base + (Number(weapon.system.parryBonus || 0) * 10);

  // ✅ BON ENDROIT
  const traitBonus = this._getWeaponTraitParryBonus(weapon, hasValidSkill);
  value += traitBonus;

  if (weapon.system.offhand) value -= offhandPenalty;

  values.push(value);
}

  parryBase = Math.max(...values);

}

// 🔥 NO WEAPON
else {

  const skill = getSkill("brawl");

  parryBase = skill
    ? skill.system.value
    : system.attributes.meleeAbility.value;
}
    // =====================
    // ATTACK
    // =====================

    let attackBase = 0;

    if (equippedWeapons.length > 0) {

      const values = [];

    for (let weapon of equippedWeapons) {

  let base = this._getBestWeaponSkill(weapon);

  const hasValidSkill = actorHasWeaponSkill(this, weapon);

  // =========================
  // BASE VALUE
  // =========================

  let value = base + (Number(weapon.system.attackBonus || 0) * 10);

  // =========================
  // TRAITS BONUS
  // =========================

  const traitBonus = this._getWeaponTraitAttackBonus(weapon, hasValidSkill);

  value += traitBonus;

  // =========================
  // OFFHAND
  // =========================

  if (weapon.system.offhand) value -= offhandPenalty;

  values.push(value);
}

      attackBase = Math.max(...values);

    } else {

      const skill = getSkill("brawl");

      attackBase = skill
        ? skill.system.value
        : system.attributes.meleeAbility.value;
    }

    // =====================
    // DERIVED FINAL
    // =====================

    system.custom.woundThresholdModifier =
      this._getWoundThresholdModifier();

    const baseWoundThreshold =
      Math.floor((resistance?.system.value || 0) / 10);

    let woundThreshold = Math.max(
      0,
      baseWoundThreshold +
        (system.custom.woundThresholdModifier || 0)
    );

    // Size: same HP multipliers for large+; half (floor) only for verySmall/tiny.
    // Small matches average (For/End size malus already covers fragility).
    const woundSize =
      system.details?.size?.value ||
      system.size ||
      "average";

    switch (woundSize) {
      case "large":
        woundThreshold *= 2;
        break;
      case "enormous":
        woundThreshold *= 3;
        break;
      case "gigantic":
        woundThreshold *= 5;
        break;
      case "verySmall":
      case "tiny":
        woundThreshold = Math.floor(woundThreshold / 2);
        break;
      default:
        break;
    }

    system.derived.woundThreshold.value = Math.max(1, woundThreshold);

// =====================
// CONDITION MALUS (PARry / EVASION)
// =====================

const cond = system.conditions || {};

let conditionPenalty = 0;

// stack conditions
conditionPenalty -= Number(cond.poisoned || 0);
conditionPenalty -= Number(cond.exhausted || 0);
conditionPenalty -= Number(cond.stunned || 0);
conditionPenalty -= Number(cond.deafened || 0);
if (Number(cond.numbed || 0) > 0) conditionPenalty -= 1;
if (Number(cond.dazzled || 0) > 0) conditionPenalty -= 1;

if (cond.prone) conditionPenalty -= 2;
if (cond.entangled) conditionPenalty -= 2;
if (cond.surprised) conditionPenalty -= 3;
if (cond.shaken) conditionPenalty -= 1;
if (cond.frightened) conditionPenalty -= 3;

// =====================
// APPLY TO VALUES
// =====================

const finalParry =
  (parryBase / 10 + 5) +
  conditionPenalty +
  (system.custom.parryBonus || 0);
system.derived.parry.value = Math.max(
  Math.round(finalParry * 10) / 10,
  0
);

const evasionBase =
  dodge?.system.value ??
  system.attributes.agility.value ??
  0;

const finalEvasion =
  (evasionBase / 10 + 5) +
  conditionPenalty +
  (system.custom.evasionBonus || 0) +
  SdpMount.getMountedEvasionPenalty(this);
system.derived.evasion.value = Math.max(
  Math.round(finalEvasion * 10) / 10,
  0
);

    // =====================
    // CONDITIONS EFFECTS
    // =====================

    const finalAttack = Math.max(attackBase, 0);

    const traitAttackBonus = getActiveTraitAttackBonus(this);
    system.custom.traitAttackBonus = traitAttackBonus;

   system.derived.attack.value =
     Math.round((finalAttack / 10) * 10) / 10 +
     (system.custom.meleeActionBonus || 0) +
     traitAttackBonus;

    // =====================
    // MOVEMENT
    // =====================

    const baseMove = system.resources.movement.value ?? 0;
const slowed = system.conditionTotals?.slowed ?? 0;
const numbed = system.conditionTotals?.numbed ?? 0;

let currentMove = baseMove - slowed - numbed;

// 👉 ENCUMBRANCE + défauts d'armure (Encombrante)
currentMove += movePenalty;
currentMove += system.custom.armorTraitPenalties?.move || 0;

// clamp
currentMove = Math.max(currentMove, 0);

// immobilisé
if (enc >= 3) {
  currentMove = 0;
}

system.resources.movement.current = currentMove;
system.resources.movement.walk = currentMove * 2;
system.resources.movement.run = currentMove * 4;

if (currentMove === 0 && (slowed > 0 || numbed > 0 || enc >= 3)) {
  system.conditions.entangled = true;
}

const sign = this.items.find(i => i.type === "sign");

// =========================
// MANA CALCULATION
// =========================

const wpb = Math.max( 0, this.system.attributes.willpower?.bonus || 0);
const level = this.system.details?.level || 0;

// table non linéaire
const manaMultiplier = {
  0: 3,
  1: 4,
  2: 5,
  3: 6,
  4: 8,
  5: 10
};

// fallback si level > 5
const baseMultiplier = manaMultiplier[level] ?? 10;

const bonusMultiplier = system.custom.manaMultiplierBonus || 0;

const multiplier = baseMultiplier + Math.max(0, bonusMultiplier);

this.system.resources.mana = this.system.resources.mana || {};

const manaBonus =
  system.custom.manaBonus || 0;

const magicReserveIndex = getTraitIndexTotal(
  this,
  CREATURE_TRAIT_KEYS.magicReserve
);
const magicReserveBonus = wpb * magicReserveIndex;

this.system.resources.mana.max =
  (wpb * multiplier) + manaBonus + magicReserveBonus;

// =========================
// 🔋 MANA CLAMP (ANTI OVERFLOW)
// =========================

const mana = system.resources?.mana;

if (mana) {

  const before = mana.value;

  mana.value = Math.min(mana.value, mana.max);

  if (mana.value !== before) {
    console.log("SDP | Mana clamped", {
      before,
      after: mana.value,
      max: mana.max,
      actor: this.name
    });
  }

}

  }

  _getWeaponTraitAttackBonus(weapon, hasValidSkill) {

  let bonus = 0;

  const traits = weapon.system.traits || [];
  const itemTraits = weapon.system.itemTraits || [];

  const normalized = traits
    .filter(t => t)
    .map(t => typeof t === "string" ? { key: t } : t);

  // =========================
  // POSITIVE TRAITS (ONLY IF SKILL)
  // =========================

  if (hasValidSkill) {

    if (normalized.some(t => t.key === "fast")) bonus += 10;
    if (normalized.some(t => t.key === "precise")) bonus += 10;

  }

  // =========================
  // NEGATIVE TRAITS (ALWAYS)
  // =========================

  if (normalized.some(t => t.key === "slow")) bonus -= 10;
  if (normalized.some(t => t.key === "imprecise")) bonus -= 10;

  // =========================
  // ITEM TRAITS
  // =========================

  if (itemTraits.some(t => t.key === "practical")) bonus += 10;
  if (itemTraits.some(t => t.key === "impractical")) bonus -= 10;

  return bonus;
}

_getWeaponTraitParryBonus(weapon, hasValidSkill) {

  let bonus = 0;

  const traits = weapon.system.traits || [];
  const itemTraits = weapon.system.itemTraits || [];

  const normalized = traits
    .filter(t => t)
    .map(t => typeof t === "string" ? { key: t } : t);

  // =========================
  // POSITIVE TRAITS (ONLY IF SKILL)
  // =========================

  if (hasValidSkill) {

    if (normalized.some(t => t.key === "defensive")) bonus += 10;

  }

  // =========================
  // NEGATIVE TRAITS (si un jour)
  // =========================

  // (tu peux en ajouter ici plus tard)

  // =========================
  // ITEM TRAITS (TOUJOURS ACTIFS)
  // =========================

  // (si tu ajoutes des bonus parry objet)

  return bonus;
}

  // =====================
  // TALENT MAX
  // =====================

  getTalentMax(talent){

    const max = talent.system.max;

    if(!isNaN(max)) return Number(max);

    const attr = this.system.attributes[max];

    return attr?.bonus ?? 1;
  }

getWeaponAttack(weapon) {

  const system = this.system;

  const skills = this.items.filter(i => i.type === "skill");
  const getSkill = (key) => skills.find(s => s.system.key === key);

  // =========================
  // BASE
  // =========================

 let base;

base = this._getBestWeaponSkill(weapon);

  let value = base + (Number(weapon.system.attackBonus || 0) * 10);

  // =========================
  // OFFHAND
  // =========================

  const OFFHAND_PENALTY = 20;

  const reduction = system.custom.offhandReduction || 0;

  const offhandPenalty = Math.max(0, OFFHAND_PENALTY - reduction);

  if (weapon.system.offhand) {
    value -= offhandPenalty;
  }

  return value;
}

_getBestWeaponSkill(weapon) {

  const actor = this;

  const weaponSkills = parseWeaponSkillRefs(weapon);

  const actorSkills = actor.items.filter(i => i.type === "skill");

  let bestValue = null;

  // =========================
  // DETERMINE BASE ATTRIBUTE
  // =========================

  const isRanged = weapon.system.category === "ranged";

  const baseAttribute = isRanged
    ? actor.system.attributes.rangedAbility.value
    : actor.system.attributes.meleeAbility.value;

  // =========================
  // LOOP SKILLS
  // =========================

  for (const group of weaponSkills) {

    const skill = findActorSkillForRef(actorSkills, group);

    if (!skill) continue;

    const advances = Number(skill.system.advances || 0);
    const modifier = Number(skill.system.modifier || 0);

    // 🔥 NOUVEAU CALCUL
    const candidateValue = baseAttribute + advances + modifier;

    if (bestValue === null || candidateValue > bestValue) {
      bestValue = candidateValue;
    }

  }

  // =========================
  // FALLBACK
  // =========================

  if (bestValue === null) {
    return baseAttribute;
  }

  return bestValue;
}
}
