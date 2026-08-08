import { SdpRoll } from "../rolls/roll.js";
import { SdpSpell } from "../combat/spell.js";
import { SdpAbility } from "../combat/ability.js";
import { SdpWorkEngine } from "../system/work-engine.js";
import { SimpleDialog } from "../apps/simple-dialog.js";

import {
  getCost,
  getTalentCost
} from "./actor-sheet-utils.js";

export function registerInteractionListeners(sheet, root) {

  registerSkillContext(sheet, root);

  registerSkillAdv(sheet, root);

  registerMovement(sheet, root);

  registerAttributeModifiers(sheet, root);

  registerAttributeInitials(sheet, root);

  registerAttributeAdvances(sheet, root);

  registerSpellMemory(sheet, root);

  registerTalentAdv(sheet, root);

  registerCareer(sheet, root);

  registerXPTooltips(sheet, root);

  registerRest(sheet, root);

  registerContainers(sheet, root);

  registerDragAndDrop(sheet, root);

  registerWork(sheet, root);

  registerSpellCasting(sheet, root);

  registerAbilityUse(sheet, root);

  registerTraitDialogs(root);

}

function registerSkillContext(sheet, root) {

  root.querySelectorAll('[data-action="rollSkill"]').forEach(el => {

    el.addEventListener("contextmenu", (event) => {

      event.preventDefault();

      const item =
        sheet.document.items.get(
          event.currentTarget.dataset.itemId
        );

      if (!item) return;

      item.sheet.render(true);

    });

  });

}

function registerSkillAdv(sheet, root) {

  root.querySelectorAll('[data-action="updateSkillAdv"]').forEach(el => {

    el.addEventListener("change", async (event) => {

      if (!game.user.isGM) return;

      const input = event.currentTarget;

      const item =
        sheet.document.items.get(
          input.dataset.itemId
        );

      await item.update({
        "system.advances": Number(input.value) || 0
      });

    });

  });

}

function registerMovement(sheet, root) {

  root.querySelectorAll(".movement-value").forEach(el => {

    el.addEventListener("change", async (event) => {

      const input = event.currentTarget;

      const newDisplayed =
        Number(input.value) || 0;

      const actor = sheet.document;

      const slowed =
        actor.system.conditionTotals?.slowed ?? 0;

      const newBase =
        newDisplayed + slowed;

      await actor.update({
  "system.resources.movement.value":
    newBase
});

    });

  });

}

function registerAttributeInitials(sheet, root) {

  root.querySelectorAll(".attr-initial-input").forEach(el => {

    el.addEventListener("change", async (event) => {

      const input = event.currentTarget;
      const key = input.dataset.key;
      const actor = sheet.document;
      const typed = Number(input.value) || 0;
      const bonus = actor._getInitialFieldModifiers?.(key) ?? 0;
      const stored = actor._getStoredAttributeInitial(key);

      let newBase = typed;

      if (bonus > 0 && typed === stored + bonus) {
        newBase = stored;
      }

      if (newBase === stored) return;

      await actor.update({
        [`system.attributes.${key}.initial`]: newBase
      });

    });

  });

}

function registerAttributeAdvances(sheet, root) {

  root.querySelectorAll(".attr-advances-input").forEach(el => {

    el.addEventListener("change", async (event) => {

      if (!game.user.isGM) return;

      const input = event.currentTarget;
      const key = input.dataset.key;
      const value = Number(input.value) || 0;

      await sheet.document.update({
        [`system.attributes.${key}.advances`]: value
      });

    });

  });

}

function registerAttributeModifiers(sheet, root) {

  root.querySelectorAll(".attr-modifier-input").forEach(el => {

    el.addEventListener("change", async (event) => {

      if (!game.user.isGM) return;

      const input = event.currentTarget;

      const key = input.dataset.key;

      const value =
        Number(input.value) || 0;

      await sheet.document.update({
        [`system.attributes.${key}.modifier`]:
          value
      });

    });

  });

}

function registerSpellMemory(sheet, root) {

  root.querySelectorAll('[data-action="toggleSpellMemory"]').forEach(el => {

    el.addEventListener("click", (event) => {

      sheet._toggleSpellMemory(event);

    });

  });

}

function registerTalentAdv(sheet, root) {

  root.querySelectorAll('[data-action="updateTalentAdv"]').forEach(el => {

    el.addEventListener("change", async (event) => {

      const input = event.currentTarget;

      const item =
        sheet.document.items.get(
          input.dataset.itemId
        );

      await item.update({
        "system.advances": Number(input.value)
      });

    });

  });

}

function registerCareer(sheet, root) {

  root.querySelectorAll('[data-action="toggleCareerCurrent"]').forEach(el => {

    el.addEventListener("change", async (event) => {

      const item =
        sheet.document.items.get(
          event.currentTarget.dataset.itemId
        );

      await sheet._applyCareer(item);

    });

  });

  root.querySelectorAll('[data-action="toggleCareerCompleted"]').forEach(el => {

    el.addEventListener("change", async (event) => {

      const item =
        sheet.document.items.get(
          event.currentTarget.dataset.itemId
        );

      const actor = sheet.document;

      const checked =
        event.currentTarget.checked;

      const xp =
        actor.system.details.experience;

      const cost = 100;

      if (checked) {

        const available =
          xp.total - xp.spent;

        if (available < cost) {

         ui.notifications.warn(
  game.i18n.localize(
    "SDP.NotEnoughXPCompleteCareer"
  )
);

          event.currentTarget.checked = false;

          return;
        }

        await actor.update({
          "system.details.experience.spent":
            xp.spent + cost
        });

        await item.update({
          "system.completed": true
        });

        await sheet._addXPLog({
          type: "spend",
          amount: cost,
          targetType: "career",
          targetRef: item.id,
          targetSuffix: "SDP.CareerCompleted",
          old: "",
          value: ""
        });

      }

      else {

        await actor.update({
          "system.details.experience.spent":
            Math.max(0, xp.spent - cost)
        });

        await item.update({
          "system.completed": false
        });

        await sheet._addXPLog({
          type: "refund",
          amount: cost,
          targetType: "career",
          targetRef: item.id,
          targetSuffix: "SDP.CareerUncompleted",
          old: "",
          value: ""
        });

      }

    });

  });

}

function registerXPTooltips(sheet, root) {

  root.querySelectorAll('[data-action="advanceSkill"]').forEach(el => {

    const item =
      sheet.document.items.get(
        el.dataset.itemId
      );

    const current =
      item.system.advances || 0;

    const cost =
      getCost("skill", current);

    el.title =
  game.i18n.format(
    "SDP.XPCost",
    { cost }
  );

  });

  root.querySelectorAll('[data-action="advanceTalent"]').forEach(el => {

    const item =
      sheet.document.items.get(
        el.dataset.itemId
      );

    const current =
      item.system.advances || 0;

    const cost =
      getTalentCost(current);

  el.title =
  game.i18n.format(
    "SDP.XPCost",
    { cost }
  );

  });

}

function registerRest(sheet, root) {

  root.querySelectorAll('[data-action="shortRest"]').forEach(el => {

    el.addEventListener("click", async () => {

      await sheet._doRest("short");

    });

  });

  root.querySelectorAll('[data-action="longRest"]').forEach(el => {

    el.addEventListener("click", async () => {

      await sheet._doRest("long");

    });

  });

}

function registerContainers(sheet, root) {

  root.querySelectorAll(".container-header-row").forEach(el => {

    el.addEventListener("dragover", e => e.preventDefault());

    el.addEventListener("drop", async (event) => {

      event.preventDefault();

      const data =
        foundry.applications.ux.TextEditor
          .getDragEventData(event);

      if (!data.uuid) return;

      const item = await fromUuid(data.uuid);

      if (!item) return;

      const actor = sheet.document;

      let actorItem =
        actor.items.get(item.id);

      if (actorItem) {

        await actorItem.update({
          "system.containerId":
            el.dataset.containerId
        });

        return;
      }

      await actor.createEmbeddedDocuments("Item", [{
        ...item.toObject(),
        system: {
          ...item.system,
          containerId:
            el.dataset.containerId
        }
      }]);

    });

  });

  root.querySelectorAll('[data-action="removeFromContainer"]').forEach(el => {

    el.addEventListener("click", async (event) => {

      const item =
        sheet.document.items.get(
          event.currentTarget.dataset.itemId
        );

      await item.update({
        "system.containerId": null
      });

    });

  });

  root.querySelectorAll('[data-action="toggleContainer"]').forEach(el => {

    el.addEventListener("click", (event) => {

      const button =
        event.currentTarget;

      const row =
        button.closest("tr");

      const contentRow =
        row.nextElementSibling;

      if (!contentRow) return;

      const containerId =
        row.dataset.containerId;

      const isOpen =
        sheet.openContainers.has(containerId);

      if (isOpen) {

        sheet.openContainers.delete(containerId);

        contentRow.style.display = "none";

        button.textContent = "▶";

      }

      else {

        sheet.openContainers.add(containerId);

        contentRow.style.display = "table-row";

        button.textContent = "▼";

      }

    });

  });

}

function registerDragAndDrop(sheet, root) {

  root.querySelectorAll('[data-item-id]').forEach(el => {

    el.setAttribute("draggable", true);

    el.addEventListener("mousedown", (event) => {

      if (
        event.target.closest(
          "input, textarea, select, option, button, label, .condition-clickable"
        )
      ) {

        el.setAttribute("draggable", false);

      }

      else {

        el.setAttribute("draggable", true);

      }

    });

    el.addEventListener("mouseup", () => {

      el.setAttribute("draggable", true);

    });

    el.addEventListener("dragstart", (event) => {

      if (
        event.target.closest(
          "input, textarea, select, option, button, label, .qty-clickable, .condition-clickable"
        )
      ) {

        event.preventDefault();

        return;
      }

      const itemId =
        el.dataset.itemId;

      const item =
        sheet.document.items.get(itemId);

      if (!item) return;

      if (
        item.type === "weapon" &&
        item.system.equipped
      ) {

        event.preventDefault();
        return;

      }

      if (
        item.type === "armor" &&
        item.system.worn?.value
      ) {

        event.preventDefault();
        return;

      }

      if (
        item.type === "clothing" &&
        item.system.equipped
      ) {

        event.preventDefault();
        return;

      }

      event.dataTransfer.setData(
        "text/plain",
        JSON.stringify({
          type: "Item",
          uuid: item.uuid
        })
      );

    });

  });

}

function registerSpellCasting(sheet, root) {

  root.querySelectorAll('[data-action="rollSpell"]').forEach(el => {

    el.addEventListener("click", (event) => {

      const spell =
        sheet.document.items.get(
          event.currentTarget.dataset.itemId
        );

      if (!spell) return;

      sheet._castSpell({
        preventDefault: () => {},

        currentTarget: {
          dataset: {
            itemId: spell.id
          }
        }

      });

    });

  });

}

function registerAbilityUse(sheet, root) {

  const toggleAbilityDetails = (itemId) => {

    const details = root.querySelector(
      `.spell-details[data-details="${itemId}"]`
    );

    if (!details) return;

    const isHidden =
      details.style.display === "none";

    details.style.display =
      isHidden ? "table-row" : "none";

  };

  root.querySelectorAll('[data-action="toggleAbilityDetails"]').forEach(el => {

    el.addEventListener("click", (event) => {

      event.preventDefault();
      toggleAbilityDetails(
        event.currentTarget.dataset.itemId
      );

    });

  });

  root.querySelectorAll('[data-action="useAbility"]').forEach(el => {

    el.addEventListener("click", async (event) => {

      event.preventDefault();

      const ability =
        sheet.document.items.get(
          event.currentTarget.dataset.itemId
        );

      if (!ability) return;

      if (ability.system?.passive) {
        toggleAbilityDetails(ability.id);
        return;
      }

      await SdpAbility.use(
        sheet.actor,
        ability
      );

    });

    el.addEventListener("contextmenu", (event) => {

      event.preventDefault();

      toggleAbilityDetails(
        event.currentTarget.dataset.itemId
      );

    });

  });

}

function registerWork(sheet, root) {

  root.querySelectorAll('[data-action="workCareer"]').forEach(el => {

    el.addEventListener("click", async () => {

      await SdpWorkEngine.work(
        sheet.actor
      );

    });

  });

}

function registerTraitDialogs(root) {

  root.querySelectorAll(".trait-clickable").forEach(el => {

    el.addEventListener("click", async (event) => {

      event.preventDefault();
      event.stopPropagation();

      const trait =
        el.dataset.trait || "";

      const description =
        el.dataset.description ||
        game.i18n.localize("SDP.NoDescription");

      new SimpleDialog({

        title: trait,

        content: `
          <div class="trait-dialog">

            <h2>${trait}</h2>

            <div class="trait-description">
              ${description.replace(/\n/g, "<br>")}
            </div>

          </div>
        `,

        buttons: {
          close: {
            label:
              game.i18n.localize("SDP.Close")
          }
        }

      }).render(true);

    });

  });

}