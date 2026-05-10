import { SDP } from "../system/config.js";
import { getItemLayer, applyFinalWeight} from "./actor-sheet-utils.js";

export function prepareWeapons(actor) {

  const weapons = actor.items.filter(i =>
    i.type === "weapon" &&
    !i.system.containerId
  );

  const meleeWeapons = weapons.filter(
    w => w.system.category === "melee"
  );

  const rangedWeapons = weapons.filter(
    w => w.system.category === "ranged"
  );

  const allAmmo = actor.items.filter(
    i => i.type === "ammunition"
  );

  for (let w of rangedWeapons) {

    w.compatibleAmmo = allAmmo.filter(a =>
      a.system.weaponGroup === w.system.ammunitionGroup
    );

    const weaponTraits = Array.isArray(w.system.traits)
      ? w.system.traits
      : [];

    const itemTraits = Array.isArray(w.system.itemTraits)
      ? w.system.itemTraits
      : [];

    const allTraits = [
      ...weaponTraits,
      ...itemTraits
    ];

    w.hasReload = allTraits.some(t => {

      if (!t) return false;

      if (typeof t === "string") {
        return [
          "reload",
          "rechargement"
        ].includes(
          t.toLowerCase().trim()
        );
      }

      if (typeof t === "object") {

        const value = (
          t.key ||
          t.name ||
          t.label ||
          t.value ||
          ""
        )
          .toString()
          .toLowerCase()
          .trim();

        return [
          "reload",
          "rechargement"
        ].includes(value);

      }

      return false;

    });

  }

  const actorSkills = actor.items.filter(
    i => i.type === "skill"
  );

  const actorSkillNames = actorSkills.map(s =>
    (s.name || "").toLowerCase().trim()
  );

  for (let w of weapons) {

    const weaponTraits = w.system.traits || [];
    const itemTraits = w.system.itemTraits || [];

    const normalized = [
      ...weaponTraits.map(t => ({
        ...(typeof t === "string" ? { key: t } : t),
        source: "weapon"
      })),
      ...itemTraits.map(t => ({
        ...(typeof t === "string" ? { key: t } : t),
        source: "item"
      }))
    ];

    const weaponSkills = (w.system.skill || "")
      .split(",")
      .map(s => s.trim().toLowerCase())
      .filter(s => s);

    const hasValidSkill = weaponSkills.some(group =>
      actorSkillNames.includes(
        group.toLowerCase().trim()
      )
    );

    w.displayTraits = normalized.map(t => {

      const traitConfig =
        SDP.WEAPON_TRAITS?.[t.key] ||
        SDP.ITEM_TRAITS?.[t.key];

      const isPositive =
        traitConfig?.type === "positive";

      return {
        key: t.key,
        label: traitConfig?.label || t.key,
        value: t.value,
        type: traitConfig?.type || "neutral",
        description:
          traitConfig?.description ||
          "No description",

        disabled: (
          t.key !== "protectrice" &&
          t.source === "weapon" &&
          isPositive &&
          !hasValidSkill
        )
      };

    });

    const displaySkills = weaponSkills.map(group => {

      const skill = actorSkills.find(s =>
        (s.system.key || "").toLowerCase() === group ||
        (s.name || "").toLowerCase() === group
      );

      if (skill) return skill.name;

      return group.charAt(0).toUpperCase() +
        group.slice(1);

    });

    w.displaySkill = displaySkills.length
      ? displaySkills.join(", ")
      : "No skill";

  }

  applyFinalWeight(meleeWeapons);
  applyFinalWeight(rangedWeapons);

  return {
    weapons,
    meleeWeapons,
    rangedWeapons
  };

}

export function prepareArmors(actor) {

  const armors = actor.items.filter(i =>
    i.type === "armor" &&
    !i.system.containerId
  );

  for (let a of armors) {

    const armorTraits =
      a.system.armorTraits || {};

    const itemTraits =
      a.system.itemTraits || {};

    const allTraits = [];

    const armorTraitsArray =
      Array.isArray(armorTraits)
        ? armorTraits
        : [];

    for (const t of armorTraitsArray) {

      const key =
        typeof t === "string"
          ? t
          : t.key;

      const value =
        typeof t === "object"
          ? t.value
          : undefined;

      const config =
        SDP.ARMOR_TRAITS?.[key];

      allTraits.push({
        key,
        label: config?.label || key,
        value,
        type: config?.type || "neutral",
        description:
          config?.description ||
          "No description"
      });

    }

    const itemTraitsArray =
      Array.isArray(itemTraits)
        ? itemTraits
        : [];

    for (const t of itemTraitsArray) {

      const key =
        typeof t === "string"
          ? t
          : t.key;

      const value =
        typeof t === "object"
          ? t.value
          : undefined;

      const config =
        SDP.ITEM_TRAITS?.[key];

      allTraits.push({
        key,
        label: config?.label || key,
        value,
        type: config?.type || "neutral"
      });

    }

    a.displayArmorTraits = allTraits;

  }

  applyFinalWeight(armors);

  return armors;

}

export function prepareInventory(actor) {

  const possessions = actor.items.filter(i =>
    i.type === "possession" &&
    !i.system.containerId
  );

  const ammunition = actor.items.filter(i =>
    i.type === "ammunition" &&
    !i.system.containerId
  );

  const clothing = actor.items.filter(i =>
    i.type === "clothing" &&
    !i.system.containerId
  );

  const containers = actor.items.filter(i =>
    i.type === "container"
  );

  applyFinalWeight(possessions, "weight");
  applyFinalWeight(ammunition);
  applyFinalWeight(containers);
  applyFinalWeight(clothing);

  return {
    possessions,
    ammunition,
    clothing,
    containers
  };

}

export function prepareContainerData(actor, containers) {

  const allItems = actor.items;

  const containedItems = allItems.filter(
    i => i.system.containerId
  );

  const rootItems = allItems.filter(
    i => !i.system.containerId
  );

  const containerMap = {};

  for (let item of containedItems) {

    const cid = item.system.containerId;

    if (!containerMap[cid]) {
      containerMap[cid] = [];
    }

    containerMap[cid].push(item);

  }

  const containerLoad = {};

  for (let container of containers) {

    const items =
      containerMap[container.id] || [];

    const total = items.reduce((sum, i) => {

      return sum + (
        (i.system.encumbrance?.value || 0) *
        (i.system.quantity?.value || 1)
      );

    }, 0);

    containerLoad[container.id] = total;

  }

  return {
    containerMap,
    containerLoad,
    rootItems
  };

}

export function prepareEquipmentSlots(
  armors,
  clothing,
  weapons
) {

  const slots = {
    head: [],
    chest: [],
    armLeft: [],
    armRight: [],
    legLeft: [],
    legRight: [],
    weaponMain: null,
    weaponOff: null
  };

  for (let armor of armors) {

    if (!armor.system.worn?.value) continue;

    const s = armor.system.slots || {};

    if (s.head) slots.head.push(armor);
    if (s.chest) slots.chest.push(armor);
    if (s.armLeft) slots.armLeft.push(armor);
    if (s.armRight) slots.armRight.push(armor);
    if (s.legLeft) slots.legLeft.push(armor);
    if (s.legRight) slots.legRight.push(armor);

  }

  for (let cloth of clothing) {

    if (!cloth.system.equipped) continue;

    const s = cloth.system.slots || {};

    if (s.head) slots.head.push(cloth);
    if (s.chest) slots.chest.push(cloth);
    if (s.armLeft) slots.armLeft.push(cloth);
    if (s.armRight) slots.armRight.push(cloth);
    if (s.legLeft) slots.legLeft.push(cloth);
    if (s.legRight) slots.legRight.push(cloth);

  }

  for (let weapon of weapons) {

    if (!weapon.system.equipped) continue;

    const handed =
      (weapon.system.handedness || "")
        .toLowerCase();

    if (handed === "special") continue;

    if (handed === "two") {

      slots.weaponMain = weapon;
      slots.weaponOff = weapon;

      continue;

    }

    if (weapon.system.offhand) {
      slots.weaponOff = weapon;
    } else {
      slots.weaponMain = weapon;
    }

  }

  for (let key in slots) {

    if (Array.isArray(slots[key])) {

      slots[key].sort((a, b) =>
        getItemLayer(a) -
        getItemLayer(b)
      );

    }

  }

  return slots;

}