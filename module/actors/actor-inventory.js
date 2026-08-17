export class SdpActorInventory {

  static getTotalEncumbrance(actor) {

  let total = 0;

  for (const item of actor.items.contents) {

    const enc = Number(item.system.encumbrance?.value || 0);
    const qty = Number(item.system.quantity?.value || 1);

    let weight = enc * qty;

    // 🔥 SI DANS CONTAINER → poids réduit
    if (item.system.containerId) {

  const container =
    actor.items.get(
      item.system.containerId
    );

  const reduction =
    Number(
      container?.system?.reduction?.value ?? 0.5
    );

  weight *= reduction;

}

    total += weight;
  }

  return Math.round(total * 100) / 100;
}

static applyEncumbrance(actor) {

  let total = 0;

for (let item of actor.items) {

  const enc = Number(item.system.encumbrance?.value || 0);
  if (!enc) continue;

  const qty = Number(item.system.quantity?.value ?? 1);

  let weight = enc * qty;

  // 🔥 container logic
 if (item.system.containerId) {

  const container =
    actor.items.get(
      item.system.containerId
    );

  const reduction =
    Number(
      container?.system?.reduction?.value ?? 0.5
    );

  weight *= reduction;

}

  total += weight;
  total = Math.round(total * 100) / 100;

}

    const STR = actor.system.attributes?.strength?.value || 0;
const TGH = actor.system.attributes?.toughness?.value || 0;

const max =
  actor.system.derived?.carryingCapacity?.value ??
  Math.floor((STR + TGH) / 2);
const ratio = max > 0 ? total / max : (total > 0 ? Infinity : 0);

let encumbranceState = {
  level: 0,
  label: ""
};

if (ratio > 3) {
  encumbranceState = {
    level: 3,
    label: "SDP.EncumbranceState.Immobile"
  };
}
else if (ratio > 2) {
  encumbranceState = {
    level: 2,
    label: "SDP.EncumbranceState.Heavy"
  };
}
else if (ratio > 1) {
  encumbranceState = {
    level: 1,
    label: "SDP.EncumbranceState.Light"
  };
}

actor.system.resources.encumbrance =
  actor.system.resources.encumbrance || {};

actor.system.resources.encumbrance.value = total;

actor.system.resources.encumbrance.max = max;

actor.system.resources.encumbrance.state = encumbranceState;
}
}