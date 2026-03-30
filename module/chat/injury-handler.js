export function registerInjuryHandlers(html, message) {

const difficultyMap = {
  light: 0,
  moderate: -10,
  severe: -20,
  critical: -30
};

async function getInjuryFromPack(location, severity, isConsequence = false) {

  const pack = game.packs.get("sdp.injuries");
  if (!pack) return null;

  const docs = await pack.getDocuments();

  return docs.find(i =>
    i.system.location === location &&
    i.system.severity === severity &&
    i.system.consequence === isConsequence
  );
}

html.find(".apply-injury").click(async ev => {

  const card = ev.currentTarget.closest(".sdp-injury-gm");

  const actorId = card.dataset.actor;
  const location = card.dataset.location;
  const severity = card.dataset.severity;

  const actor = game.actors.get(actorId);

  const injury = await getInjuryFromPack(location, severity);

  if (!injury) {
    ui.notifications.warn("No injury found");
    return;
  }

  await actor.createEmbeddedDocuments("Item", [injury.toObject()]);
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
      <h3>Resistance Test</h3>
      <p>Severity: ${severity}</p>
      <p>Target: ${target}</p>
      <p>Roll: ${result}</p>
      <p><strong>${success ? "SUCCESS" : "FAILURE"}</strong></p>
    `
  });

if (!success) {

  const location = card.dataset.location;

  const consequence = await getInjuryFromPack(location, severity, true);

  ChatMessage.create({

  speaker: ChatMessage.getSpeaker({actor}),

  whisper: ChatMessage.getWhisperRecipients("GM"),

  content: `
  <div class="sdp-consequence-card"
       data-actor="${actor.id}"
       data-location="${location}"
       data-severity="${severity}">

    <h3>Resistance Failed</h3>

    <p>Additional consequence triggered</p>

    <button class="apply-consequence">
      Apply Consequence
    </button>

    ${consequence ? `
      <div class="injury-preview">
        <p><strong>${consequence.name}</strong></p>
        <p>${consequence.system.description || ""}</p>
      </div>
    ` : "<p>No consequence found</p>"}

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
    ui.notifications.warn("No consequence found");
    return;
  }

  await actor.createEmbeddedDocuments("Item", [consequence.toObject()]);

});

}