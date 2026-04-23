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

static async applyEncumbrance(actor) {

  let total = 0;

  for (let item of actor.items) {

    const enc = Number(item.system.encumbrance?.value || 0);
    if (!enc) continue;

    const qty = Number(item.system.quantity?.value ?? 1);

    total += enc * qty;

  }

    const STR = actor.system.attributes.strength.value || 0;
const TGH = actor.system.attributes.toughness.value || 0;

// 👉 moyenne arrondie à l'inférieur
const max = Math.floor((STR + TGH) / 2);
const ratio = total / max;

let encumbranceState = {
  level: 0,
  label: ""
};

if (ratio > 3) {
  encumbranceState = {
    level: 3,
    label: "Immobile"
  };
}
else if (ratio > 2) {
  encumbranceState = {
    level: 2,
    label: "-20 Agility, -2 Move, +2 Exhausted (if prolonged)"
  };
}
else if (ratio > 1) {
  encumbranceState = {
    level: 1,
    label: "-10 Agility, -1 Move, +1 Exhausted (if prolonged)"
  };
}

await actor.update({
  "system.resources.encumbrance.value": total,
  "system.resources.encumbrance.max": max,
  "system.resources.encumbrance.state": encumbranceState
});
}
}