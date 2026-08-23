/**
 * Editable flat / % damage modifiers on attack / spell / ability chat cards.
 */

export function buildDamageModsControlsHtml() {
  return `
<div class="sdp-damage-mods">
  <label class="sdp-damage-mod">
    <span>${game.i18n.localize("SDP.ChatDamageFlat")}</span>
    <input type="number" class="sdp-damage-flat" value="" step="1" placeholder="0">
  </label>
  <label class="sdp-damage-mod">
    <span>${game.i18n.localize("SDP.ChatDamagePercent")}</span>
    <input type="number" class="sdp-damage-percent" value="" step="1" placeholder="0">
  </label>
</div>
`;
}

/**
 * Read chat-card damage mods. Empty / invalid → 0.
 * @param {HTMLElement|null} card
 * @returns {{ flat: number, percent: number }}
 */
export function readDamageModsFromCard(card) {
  if (!card) return { flat: 0, percent: 0 };

  const flatRaw = card.querySelector(".sdp-damage-flat")?.value;
  const percentRaw = card.querySelector(".sdp-damage-percent")?.value;

  const flat = Number(flatRaw);
  const percent = Number(percentRaw);

  return {
    flat: Number.isFinite(flat) ? flat : 0,
    percent: Number.isFinite(percent) ? percent : 0
  };
}
