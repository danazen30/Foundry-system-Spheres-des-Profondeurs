import { SdpRoll } from "../rolls/roll.js";
import { SdpAttack } from "../combat/attack.js";
import { SDP } from "../system/config.js";

export class SdpActorSheet extends ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sdp", "sheet", "actor"],
      template: "systems/sdp/templates/actors/character-sheet.hbs",
      width: 600,
      height: 600,
      submitOnChange: true
    });
  }

  getData(options) {

    const context = super.getData(options);

    context.itemModifiers = {};

for(const key in context.attributes){
  context.itemModifiers[key] = this.actor._getItemModifiers(key);
}

    context.actor = this.actor;
    context.system = this.actor.system;
    context.attributes = this.actor.system.attributes;

     context.config = SDP;   // ← AJOUTER CETTE LIGNE
     
    // récupérer les talents
    const talents = this.actor.items.filter(i => i.type === "talent");

    context.talents = talents.map(t => {

      let max = t.system.max;

      if (isNaN(max)) {

        const attr = this.actor.system.attributes[max];
        max = attr?.bonus ?? 1;

      }

      return {
        id: t.id,
        name: t.name,
        advances: t.system.advances,
        canAdvance: t.system.canAdvance,
        max: max
      };

    });

    return context;

  }

  activateListeners(html) {

    super.activateListeners(html);

    // =====================
    // SKILL ADVANCES
    // =====================

    html.find(".skill-advances").change(async ev => {

      const input = ev.currentTarget;
      const itemId = input.dataset.itemId;
      const value = Number(input.value);

      const item = this.actor.items.get(itemId);

      await item.update({
        "system.advances": value
      });

    });

    // =====================
    // WEAPON EQUIP
    // =====================

    html.find(".weapon-equipped").change(async ev => {

      const input = ev.currentTarget;
      const itemId = input.dataset.itemId;
      const value = input.checked;

      const item = this.actor.items.get(itemId);

      if (!value) {

        await item.update({
          "system.equipped": false
        });

        this.actor.prepareData();
        this.actor.render();
        return;

      }

      const weapons = this.actor.items.filter(i => i.type === "weapon");

      const equipped = weapons.filter(w => w.system.equipped);

      const oneHand = equipped.filter(w => w.system.handedness === "one");
      const twoHand = equipped.find(w => w.system.handedness === "two");

      if (item.system.handedness === "two") {

        for (let w of equipped) {

          if (w.system.handedness !== "special") {

            await w.update({ "system.equipped": false });

          }

        }

        await item.update({ "system.equipped": true });

        this.actor.prepareData();
        this.actor.render();
        return;

      }

      if (item.system.handedness === "one") {

        if (twoHand) {

          ui.notifications.warn("Two-handed weapon already equipped.");
          input.checked = false;
          return;

        }

        if (oneHand.length >= 2) {

          ui.notifications.warn("You cannot equip more than two one-handed weapons.");
          input.checked = false;
          return;

        }

      }

      await item.update({ "system.equipped": true });

      this.actor.prepareData();
      this.actor.render();

    });

    // =====================
    // OFFHAND
    // =====================

    html.find(".weapon-offhand").change(async ev => {

      const input = ev.currentTarget;
      const itemId = input.dataset.itemId;
      const value = input.checked;

      const item = this.actor.items.get(itemId);

      await item.update({
        "system.offhand": value
      });

    });

    // =====================
    // TALENT ADVANCES
    // =====================

    html.find(".talent-advances").change(async ev => {

      const input = ev.currentTarget;
      const itemId = input.dataset.itemId;
      const value = Number(input.value);

      const item = this.actor.items.get(itemId);

      await item.update({
        "system.advances": value
      });

    });

    // =====================
    // ATTRIBUTE ROLL
    // =====================

    html.find(".roll-attribute").click(ev => {

      const attr = ev.currentTarget.dataset.attr;
      const value = this.actor.system.attributes[attr].value;

      SdpRoll.basicTest(
        this.actor,
        value,
        `Attribute Test (${attr})`
      );

    });

    // =====================
    // SKILL ROLL
    // =====================

    html.find(".roll-skill").click(ev => {

      const itemId = ev.currentTarget.dataset.itemId;

      const skill = this.actor.items.get(itemId);

      const value = skill.system.value;

      SdpRoll.basicTest(
        this.actor,
        value,
        `Skill Test (${skill.name})`
      );

    });

    // =====================
    // WEAPON ATTACK
    // =====================

    html.find(".weapon-attack").click(ev => {

      const itemId = ev.currentTarget.dataset.itemId;

      const weapon = this.actor.items.get(itemId);

      const attackValue = this.actor.system.derived.attack.value;

      SdpAttack.attackTest(this.actor, weapon, attackValue);

    });

    //================
    // ARMOR WORN
    //================

    html.find(".armor-worn").click(ev => {

      const itemId = ev.currentTarget.dataset.itemId;

      const armor = this.actor.items.get(itemId);

      armor.update({
        "system.worn.value": ev.currentTarget.checked
      });

    });


// =====================
// CONDITION STACK UPDATE
// =====================

html.find(".condition-stack-input").change(async ev => {

  const input = ev.currentTarget;

  const key = input.dataset.key;

  let value = Number(input.value);

  if(isNaN(value)) value = 0;

  value = Math.max(value,0);

  await this.actor.update({
    [`system.conditions.${key}`]: value
  });

});

// =====================
// CONDITION STATE UPDATE
// =====================

html.find(".condition-state-input").change(async ev => {

  const input = ev.currentTarget;
  const key = input.dataset.key;
  const value = input.checked;

  await this.actor.update({
    [`system.conditions.${key}`]: value
  });

});


  }

}


