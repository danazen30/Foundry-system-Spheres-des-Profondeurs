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