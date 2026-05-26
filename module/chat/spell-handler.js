import { SimpleDialog } from "../apps/simple-dialog.js";

export function registerSpellHandlers(html) {

  // =========================
  // CRIT SUCCESS
  // =========================

html.find(".spell-crit-success").off("click").on("click", ev => {

  ChatMessage.create({
    content: `
      <div class="sdp-spell-result">

        <h3>${game.i18n.localize("SDP.CriticalSuccess")}</h3>

        <ul>

          <li>
            <strong>${game.i18n.localize("SDP.CriticalDamage")}:</strong><br>
${game.i18n.localize("SDP.CriticalDamageDescription")}
          </li>

          <li>
           <strong>${game.i18n.localize("SDP.AmbientMana")}:</strong><br>
${game.i18n.localize("SDP.AmbientManaDescription")}
          </li>

          <li>
            <strong>${game.i18n.localize("SDP.MultipleConcentration")}:</strong><br>
${game.i18n.localize("SDP.MultipleConcentrationDescription")}
          </li>

        </ul>

      </div>
    `
  });

});

  // =========================
  // CRIT FAILURE
  // =========================

  html.find(".spell-crit-failure").click(async ev => {

    const severity = ev.currentTarget.dataset.severity || "minor";

    let formula = "1d10";

    if (severity === "major"){
      formula = "1d20";
    }

   let tableConfig = null;

switch (severity) {

  case "major":

    tableConfig =
      CONFIG.SDP.rollTables
        .majorMagicalConsequence;

    break;

  default:

    tableConfig =
      CONFIG.SDP.rollTables
        .minorMagicalConsequence;

    break;
}

if (!tableConfig) {

  ui.notifications.warn(
    game.i18n.localize(
      "SDP.Warning.CriticalTableNotConfigured"
    )
  );

  return;
}

const pack =
  game.packs.get(
    "sdp.rolltables"
  );

const tables =
  await pack.getDocuments();

  const table = tables.find(t => {

  const normalizedName =
    (t.name || "")
      .toLowerCase()
      .trim();

  return (
    normalizedName ===
    tableConfig.key
      .toLowerCase()
      .trim()
      .replaceAll("-", " ")
  );

});

if (!table) {

  ui.notifications.warn(

    game.i18n.format(
      "SDP.Warning.TableNotFound",
      {
        table: localizedTableName
      }
    )

  );

  return;
}

// POTENTIEL BUG ICI
const roll = await new Roll(formula).roll();
const originalName = table.name;

table.name = game.i18n.localize(
  tableConfig.label
);
await table.draw();
table.name = originalName;

    let resultText = "";

    if (severity === "minor"){
      resultText = game.i18n.format(
  "SDP.MinorMagicalBacklash",
  { roll: roll.total }
);
    } else {
      resultText = game.i18n.format(
  "SDP.MajorMagicalCatastrophe",
  { roll: roll.total }
);
    }

    ChatMessage.create({
      content: `
        <h3>${game.i18n.localize("SDP.MagicalConsequence")}</h3>
        <p>
  <strong>${game.i18n.localize("SDP.Severity")}:</strong>
  ${game.i18n.localize(
    severity === "major"
      ? "SDP.MagicConsequenceMajor"
      : "SDP.MagicConsequenceMinor"
  )}
</p>
        <p>
  <strong>${game.i18n.localize("SDP.Roll")}:</strong>
  ${roll.total}
</p>
        <p>${resultText}</p>
      `
    });

  });

}

export function registerOvercastHandlers(html){

  html.find(".overcast-click").click(async ev => {

    const el = ev.currentTarget;
const card = el.closest(".sdp-spell");

const type = el.dataset.type;

    let overcast = Number(card.dataset.overcast || 0);
    let used = Number(card.dataset.overcastUsed || 0);

    if (overcast <= 0) return;

    // =========================
    // APPLY EFFECT
    // =========================

    const apply = (selector) => {

  const el = card.querySelector(selector);
  if (!el) return;

  const base = Number(el.dataset.base || 0);
  let current = Number(el.dataset.value || base);

  const newValue = current + base;

  el.dataset.value = newValue;

  // 🔥 IMPORTANT : on ne touche plus au bouton
  const valueEl = el.querySelector(".value");

 if (valueEl){
  valueEl.innerHTML = `${newValue}`;
}
};

    switch(type){

      case "range":
        apply(
  ".spell-range",
  game.i18n.localize("SDP.Range")
);
        break;

      case "duration":
        apply(
  ".spell-duration",
  game.i18n.localize("SDP.Duration")
);
        break;

      case "target":
        apply(
  ".spell-target-count",
  game.i18n.localize("SDP.Targets")
);
        break;

      case "aoe":
        apply(
  ".spell-radius",
  game.i18n.localize("SDP.Radius")
);
        break;

      case "special": {

  const el = ev.currentTarget;

  const base = Number(el.dataset.base || 0);
  let current = Number(el.dataset.value || base);

  const newValue = current + base;

  el.dataset.value = newValue;

  const valueEl = el.querySelector(".value");

  if (valueEl){
    valueEl.innerHTML = newValue;
  }

  break;
}
    }

    // =========================
    // UPDATE OVERCAST
    // =========================

    overcast -= 1;
    used += 1;

    card.dataset.overcast = overcast;
    card.dataset.overcastUsed = used;

    const overcastEl = card.querySelector(".spell-overcast");

    if (overcastEl){
      overcastEl.innerHTML =
        `<strong>${game.i18n.localize("SDP.Overcast")}:</strong> ${overcast}`;
    }

    // =========================
    // UPDATE MESSAGE
    // =========================

    const message = game.messages.get(
      card.closest(".message").dataset.messageId
    );

    const wrapper = document.createElement("div");
    wrapper.appendChild(card.cloneNode(true));

    await message.update({
      content: wrapper.innerHTML
    });

  });

html.find(".overcast-special-btn").click(async ev => {

  const btn = ev.currentTarget;
  const card = btn.closest(".sdp-spell");

  let overcast = Number(card.dataset.overcast || 0);

  if (overcast < 1){
    ui.notifications.warn(
  game.i18n.localize("SDP.NotEnoughOvercast")
);
    return;
  }

  // =========================
  // APPLY EFFECT
  // =========================

const base = Number(btn.dataset.base || 0);
let current = Number(btn.dataset.value || base);

const newValue = current + base;

  btn.dataset.value = newValue;

  const labelKey = btn.dataset.label;

btn.innerHTML = `
${game.i18n.localize(labelKey)}: ${newValue}
`;

  // =========================
  // UPDATE OVERCAST
  // =========================

 overcast -= 1;

  card.dataset.overcast = overcast;

  const overcastEl = card.querySelector(".spell-overcast");

  if (overcastEl){
    overcastEl.innerHTML =
      `<strong>${game.i18n.localize("SDP.Overcast")}:</strong> ${overcast}`;
  }

  // =========================
  // UPDATE MESSAGE
  // =========================

  const message = game.messages.get(
    card.closest(".message").dataset.messageId
  );

  const wrapper = document.createElement("div");
  wrapper.appendChild(card.cloneNode(true));

  await message.update({
    content: wrapper.innerHTML
  });

});

html.find(".place-aoe").click(async ev => {

  ev.preventDefault();
  ev.stopPropagation();

  const btn = ev.currentTarget;

  // 🔥 VALEUR DYNAMIQUE (overcast inclus)
  const parent = btn.closest(".spell-radius");
  const radius = Number(parent?.dataset.value || btn.dataset.radius || 0);

  if (!canvas.scene) return;

  canvas.templates.activate();

  // 🔥 on attend UN clic sur la scène
  const layer = canvas.templates;

  const handler = async (event) => {

    // position du clic
    const pos = event.data.getLocalPosition(canvas.stage);

    const templateData = {
      t: "circle",
      user: game.user.id,
      distance: radius,
      x: pos.x,
      y: pos.y,
      fillColor: game.user.color
    };

    await canvas.scene.createEmbeddedDocuments("MeasuredTemplate", [templateData]);

    // 🔥 IMPORTANT → on enlève le listener après 1 clic
    layer.off("mousedown", handler);
  };

  layer.on("mousedown", handler);
});

// =========================
// RESET OVERCAST
// =========================

html.find(".reset-overcast").click(async ev => {

  const card =
    ev.currentTarget.closest(".sdp-spell");

  if (!card) return;

  // =========================
  // RESET ALL VALUES
  // =========================

  card.querySelectorAll(
    ".overcast-click"
  ).forEach(el => {

    const base =
      Number(el.dataset.base || 0);

    el.dataset.value = base;

    const valueEl =
      el.querySelector(".value");

    if (valueEl) {
      valueEl.innerHTML = base;
    }

  });

  // =========================
  // RESTORE OVERCAST
  // =========================

  const totalUsed =
    Number(card.dataset.overcastUsed || 0);

  const currentOvercast =
    Number(card.dataset.overcast || 0);

  const restored =
    currentOvercast + totalUsed;

  card.dataset.overcast =
    restored;

  card.dataset.overcastUsed =
    0;

  const overcastEl =
    card.querySelector(
      ".spell-overcast"
    );

  if (overcastEl) {

    overcastEl.innerHTML =
      `<strong>${game.i18n.localize("SDP.Overcast")}:</strong> ${restored}`;

  }

  // =========================
  // UPDATE MESSAGE
  // =========================

  const message =
    game.messages.get(
      card.closest(".message")
        .dataset.messageId
    );

  const wrapper =
    document.createElement("div");

  wrapper.appendChild(
    card.cloneNode(true)
  );

  await message.update({
    content: wrapper.innerHTML
  });

});

}