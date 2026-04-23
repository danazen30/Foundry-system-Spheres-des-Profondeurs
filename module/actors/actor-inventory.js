export class SdpActorInventory {

  static getTotalEncumbrance(actor) {

    let total = 0;

    for (const item of actor.items.contents) {

      const enc = Number(item.system.encumbrance?.value || 0);
      const qty = Number(item.system.quantity?.value || 1);

      total += enc * qty;
    }

    return total;
  }

  static applyEncumbrance(actor) {

    const total = this.getTotalEncumbrance(actor);

    actor.system.resources.encumbrance ??= {};
    actor.system.resources.encumbrance.value = total;

    return total;
  }

}