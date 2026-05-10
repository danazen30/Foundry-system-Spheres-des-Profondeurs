import { SdpRoll } from "../rolls/roll.js";
import { SdpSpell } from "../combat/spell.js";

export function registerCombatListeners(sheet, root) {

  const actor = sheet.document;

  registerWeaponEquip(root, actor);
registerOffhandToggle(root, actor);
registerAmmoSelection(root, actor);

registerDefenseWeaponToggle(
  sheet,
  root,
  actor
);

registerLoadedToggle(root, actor);

registerWeaponToggle(
  sheet,
  root,
  actor
);

  // =========================
  // WEAPON ATTACK
  // =========================

  root.querySelectorAll('[data-action="weaponAttack"]').forEach(el => {

    el.addEventListener("click", (event) => {

      const weapon = actor.items.get(
        event.currentTarget.dataset.itemId
      );

      if (!weapon) return;

      // =========================
      // EQUIPPED CHECK
      // =========================

      if (!weapon.system.equipped) {
        ui.notifications.warn(`${weapon.name} is not equipped`);
        return;
      }

      // =========================
      // WEAPON QUANTITY CHECK
      // =========================

      const weaponQty = weapon.system.quantity?.value;

      if (
        weaponQty !== undefined &&
        weaponQty !== null &&
        weaponQty <= 0
      ) {
        ui.notifications.warn(`${weapon.name} is depleted`);
        return;
      }

      // =========================
      // AMMO CHECK
      // =========================

      if (
        weapon.system.category === "ranged" &&
        weapon.system.consumesAmmo
      ) {

        if (!weapon.system.currentAmmo) {
          ui.notifications.warn("No ammunition selected");
          return;
        }

        const ammo = actor.items.get(
          weapon.system.currentAmmo
        );

        if (!ammo) {
          ui.notifications.warn("Ammunition not found");
          return;
        }

        const qty = ammo.system.quantity?.value ?? 0;

        if (qty <= 0) {
          ui.notifications.warn("No ammunition left");
          return;
        }
      }

      // =========================
      // TARGET
      // =========================

      let target;

      if (weapon.system.category === "ranged") {
        target = actor._getBestWeaponSkill(weapon);
      } else {
        target = actor.system.derived.attack.value;
      }

      SdpRoll.openDialog({
        actor,
        type: "attack",
        label: weapon.name,
        target,
        weapon
      });

    });

  });

  // =========================
  // SPELL CAST
  // =========================

  root.querySelectorAll('[data-action="castSpell"]').forEach(el => {

    el.addEventListener("click", async (event) => {

      event.preventDefault();

      const itemId =
        event.currentTarget.dataset.itemId;

      const spell = actor.items.get(itemId);

      if (!spell) return;

      const cost = spell.system.power.value || 0;
      const mana = actor.system.resources.mana.value;

      if (mana < cost) {
        ui.notifications.warn("Not enough mana");
        return;
      }

      const bestSkill =
        SdpSpell._getBestSpellSkill(actor, spell);

      let skillLabel = "Intelligence";

      let skillValue =
        actor.system.attributes.intelligence.value;

      if (bestSkill) {
        skillLabel = bestSkill.name;
        skillValue = bestSkill.system.value;
      }

      SdpRoll.openDialog({
        actor,
        type: "attack",
        label: spell.name,
        target: skillValue,
        weapon: spell,
        isSpell: true,

        spellData: {
          skillLabel,
          skillValue
        }
      });

    });

  });

  function registerWeaponEquip(root, actor) {

  root.querySelectorAll('[data-action="toggleWeaponEquip"]').forEach(el => {

    el.addEventListener("change", async (event) => {

      const checkbox = event.currentTarget;
      const item = actor.items.get(checkbox.dataset.itemId);

      const isEquipping = checkbox.checked;

      // =========================
      // UNEQUIP
      // =========================

      if (!isEquipping) {

        await item.update({
          "system.equipped": false,
          "system.offhand": false,
          "system.isDefenseWeapon": false
        });

        const equippedWeapons = actor.items.filter(w =>
          w.type === "weapon" && w.system.equipped
        );

        let defenseAssigned = false;

        for (let w of equippedWeapons) {

          const handed = (w.system.handedness || "").toLowerCase();
          const isMelee = w.system.category === "melee";
          const isSpecial = handed === "special";

          if (!defenseAssigned && (isMelee || isSpecial)) {

            await w.update({
              "system.isDefenseWeapon": true
            });

            defenseAssigned = true;

          } else {

            await w.update({
              "system.isDefenseWeapon": false
            });

          }

        }

        return;

      }

      // =========================
      // EXISTING WEAPONS
      // =========================

      const equipped = actor.items.filter(i =>
        i.type === "weapon" &&
        i.system.equipped &&
        i.id !== item.id
      );

      const handed =
        (item.system.handedness || "").toLowerCase();

      // =========================
      // SPECIAL
      // =========================

      if (handed === "special") {

        await item.update({
          "system.equipped": true
        });

        const hasDefense = actor.items.some(i =>
          i.type === "weapon" &&
          i.system.equipped &&
          i.system.isDefenseWeapon
        );

        if (!hasDefense) {

          await item.update({
            "system.isDefenseWeapon": true
          });

        }

        return;

      }

      // =========================
      // TWO HANDED
      // =========================

      const hasTwoHanded = equipped.some(w =>
        (w.system.handedness || "").toLowerCase() === "two"
      );

      if (hasTwoHanded) {

        ui.notifications.warn("2H weapon already equipped");

        checkbox.checked = false;

        return;

      }

      if (handed === "two") {

        const hasOther = equipped.some(w =>
          (w.system.handedness || "").toLowerCase() !== "special"
        );

        if (hasOther) {

          ui.notifications.warn(
            "Cannot equip 2H with other weapons"
          );

          checkbox.checked = false;

          return;

        }

        await item.update({
          "system.equipped": true
        });

        return;

      }

      // =========================
      // ONE HANDED LIMIT
      // =========================

      const oneHandedCount = equipped.filter(w =>
        (w.system.handedness || "").toLowerCase() === "one"
      ).length;

      if (oneHandedCount >= 2) {

        ui.notifications.warn("Max 2 one-hand weapons");

        checkbox.checked = false;

        return;

      }

      await item.update({
        "system.equipped": true
      });

      // =========================
      // AUTO OFFHAND
      // =========================

      const oneHanded = actor.items.filter(i =>
        i.type === "weapon" &&
        i.system.equipped &&
        (i.system.handedness || "").toLowerCase() === "one"
      );

      if (oneHanded.length === 2) {

        const hasOffhand =
          oneHanded.some(w => w.system.offhand);

        if (!hasOffhand) {

          await item.update({
            "system.offhand": true
          });

        }

      }

      // =========================
      // AUTO DEFENSE
      // =========================

      const hasDefense = actor.items.some(i =>
        i.type === "weapon" &&
        i.system.equipped &&
        i.system.isDefenseWeapon &&
        (
          i.system.category === "melee" ||
          (i.system.handedness || "").toLowerCase() === "special"
        )
      );

      if (!hasDefense) {

        const isMelee =
          item.system.category === "melee";

        const isSpecial =
          handed === "special";

        if (isMelee || isSpecial) {

          await item.update({
            "system.isDefenseWeapon": true
          });

        }

      }

    });

  });

}

function registerOffhandToggle(root, actor) {

  root.querySelectorAll('[data-action="toggleOffhand"]').forEach(el => {

    el.addEventListener("click", async (event) => {

      event.preventDefault();

      const checkbox = event.currentTarget;

      const item = actor.items.get(
        checkbox.dataset.itemId
      );

      if (!item || !item.system.equipped) {

        ui.notifications.warn("Weapon must be equipped");

        checkbox.checked = false;

        return;

      }

      const isOffhand = !item.system.offhand;

      const isSpecial =
        (item.system.handedness || "").toLowerCase() === "special";

      if (isOffhand && !isSpecial) {

        const others = actor.items.filter(i =>
          i.type === "weapon" &&
          i.system.offhand &&
          i.id !== item.id &&
          (i.system.handedness || "").toLowerCase() !== "special"
        );

        for (let w of others) {

          await w.update({
            "system.offhand": false
          });

        }

      }

      await item.update({
        "system.offhand": isOffhand
      });

    });

  });

}

function registerAmmoSelection(root, actor) {

  root.querySelectorAll('[data-action="selectAmmo"]').forEach(el => {

    el.addEventListener("change", async (event) => {

      const select = event.currentTarget;

      const weapon = actor.items.get(
        select.dataset.itemId
      );

      if (!weapon) return;

      let ammoId = select.value;

      if (!ammoId) ammoId = null;

      console.log("SDP | Ammo selected", {
        weapon: weapon.name,
        ammoId
      });

      await weapon.update({
        "system.currentAmmo": ammoId
      });

    });

  });

}

function registerDefenseWeaponToggle(sheet, root, actor) {

  root.querySelectorAll('.toggle-defense-weapon').forEach(el => {

    el.addEventListener("change", async (event) => {

      const checkbox = event.currentTarget;

      const itemId = checkbox.dataset.itemId;
      const checked = checkbox.checked;

      const item = actor.items.get(itemId);

      if (!item) return;

      // =========================
      // EQUIPPED CHECK
      // =========================

      if (!item.system.equipped) {

        ui.notifications.warn("Weapon must be equipped");

        checkbox.checked = false;

        return;

      }

      // =========================
      // UNIQUE DEFENSE WEAPON
      // =========================

      if (checked) {

        const current = actor.items.filter(i =>
          i.type === "weapon" &&
          i.system.isDefenseWeapon &&
          i.id !== item.id
        );

        for (let w of current) {

          await w.update({
            "system.isDefenseWeapon": false
          });

        }

      }

      await item.update({
        "system.isDefenseWeapon": checked
      });

      console.log("SDP | Defense weapon toggled", {
        weapon: item.name,
        checked
      });

      sheet.render();

    });

  });

}

function registerLoadedToggle(root, actor) {

  root.querySelectorAll('[data-action="toggleLoaded"]').forEach(el => {

    el.addEventListener("change", async (event) => {

      const item = actor.items.get(
        event.currentTarget.dataset.itemId
      );

      if (!item) return;

      const checked = event.currentTarget.checked;

      await item.update({
        "system.loaded": checked,

        "system.reloadProgress":
          checked
            ? 0
            : item.system.reloadProgress
      });

      console.log("SDP | TOGGLE LOADED", {
        weapon: item.name,
        loaded: checked
      });

    });

  });

}

function registerWeaponToggle(sheet, root, actor) {

  root.querySelectorAll('.weapon-toggle').forEach(el => {

    // =========================
    // LEFT CLICK = ATTACK
    // =========================

    el.addEventListener("click", (event) => {

      const stunned =
        actor.system.conditions?.stunned || 0;

      if (stunned > 0) {

        event.preventDefault();

        ui.notifications.warn(
          `${actor.name} is stunned and cannot attack`
        );

        return;

      }

      const itemId =
        event.currentTarget.dataset.itemId;

      const weapon = actor.items.get(itemId);

      if (!weapon) return;

      // =========================
      // EQUIPPED CHECK
      // =========================

      if (!weapon.system.equipped) {

        ui.notifications.warn(
          `${weapon.name} is not equipped`
        );

        return;

      }

      // =========================
      // WEAPON QUANTITY
      // =========================

      const weaponQty =
        weapon.system.quantity?.value;

      if (
        weaponQty !== undefined &&
        weaponQty !== null &&
        weaponQty <= 0
      ) {

        ui.notifications.warn(
          `${weapon.name} is depleted`
        );

        return;

      }

      // =========================
      // AMMO CHECK
      // =========================

      if (
        weapon.system.category === "ranged" &&
        weapon.system.consumesAmmo
      ) {

        if (!weapon.system.currentAmmo) {

          ui.notifications.warn(
            "No ammunition selected"
          );

          return;

        }

        const ammo = actor.items.get(
          weapon.system.currentAmmo
        );

        if (!ammo) {

          ui.notifications.warn(
            "Ammunition not found"
          );

          return;

        }

        const qty =
          ammo.system.quantity?.value ?? 0;

        if (qty <= 0) {

          ui.notifications.warn(
            "No ammunition left"
          );

          return;

        }

      }

      // =========================
      // TARGET
      // =========================

      let target;

      if (weapon.system.category === "ranged") {

        target =
          actor._getBestWeaponSkill(weapon);

      } else {

        target =
          actor.system.derived.attack.value;

      }

      SdpRoll.openDialog({
        actor,
        type: "attack",
        label: weapon.name,
        target,
        weapon
      });

    });

    // =========================
    // RIGHT CLICK = DETAILS
    // =========================

    el.addEventListener("contextmenu", (event) => {

      event.preventDefault();

      const itemId =
        event.currentTarget.dataset.itemId;

      const details = root.querySelector(
        `.weapon-details[data-details="${itemId}"]`
      );

      if (!details) return;

      const isHidden =
        details.style.display === "none";

      details.style.display =
        isHidden
          ? "table-row"
          : "none";

    });

  });

}

}