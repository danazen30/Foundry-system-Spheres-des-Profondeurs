/**
 * Editable flat / % / dice damage modifiers on attack / spell / ability chat cards.
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
  <label class="sdp-damage-mod">
    <span>${game.i18n.localize("SDP.ChatDamageDice")}</span>
    <input type="text" class="sdp-damage-dice" value="" placeholder="0" spellcheck="false">
  </label>
</div>
`;
}

/**
 * Allow only NdN terms joined by + (e.g. 1d4, 2d6+1d4).
 * @param {unknown} raw
 * @returns {string}
 */
export function sanitizeChatDiceFormula(raw) {
  if (raw == null) return "";
  const cleaned = String(raw).trim().toLowerCase().replace(/\s+/g, "");
  if (!cleaned) return "";
  if (!/^(\d+d\d+)(\+\d+d\d+)*$/.test(cleaned)) return "";
  return cleaned.replace(/\+/g, " + ");
}

/**
 * Read chat-card damage mods. Empty / invalid → 0 / "".
 * Falls back to data-chat-* on the card (resolve macro path).
 * @param {HTMLElement|null} card
 * @returns {{ flat: number, percent: number, dice: string }}
 */
export function readDamageModsFromCard(card) {
  if (!card) return { flat: 0, percent: 0, dice: "" };

  const flatRaw =
    card.querySelector(".sdp-damage-flat")?.value
    ?? card.dataset.chatFlat;
  const percentRaw =
    card.querySelector(".sdp-damage-percent")?.value
    ?? card.dataset.chatPercent;
  const diceRaw =
    card.querySelector(".sdp-damage-dice")?.value
    ?? card.dataset.chatDice
    ?? "";

  const flat = Number(flatRaw);
  const percent = Number(percentRaw);

  return {
    flat: Number.isFinite(flat) ? flat : 0,
    percent: Number.isFinite(percent) ? percent : 0,
    dice: sanitizeChatDiceFormula(diceRaw)
  };
}
