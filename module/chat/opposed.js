/**
 * One-shot opposed skill/attribute tests.
 * Click Oppose to arm a reference; next Oppose click or next roll resolves and clears.
 * On equal SL, higher roll target (with bonuses) wins.
 */

export function clearOpposedReference() {
  if (game.sdp) game.sdp.opposed = null;
}

export function setOpposedReference({
  SL,
  actor,
  actorId,
  target = 0,
  messageId = null
}) {
  game.sdp = game.sdp || {};
  game.sdp.opposed = {
    SL,
    actor,
    actorId,
    target: Number(target) || 0,
    messageId
  };
}

export function resolveOpposedOutcome({
  baseSL,
  baseActor,
  baseTarget = 0,
  challengerSL,
  challengerActor,
  challengerTarget = 0
}) {
  let finalSL = Math.abs(challengerSL - baseSL);
  let resultText;
  let wonByTarget = false;
  let isDraw = false;

  if (challengerSL > baseSL) {
    resultText = game.i18n.format("SDP.ActorWins", { actor: challengerActor });
  } else if (challengerSL < baseSL) {
    resultText = game.i18n.format("SDP.ActorWins", { actor: baseActor });
  } else if (challengerTarget > baseTarget) {
    finalSL = 0;
    wonByTarget = true;
    resultText = game.i18n.format("SDP.ActorWinsByTarget", {
      actor: challengerActor
    });
  } else if (challengerTarget < baseTarget) {
    finalSL = 0;
    wonByTarget = true;
    resultText = game.i18n.format("SDP.ActorWinsByTarget", {
      actor: baseActor
    });
  } else {
    resultText = game.i18n.localize("SDP.Draw");
    finalSL = 0;
    isDraw = true;
  }

  return { finalSL, resultText, wonByTarget, isDraw };
}

export function buildOpposedResultContent({
  baseActor,
  baseSL,
  challengerActor,
  challengerSL,
  finalSL,
  resultText,
  isDraw = false
}) {
  const dr = game.i18n.localize("SDP.SuccessLevel");
  const Roll = game.sdp?.Roll;
  const formattedFinal = Roll?.formatSL
    ? Roll.formatSL(finalSL, true)
    : String(finalSL);
  const quality = (!isDraw && Roll?.getSLLabel)
    ? ` (${Roll.getSLLabel(finalSL, true)})`
    : "";

  return `
    <h3>${game.i18n.localize("SDP.OpposedTest")}</h3>
    <p>${baseActor} ${dr}: ${baseSL}</p>
    <p>${challengerActor} ${dr}: ${challengerSL}</p>
    <p><strong>${game.i18n.localize("SDP.FinalSL")}: ${formattedFinal}${quality}</strong></p>
    <strong>${resultText}</strong>
  `;
}

/**
 * Post opposed result using the user's current Foundry roll mode.
 */
export async function createOpposedResultMessage({
  baseActor,
  baseSL,
  baseTarget = 0,
  challengerActor,
  challengerSL,
  challengerTarget = 0,
  speaker = null
} = {}) {

  const { finalSL, resultText, isDraw } = resolveOpposedOutcome({
    baseSL,
    baseActor,
    baseTarget,
    challengerSL,
    challengerActor,
    challengerTarget
  });

  const data = {
    content: buildOpposedResultContent({
      baseActor,
      baseSL,
      challengerActor,
      challengerSL,
      finalSL,
      resultText,
      isDraw
    }),
    speaker: speaker ?? ChatMessage.getSpeaker()
  };

  ChatMessage.applyRollMode(data, "roll");
  return ChatMessage.create(data);
}
