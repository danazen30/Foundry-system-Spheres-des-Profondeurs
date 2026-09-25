/**
 * Présentation des dés : Dice So Nice (on attend l'animation) ou
 * un seul son Foundry. Jamais les deux.
 *
 * DSN 5.x relance l'animation au chat (le flag skip n'existe qu'en 6.1+).
 * On coupe donc le hook chat après showForRoll.
 */

export function hasDiceSoNice() {
  return Boolean(game.dice3d?.showForRoll);
}

function messageAlreadyPresented(message) {
  return Boolean(
    message?.flags?.sdp?.dsnPresented
    || message?.flags?.["dice-so-nice"]?.skip
  );
}

async function withoutDiceSoNiceChatHook(callback) {

  const dice3d = game.dice3d;

  if (!dice3d) {
    return callback();
  }

  const previous = Boolean(dice3d.messageHookDisabled);
  dice3d.messageHookDisabled = true;

  try {
    return await callback();
  }
  finally {
    dice3d.messageHookDisabled = previous;
  }

}

/**
 * Empêche DSN de rejouer le même jet quand le message de chat arrive.
 */
export function registerDicePresentationHooks() {

  Hooks.on("diceSoNiceMessageProcessed", (messageId, query) => {

    const message = game.messages.get(messageId);

    if (messageAlreadyPresented(message)) {
      query.willTrigger3DRoll = false;
    }

  });

}

/**
 * Anime les dés (DSN) ou joue le son Foundry. N'envoie pas le chat.
 *
 * @param {Roll|Roll[]} rolls
 * @param {{synchronize?: boolean, whisper?: string[], blind?: boolean, user?: User}} [options]
 */
export async function presentDice(rolls, options = {}) {

  const list = (Array.isArray(rolls) ? rolls : [rolls])
    .flat()
    .filter((roll) => roll && roll._evaluated);

  if (!list.length) return;

  const {
    synchronize = true,
    whisper,
    blind,
    user = game.user
  } = options;

  if (hasDiceSoNice()) {

    await game.dice3d.showForRoll(
      combineEvaluatedRolls(list),
      user,
      synchronize,
      whisper,
      blind
    );

    return;

  }

  foundry.audio.AudioHelper.play(
    { src: CONFIG.sounds.dice },
    true
  );

}

function combineEvaluatedRolls(rolls) {

  if (rolls.length === 1) {
    return rolls[0];
  }

  const PoolTerm = foundry.dice.terms.PoolTerm;
  const RollClass = CONFIG.Dice.rolls?.[0] ?? Roll;

  if (!PoolTerm?.fromRolls || !RollClass?.fromTerms) {
    return rolls[0];
  }

  return RollClass.fromTerms([
    PoolTerm.fromRolls(rolls)
  ]);

}

/**
 * Options de message : pas de son Foundry, pas de 2e animation DSN.
 */
export function withPresentedDiceMessageData(messageData = {}) {

  const flags = foundry.utils.mergeObject(
    messageData.flags ?? {},
    {
      sdp: { dsnPresented: true },
      "dice-so-nice": { skip: true }
    },
    { inplace: false }
  );

  return {
    ...messageData,
    sound: null,
    flags
  };

}

/**
 * Envoie le chat après une présentation DSN, sans relancer l'animation.
 */
export async function sendPresentedDiceMessage(
  roll,
  messageData = {},
  options = {}
) {

  return withoutDiceSoNiceChatHook(() =>
    roll.toMessage(
      withPresentedDiceMessageData(messageData),
      options
    )
  );

}

/**
 * Évalue si besoin, présente les dés, puis envoie le chat.
 */
export async function presentRollToMessage(
  roll,
  messageData = {},
  options = {}
) {

  if (!roll) return null;

  if (!roll._evaluated) {
    await roll.evaluate();
  }

  await presentDice(roll, {
    whisper: messageData.whisper,
    blind: messageData.blind
  });

  return sendPresentedDiceMessage(roll, messageData, options);

}

/**
 * Tire une table sans chat ni animation.
 */
export async function drawTableSilent(table, drawOptions = {}) {

  if (!table) return null;

  return table.draw({
    ...drawOptions,
    displayChat: false
  });

}

/**
 * Présente les dés d'un ou plusieurs tirages, puis envoie le chat.
 */
export async function presentTableResults(
  table,
  draws,
  messageData = {}
) {

  const list = (Array.isArray(draws) ? draws : [draws])
    .filter(Boolean);

  const rolls = [];

  for (const draw of list) {

    const drawRolls = [
      draw.roll,
      ...(Array.isArray(draw.rolls) ? draw.rolls : [])
    ];

    for (const roll of drawRolls) {

      if (roll?._evaluated && !rolls.includes(roll)) {
        rolls.push(roll);
      }

    }

  }

  await presentDice(rolls);

  await withoutDiceSoNiceChatHook(async () => {

    for (const draw of list) {

      if (!draw.results?.length) continue;

      await table.toMessage(draw.results, {
        roll: draw.roll ?? rolls[0] ?? null,
        messageData: withPresentedDiceMessageData(messageData)
      });

    }

  });

}

/**
 * Tire une table sans chat, présente les dés, puis envoie le résultat.
 */
export async function presentTableDraw(table, drawOptions = {}) {

  if (!table) return null;

  const {
    messageData,
    ...tableDrawOptions
  } = drawOptions;

  const draw = await drawTableSilent(table, tableDrawOptions);

  await presentTableResults(table, [draw], messageData ?? {});

  return draw;

}
