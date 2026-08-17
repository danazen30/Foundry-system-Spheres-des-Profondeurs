import {
  getInjuryFromPack,
  prepareAppliedInjuryData,
  buildInjuryKey,
  normalizeInjuryLocation
} from "../system/injury-utils.js";
import {
  getActorItemDisplayName,
  getLocalizedItemDescription,
  getLocalizedItemName
} from "../system/item-localization.js";
import {
  createCombatMessage,
  getCurrentRollMode
} from "./combat-visibility.js";

function getInjuryPreviewHtml(injury, {
  location = "",
  severity = "",
  consequence = false
} = {}) {

  if (!injury) return "";

  const key =
    (typeof injury.system?.key === "string"
      ? injury.system.key.trim()
      : "")
    || buildInjuryKey(
      severity || injury.system?.severity,
      normalizeInjuryLocation(
        location || injury.system?.location
      ),
      consequence || injury.system?.consequence
    );

  const name =
    getLocalizedItemName("injury", key, "")
    || getActorItemDisplayName(injury)
    || injury.name
    || "";

  const description =
    getLocalizedItemDescription(
      "injury",
      key,
      injury.system?.description || ""
    );

  return `
      <div class="injury-preview">
        <p><strong>${name}</strong></p>
        <p>${description}</p>
      </div>
  `;

}

export function registerInjuryHandlers(html, message) {

const difficultyMap = {
  light: 0,
  moderate: -10,
  severe: -20,
  critical: -30
};

html.find(".apply-injury").click(async ev => {

  const card = ev.currentTarget.closest(".sdp-injury-card");

  const actorId = card.dataset.actor;
  const location = card.dataset.location;
  const severity = card.dataset.severity;

  const actor = game.actors.get(actorId);

  const injury = await getInjuryFromPack(location, severity);

  if (!injury) {
    ui.notifications.warn(
  game.i18n.localize("SDP.NoInjuryFound")
);
    return;
  }

  await actor.createEmbeddedDocuments("Item", [
    prepareAppliedInjuryData(injury, location)
  ]);

});

html.find(".roll-resistance").click(async ev => {

  const card = ev.currentTarget.closest(".sdp-injury-card");

  const actorId = card.dataset.actor;
  const severity = card.dataset.severity;
  const location = card.dataset.location;

  const actor = game.actors.get(actorId);

  const resistance = actor.items.find(i =>
    i.type === "skill" && i.system.key === "resistance"
  );

  let target =
    resistance?.system.value ??
    actor.system.attributes.toughness.value;

  target += difficultyMap[severity] ?? 0;

  const roll = await new Roll("1d100").roll();
  const result = roll.total;

  const success = result <= target;

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `
      <h3>${game.i18n.localize("SDP.ResistanceTest")}</h3>
      <p>
  ${game.i18n.localize("SDP.Severity")}:
  ${game.i18n.localize(
    `SDP.InjurySeverity${severity.charAt(0).toUpperCase() + severity.slice(1)}`
  )}
</p>
      <p>${game.i18n.localize("SDP.Target")}: ${target}</p>
      <p>${game.i18n.localize("SDP.Roll")}: ${result}</p>
      <p>
  <strong>
    ${success
      ? game.i18n.localize("SDP.Success")
      : game.i18n.localize("SDP.Failure")}
  </strong>
</p>
    `
  });

if (!success) {

  const consequence = await getInjuryFromPack(location, severity, true);

  await createCombatMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    content: `
  <div class="sdp-consequence-card"
       data-actor="${actor.id}"
       data-location="${location}"
       data-severity="${severity}">

    <h3>${game.i18n.localize("SDP.ResistanceFailed")}</h3>

    <p>${game.i18n.localize("SDP.AdditionalConsequenceTriggered")}</p>

    <button class="apply-consequence">
      ${game.i18n.localize("SDP.ApplyConsequence")}
    </button>

    ${consequence ? getInjuryPreviewHtml(consequence, {
      location,
      severity,
      consequence: true
    }) : `<p>${game.i18n.localize("SDP.NoConsequenceFound")}</p>`}

  </div>
  `,
    defenderActor: actor,
    rollMode: getCurrentRollMode(),
    stage: "consequence",
    audience: "defender"
  });

}

});

html.find(".apply-consequence").click(async ev => {

  const card = ev.currentTarget.closest(".sdp-consequence-card");

  const actorId = card.dataset.actor;
  const location = card.dataset.location;
  const severity = card.dataset.severity;

  const actor = game.actors.get(actorId);

  const consequence = await getInjuryFromPack(location, severity, true);

  if (!consequence) {
    ui.notifications.warn(
  game.i18n.localize("SDP.NoConsequenceFound")
);
    return;
  }

  await actor.createEmbeddedDocuments("Item", [
    prepareAppliedInjuryData(consequence, location)
  ]);

});

}
