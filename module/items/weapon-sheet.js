export class SdpWeaponSheet extends ItemSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sdp", "sheet", "item"],
      template: "systems/sdp/templates/items/weapon-sheet.hbs",
      width: 400,
      height: 350
    });
  }

  getData() {
    const context = super.getData();

    context.system = this.item.system;

    return context;
  }

}