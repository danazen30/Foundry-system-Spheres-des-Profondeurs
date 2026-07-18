import { getCost, getTalentCost, getTalentMax} from "./actor-sheet-utils.js";

import { SimpleDialog } from "../apps/simple-dialog.js";

export function registerXPListeners(sheet, root) {

  const actor = sheet.document;

  // =========================
  // SKILL ADVANCE
  // =========================

  root.querySelectorAll('[data-action="advanceSkill"]').forEach(el => {

    el.addEventListener("click", async (event) => {

      const item = actor.items.get(
        event.currentTarget.dataset.itemId
      );

      const current = item.system.advances || 0;
      const cost = getCost("skill", current);

      const xp = actor.system.details.experience;
      const available = xp.total - xp.spent;

      if (available < cost) {
        ui.notifications.warn(
  game.i18n.localize(
    "SDP.Warning.NotEnoughXP"
  )
);
        return;
      }

      await item.update({
        "system.advances": current + 1
      });

      await actor.update({
        "system.details.experience.spent":
          xp.spent + cost
      });

      await sheet._addXPLog({
        type: "spend",
        amount: cost,
        targetType: "skill",
        targetRef: item.id,
        old: current,
        value: current + 1
      });

    });

    // RIGHT CLICK
    el.addEventListener("contextmenu", async (event) => {

      event.preventDefault();

      const item = actor.items.get(
        event.currentTarget.dataset.itemId
      );

      const current = item.system.advances || 0;

      if (current <= 0) return;

      const newValue = current - 1;

      const cost = getCost("skill", newValue);

      const xp = actor.system.details.experience;

      await item.update({
        "system.advances": newValue
      });

      await actor.update({
        "system.details.experience.spent":
          Math.max(0, xp.spent - cost)
      });

      await sheet._addXPLog({
        type: "refund",
        amount: cost,
        targetType: "skill",
        targetRef: item.id,
        old: current,
        value: newValue
      });

    });

  });

  // =========================
  // ATTRIBUTE ADVANCE
  // =========================

  root.querySelectorAll('[data-action="advanceAttribute"]').forEach(el => {

    el.addEventListener("click", async (event) => {

      const key = event.currentTarget.dataset.attr;

      const current =
        actor.system.attributes[key].advances || 0;

      const cost = getCost("attribute", current);

      const xp = actor.system.details.experience;
      const available = xp.total - xp.spent;

      if (available < cost) {
        ui.notifications.warn(
  game.i18n.localize(
    "SDP.Warning.NotEnoughXP"
  )
);
        return;
      }

      await actor.update({
        [`system.attributes.${key}.advances`]:
          current + 1,

        "system.details.experience.spent":
          xp.spent + cost
      });

      await sheet._addXPLog({
        type: "spend",
        amount: cost,
        targetType: "attribute",
        targetRef: key,
        old: current,
        value: current + 1
      });

    });

    // RIGHT CLICK
    el.addEventListener("contextmenu", async (event) => {

      event.preventDefault();

      const key = event.currentTarget.dataset.attr;

      const current =
        actor.system.attributes[key].advances || 0;

      if (current <= 0) return;

      const newValue = current - 1;

      const cost = getCost("attribute", newValue);

      const xp = actor.system.details.experience;

      await actor.update({
        [`system.attributes.${key}.advances`]:
          newValue,

        "system.details.experience.spent":
          Math.max(0, xp.spent - cost)
      });

      await sheet._addXPLog({
        type: "refund",
        amount: cost,
        targetType: "attribute",
        targetRef: key,
        old: current,
        value: newValue
      });

    });

  });

  // =========================
  // TALENT ADVANCE
  // =========================

  root.querySelectorAll('[data-action="advanceTalent"]').forEach(el => {

    el.addEventListener("click", async (event) => {

      const item = actor.items.get(
        event.currentTarget.dataset.itemId
      );

      const current = item.system.advances || 0;

      const cost = getTalentCost(current);

      const xp = actor.system.details.experience;
      const available = xp.total - xp.spent;

      if (available < cost) {
        ui.notifications.warn(
  game.i18n.localize(
    "SDP.Warning.NotEnoughXP"
  )
);
        return;
      }

      const max = getTalentMax(actor, item);

      if (current >= max) {
        ui.notifications.warn(
  game.i18n.localize(
    "SDP.Warning.TalentMax"
  )
);
        return;
      }

      await item.update({
        "system.advances": current + 1
      });

      await actor.update({
        "system.details.experience.spent":
          xp.spent + cost
      });

      await sheet._addXPLog({
        type: "spend",
        amount: cost,
        targetType: "talent",
        targetRef: item.id,
        old: current,
        value: current + 1
      });

    });

    // RIGHT CLICK
    el.addEventListener("contextmenu", async (event) => {

      event.preventDefault();

      const item = actor.items.get(
        event.currentTarget.dataset.itemId
      );

      const current = item.system.advances || 0;

      if (current <= 0) return;

      const newValue = current - 1;

      const cost = getTalentCost(newValue);

      const xp = actor.system.details.experience;

      await item.update({
        "system.advances": newValue
      });

      await actor.update({
        "system.details.experience.spent":
          Math.max(0, xp.spent - cost)
      });

      await sheet._addXPLog({
        type: "refund",
        amount: cost,
        targetType: "talent",
        targetRef: item.id,
        old: current,
        value: newValue
      });

    });

  });

  // =========================
  // UPDATE XP
  // =========================

  root.querySelectorAll('[data-action="updateXP"]').forEach(el => {

    el.addEventListener("change", async (event) => {

      if (!game.user.isGM) return;

      const input = event.currentTarget;
      const type = input.dataset.type;

      const newValue =
        Number(input.value) || 0;

      const xp = actor.system.details.experience;

      let oldValue = 0;

      if (type === "total") oldValue = xp.total || 0;
      if (type === "spent") oldValue = xp.spent || 0;

      const diff = newValue - oldValue;

      if (diff === 0) return;

      input.value = oldValue;

      new SimpleDialog({
        title:
  game.i18n.localize(
    "SDP.Dialog.XPChangeTitle"
  ),

        content: `
  <p>
    ${game.i18n.localize(
      "SDP.XPChange"
    )} :
    ${diff > 0 ? "+" : ""}${diff} XP
  </p>

  <label>
    ${game.i18n.localize(
      "SDP.Reason"
    )}
  </label>

  <input
    type="text"
    id="xp-reason"
    placeholder="${game.i18n.localize(
      "SDP.PlaceholderReason"
    )}"
  />
`,

        buttons: {

          confirm: {

            label:
  game.i18n.localize(
    "SDP.Apply"
  ),

            callback: async (app) => {

              const reason =
                app.element.querySelector("#xp-reason")
                  .value || "";

              if (type === "total") {

                await actor.update({
                  "system.details.experience.total":
                    newValue
                });

              }

              if (type === "spent") {

                await actor.update({
                  "system.details.experience.spent":
                    newValue
                });

              }

              await sheet._addXPLog({
                type:
                  diff > 0
                    ? "gain"
                    : "refund",

                amount: Math.abs(diff),

                targetType: "manual",
                targetRef:
                  type === "total"
                    ? "SDP.Total"
                    : "SDP.Spent",

                old: oldValue,

                value: newValue,

                reason
              });

            }

          },

          cancel: {
            label:
  game.i18n.localize(
    "SDP.Cancel"
  )
          }

        }

      }).render(true);

    });

  });

  // =========================
  // TOOLTIP COSTS
  // =========================

  root.querySelectorAll('[data-action="advanceAttribute"]').forEach(el => {

    const key = el.dataset.attr;

    const current =
      actor.system.attributes[key].advances || 0;

    const cost = getCost("attribute", current);

   el.title =
  game.i18n.format(
    "SDP.XPCost",
    { cost }
  );

  });

  root.querySelectorAll('[data-action="advanceSkill"]').forEach(el => {

    const item = actor.items.get(el.dataset.itemId);

    const current = item.system.advances || 0;

    const cost = getCost("skill", current);

    el.title =
  game.i18n.format(
    "SDP.XPCost",
    { cost }
  );

  });

  root.querySelectorAll('[data-action="advanceTalent"]').forEach(el => {

    const item = actor.items.get(el.dataset.itemId);

    const current = item.system.advances || 0;

    const cost = getTalentCost(current);

    el.title =
  game.i18n.format(
    "SDP.XPCost",
    { cost }
  );

  });

  // =========================
  // LEVEL UP
  // =========================

  root.querySelectorAll('[data-action="levelUp"]').forEach(el => {

    el.addEventListener("click", () => {
      if (!game.user.isGM) return;
      sheet._onLevelUp();
    });

  });

}