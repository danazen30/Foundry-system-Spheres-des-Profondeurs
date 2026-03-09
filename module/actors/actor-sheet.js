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

    // exposer clairement les données au template
    context.actor = this.actor;
    context.system = this.actor.system;
    context.attributes = this.actor.system.attributes;

    return context;
  }

  activateListeners(html) {
  super.activateListeners(html);

  html.find(".skill-advances").change(async ev => {

    const input = ev.currentTarget;
    const itemId = input.dataset.itemId;
    const value = Number(input.value);

    const item = this.actor.items.get(itemId);

    await item.update({
      "system.advances": value
    });

  });
  //permettre d'equiper l'arme
html.find(".weapon-equipped").change(async ev => {

  const input = ev.currentTarget;
  const itemId = input.dataset.itemId;
  const value = input.checked;

  const item = this.actor.items.get(itemId);

  // déséquiper
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

  // =====================
  // Arme à deux mains
  // =====================

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

  // =====================
  // Arme à une main
  // =====================

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
html.find(".weapon-offhand").change(async ev => {

  const input = ev.currentTarget;
  const itemId = input.dataset.itemId;
  const value = input.checked;

  const item = this.actor.items.get(itemId);

  await item.update({
    "system.offhand": value
  });

});
  }}