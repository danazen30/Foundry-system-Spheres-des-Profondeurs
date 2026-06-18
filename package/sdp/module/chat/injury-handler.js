import {
  getInjuryFromPack,
  prepareAppliedInjuryData
} from "../system/injury-utils.js";

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

  ChatMessage.create({

  speaker: ChatMessage.getSpeaker({actor}),

  whisper: ChatMessage.getWhisperRecipients("GM"),

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

    ${consequence ? `
      <div class="injury-preview">
        <p><strong>${consequence.name}</strong></p>
        <p>${consequence.system.description || ""}</p>
      </div>
    ` : `<p>${game.i18n.localize("SDP.NoConsequenceFound")}</p>`}

  </div>
  `
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
