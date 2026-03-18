import { SdpItemSheet } from "./item-sheet.js";

export class SdpInjurySheet extends SdpItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sdp", "sheet", "item"],
      width: 500,
      height: 400
    });
  }

  get template() {
    return "systems/sdp/templates/items/injury-sheet.hbs";
  }

  activateListeners(html){

  super.activateListeners(html);

  html.find(".add-effect").click(this._addEffect.bind(this));
  html.on("click", ".remove-effect", this._removeEffect.bind(this));

}

async _addEffect(){

const effects = foundry.utils.duplicate(this.item.system.effects?.value || []);

  effects.push({
    target: "strength",
    value: 0
  });

await this.item.update({
  "system.effects.value": effects
});

}

async _removeEffect(event){

  event.preventDefault();
  event.stopPropagation();

  const index = Number(event.currentTarget.dataset.index);

const effects = foundry.utils.duplicate(this.item.system.effects?.value || []);

  effects.splice(index,1);

await this.item.update({
  "system.effects.value": effects
});

}

async _updateObject(event, formData){

  const data = foundry.utils.expandObject(formData);

  // transformer en vrai array
  if(data.system?.effects?.value){

    data.system.effects.value = Object.values(data.system.effects.value);

  }

  return super._updateObject(event, data);

}

}