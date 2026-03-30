export function registerConditionHandlers(html, message) {

/* ========================= */
/* STUNNED TEST              */
/* ========================= */

html.find(".stunned-roll").click(async ev => {

  const card = ev.currentTarget.closest(".sdp-stunned-test");

  const actorId = card.dataset.actor;
  const conditionKey = card.dataset.condition;

  const actor = game.actors.get(actorId);

  const stack = actor.system.conditionTotals?.[conditionKey] ?? 0;

  const resistance = actor.items.find(i =>
    i.type === "skill" && i.system.key === "resistance"
  );

  const target = resistance?.system.value ?? actor.system.attributes.toughness.value;

  const roll = await (new Roll("1d100")).roll();

  const result = roll.total;

  const SL = Math.floor(target / 10) - Math.floor(result / 10);

  let removed = 0;

  if(result <= target){
    removed = Math.max(SL,1);
  }

  const newStack = Math.max(stack - removed,0);

  roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `
    <h3>Stunned Test</h3>

    <p>Target: ${target}</p>
    <p>Roll: ${result}</p>
    <p>SL: ${SL}</p>

    <p><strong>Stacks removed: ${removed}</strong></p>
    ${newStack === 0 ? "<p><strong>Exhausted gained</strong></p>" : ""}
    `
  });
await actor.update({
  [`system.conditions.${conditionKey}`]: newStack
});


// =========================
// APPLY EXHAUSTED IF RECOVERED
// =========================

if(newStack === 0){

  await actor.update({
  "system.conditions.exhausted":
    (actor.system.conditions.exhausted || 0) + 1,
  "system.conditionOverride.-=exhausted": null
});

}

});


/* ========================= */
/* POISON TEST               */
/* ========================= */

html.find(".poison-roll").click(async ev => {

  const button = ev.currentTarget;

  if(button.dataset.used) return;
  button.dataset.used = true;

  const card = button.closest(".sdp-poison-test");

  const actorId = card.dataset.actor;
  const conditionKey = card.dataset.condition;

  const actor = game.actors.get(actorId);

  // ✅ BASE + EFFECT
  const total = actor.system.conditions?.[conditionKey] ?? 0;
  if(total <= 0) return;

  const resistance = actor.items.find(i =>
    i.type === "skill" && i.system.key === "resistance"
  );

  const target = resistance?.system.value ?? actor.system.attributes.toughness.value;

  const roll = await (new Roll("1d100")).roll();

  const result = roll.total;

  const SL = Math.floor(target / 10) - Math.floor(result / 10);

  let removed = 0;

  if(result <= target){
    removed = Math.max(SL,1);
  }
const newTotal = Math.max(total - removed, 0);

await actor.update({
  [`system.conditions.${conditionKey}`]: newTotal
});

  roll.toMessage({
    speaker: ChatMessage.getSpeaker({actor}),
    flavor: `
    <h3>Poison Test</h3>
    <p>Target: ${target}</p>
    <p>Roll: ${result}</p>
    <p>SL: ${SL}</p>
    <p><strong>Stacks removed: ${removed}</strong></p>
    ${newTotal === 0 ? "<p><strong>Exhausted gained</strong></p>" : ""}
    `
  });

  await actor.update({
  [`system.conditions.${conditionKey}`]: newTotal
});

  if(newTotal === 0){
    await actor.update({
      "system.conditions.exhausted":
        (actor.system.conditions.exhausted || 0) + 1
    });
  }

});

html.find(".calm-roll").click(async ev => {

 const card = ev.currentTarget.closest(".sdp-calm-test");

const actorId = card.dataset.actor;

const actor = game.actors.get(actorId);

const calmSkill = actor.items.find(i =>
  i.type === "skill" && i.system.key === "calm"
);

const target = calmSkill?.system.value ?? actor.system.attributes.willpower.value;

const roll = await new Roll("1d100").roll();

const result = roll.total;

const rollTen = Math.floor(result / 10);
const targetTen = Math.floor(target / 10);

const SL = targetTen - rollTen;

const success = result <= target;

let consequenceText = "";

if(success){

  await actor.update({
    "system.conditions.frightened": false,
    "system.conditions.shaken": true
  });

  consequenceText = `
  <p><strong>Frightened removed</strong></p>
  <p>Shaken applied</p>
  `;

}else{

  consequenceText = `<p>Frightened remains</p>`;

}

await roll.toMessage({

  speaker: ChatMessage.getSpeaker({actor}),

  flavor: `
  <h3>Calm Test</h3>

  <p>Target: ${target}</p>
  <p>Roll: ${result}</p>
  <p>SL: ${SL}</p>

  <p><strong>${success ? "SUCCESS" : "FAILURE"}</strong></p>

  ${consequenceText}
  `

});

});

/* ========================= */
/* ENTANGLED TEST            */
/* ========================= */

html.find(".strength-roll").click(async ev => {

  const card = ev.currentTarget.closest(".sdp-strength-test");

  const actorId = card.dataset.actor;

  const actor = game.actors.get(actorId);

  const target = actor.system.attributes.strength.value;

  const roll = await new Roll("1d100").roll();

  const result = roll.total;

  const SL =
    Math.floor(target / 10) -
    Math.floor(result / 10);

  let success = result <= target;

  let consequenceText = "";

  if(success){

    let slowed = actor.system.conditions.slowed ?? 0;

    let removed = Math.min(slowed, SL);

    if(removed > 0){

      await actor.update({
        "system.conditions.slowed": slowed - removed
      });

    }

    await actor.update({
      "system.conditions.entangled": false
    });

    consequenceText = `
    <p><strong>Entangled removed</strong></p>
    <p>Slowed removed: ${removed}</p>
    `;

  }else{

    consequenceText = `<p>Still entangled</p>`;

  }

  await roll.toMessage({

    speaker: ChatMessage.getSpeaker({actor}),

    flavor: `
    <h3>Strength Test</h3>

    <p>Target: ${target}</p>
    <p>Roll: ${result}</p>
    <p>SL: ${SL}</p>

    <p><strong>${success ? "SUCCESS" : "FAILURE"}</strong></p>

    ${consequenceText}
    `

  });

});

/* ========================= */
/* DYING TEST                */
/* ========================= */

html.find(".dying-roll").click(async ev => {

  const card = ev.currentTarget.closest(".sdp-dying-test");

  const actor = game.actors.get(card.dataset.actor);

  const resistance = actor.items.find(i =>
    i.type === "skill" && i.system.key === "resistance"
  );

  const target =
    resistance?.system.value ??
    actor.system.attributes.toughness.value;

  const roll = await new Roll("1d100").roll();

  const result = roll.total;

  const success = result <= target;

  let hpLossText = "";

  if(!success){

    const newHP = actor.system.health.value - 1;

    await actor.update({
      "system.health.value": newHP
    });

    hpLossText = `<p>Lose 1 Health</p>`;

  }

  // =========================
  // DEATH CHANCE (BLEEDING + POISON)
  // =========================

  const bleeding = actor.system.conditions.bleeding ?? 0;
  const poisoned = actor.system.conditions.poisoned ?? 0;

  const stacks = bleeding + poisoned;

  let deathText = "";

  if(stacks > 0){

    const deathChance = stacks * 10;

    const deathRoll = await new Roll("1d100").roll();

    if(deathRoll.total <= deathChance){

      deathText = `
      <p><strong>Death Check</strong></p>
      <p>Chance: ${deathChance}%</p>
      <p>Roll: ${deathRoll.total}</p>
      <p><strong>${actor.name} dies in agony.</strong></p>
      `;

    }else{

      deathText = `
      <p>Death Check: ${deathChance}%</p>
      <p>Roll: ${deathRoll.total}</p>
      <p>Survived</p>
      `;

    }

  }

  await roll.toMessage({

    speaker: ChatMessage.getSpeaker({actor}),

    flavor: `
    <h3>Dying Test</h3>

    <p>Target: ${target}</p>
    <p>Roll: ${result}</p>

    <p><strong>${success ? "SUCCESS" : "FAILURE"}</strong></p>

    ${hpLossText}

    ${deathText}
    `

  });



// =========================
// WOUND THRESHOLD DEATH
// =========================

const threshold = actor.system.derived.woundThreshold.value;

if(Math.abs(actor.system.health.value) > threshold){

  await ChatMessage.create({

    content: `
    <h3>Death</h3>

    <p>${actor.name} dies from their wounds.</p>
    `
  });

}

});

}