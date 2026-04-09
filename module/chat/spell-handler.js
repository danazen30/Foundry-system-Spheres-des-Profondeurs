import { SimpleDialog } from "../apps/simple-dialog.js";

export function registerSpellHandlers(html) {

  // =========================
  // CRIT SUCCESS
  // =========================

html.find(".spell-crit-success").off("click").on("click", ev => {

  ChatMessage.create({
    content: `
      <div class="sdp-spell-result">

        <h3>Critical Success</h3>

        <ul>

          <li>
            <strong>Critical Damage:</strong><br>
            Double all damage dice rolled if the spell deals damage.
          </li>

          <li>
            <strong>Ambient Mana:</strong><br>
            You draw mana from your surroundings (WPB meters).<br>
            You may drain fauna, flora, or nearby humanoids.<br>
            If insufficient, remaining cost is paid with health.
          </li>

          <li>
            <strong>Multiple Concentration:</strong><br>
            You may sustain a second concentration spell.
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

    const tableName =
  severity === "major"
    ? "Major magical consequence"
    : "Minor magical consequence";

const table = game.tables.getName(tableName);

if (!table){
  ui.notifications.error(`Table not found: ${tableName}`);
  return;
}

await table.draw();

    let resultText = "";

    if (severity === "minor"){
      resultText = `Minor magical backlash (${roll.total})`;
    } else {
      resultText = `MAJOR magical catastrophe (${roll.total})`;
    }

    ChatMessage.create({
      content: `
        <h3>Magical Consequence</h3>
        <p><strong>Severity:</strong> ${severity.toUpperCase()}</p>
        <p><strong>Roll:</strong> ${roll.total}</p>
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

    const apply = (selector, label) => {

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
        apply(".spell-range", "Range");
        break;

      case "duration":
        apply(".spell-duration", "Duration");
        break;

      case "target":
        apply(".spell-target-count", "Targets");
        break;

      case "aoe":
        apply(".spell-radius", "Radius");
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
        `<strong>Overcast:</strong> ${overcast}`;
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
    ui.notifications.warn("Not enough overcast");
    return;
  }

  // =========================
  // APPLY EFFECT
  // =========================

const base = Number(btn.dataset.base || 0);
let current = Number(btn.dataset.value || base);

const newValue = current + base;

  btn.dataset.value = newValue;

  const label = btn.dataset.label;

  btn.innerHTML = `${label}: ${newValue}`;

  // =========================
  // UPDATE OVERCAST
  // =========================

 overcast -= 1;

  card.dataset.overcast = overcast;

  const overcastEl = card.querySelector(".spell-overcast");

  if (overcastEl){
    overcastEl.innerHTML =
      `<strong>Overcast:</strong> ${overcast}`;
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

}