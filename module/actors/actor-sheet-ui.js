import { SimpleDialog } from "../apps/simple-dialog.js";
import { SdpConditionEngine } from "../system/condition-engine.js";
import {
  isToggleableTrait,
  traitExhaustsOnDeactivate
} from "../system/creature-trait-utils.js";
import { registerArmorRows, registerTalentRows, registerConditionDetails} from "./actor-sheet-utils.js";

export function registerUIListeners(sheet, root) {

registerTabs(sheet, root);

registerPortrait(sheet, root);

registerConditionInputs(sheet, root);

registerConditionStates(sheet, root);

registerQuantityControls(sheet, root);

registerArmorRows(root);

registerTalentRows(sheet, root);

registerEditorToggles(root);

setupRichTextEditors(root);

setupTextareaResize(root);

registerConditionDetails(root);

}

function registerTabs(sheet, root) {

  root.querySelectorAll("[data-tab]").forEach(btn => {

    if (btn.dataset.tab === sheet.activeTab) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }

    btn.addEventListener("click", () => {
      sheet.activeTab = btn.dataset.tab;
      sheet.render();
    });

  });

}

function registerPortrait(sheet, root) {

  root.querySelector(".character-portrait img")
    ?.addEventListener("click", async () => {

      const fp = new foundry.applications.apps.FilePicker.implementation({
    type: "image",
    current: sheet.document.img,

    callback: async (path) => {
      await sheet.document.update({ img: path });
    }
  });

fp.render(true);

    });

}

export function restoreScroll(sheet) {

  const rootEl = sheet.element;

  if (!rootEl) return;

  const tryRestoreScroll = () => {

    if (!rootEl.isConnected) return;

    const el =
      rootEl.querySelector(".sdp-content-inner");

    if (!el) return;

    if (el.scrollHeight <= el.clientHeight) {

      requestAnimationFrame(tryRestoreScroll);

      return;
    }

    console.log(
      "RESTORE BEFORE",
      el.scrollTop,
      "TARGET",
      sheet._scrollPositions.main
    );

    el.scrollTop =
      sheet._scrollPositions.main || 0;

    console.log(
      "RESTORE AFTER",
      el.scrollTop
    );

    requestAnimationFrame(() => {

      console.log(
        "NEXT FRAME",
        el.scrollTop,
        document.activeElement
      );

    });

  };

  requestAnimationFrame(tryRestoreScroll);

}

function registerConditionInputs(sheet, root) {

  root.querySelectorAll(".condition-clickable").forEach(el => {

    // =========================
    // MANUAL INPUT
    // =========================

    el.addEventListener("change", async (event) => {

      const input = event.currentTarget;

      const key = input.dataset.key;

      const value =
        Math.max(0, Number(input.value) || 0);

      const actor = sheet.document;

      await actor.update({
        [`system.conditions.${key}`]: value
      });

    });

// =========================
// LEFT CLICK = +1
// =========================

el.addEventListener("mousedown", async (event) => {

  // uniquement clic gauche
  if (event.button !== 0) return;

  event.preventDefault();
  event.stopPropagation();

  const input = event.currentTarget;

  const current =
    Number(input.value || 0);

  const value = current + 1;

  // update visuel immédiat
  input.value = value;

  const key = input.dataset.key;

  await SdpConditionEngine.add(
    sheet.document,
    key,
    1
  );

});

    // =========================
    // RIGHT CLICK = -1
    // =========================

   el.addEventListener("contextmenu", async (event) => {

  event.preventDefault();
  event.stopPropagation();

  const input = event.currentTarget;

  const current =
    Number(input.value || 0);

  const value =
    Math.max(0, current - 1);

  if (current <= 0) {
    return;
  }

  // update visuel immédiat
  input.value = value;

  const key = input.dataset.key;

  await SdpConditionEngine.remove(
    sheet.document,
    key,
    1
  );

});

  });

}

function registerConditionStates(sheet, root) {

  root.querySelectorAll(
    '[data-action="updateConditionState"]'
  ).forEach(el => {

    el.addEventListener("change", async (event) => {

      const input = event.currentTarget;

      const key = input.dataset.key;

      const checked = input.checked;

      const actor = sheet.document;

      const previous =
        actor.system.conditions?.[key];

      await actor.update({
        [`system.conditions.${key}`]: checked
      });

      // =========================
      // FRIGHTENED / SHAKEN
      // =========================

      if (key === "frightened") {

        await actor.update({
          "system.conditions.shaken":
            !checked
        });

      }

      // =========================
      // SHAKEN → EXHAUSTED
      // =========================

      if (
        key === "shaken" &&
        previous === true &&
        checked === false
      ) {

        await SdpConditionEngine.add(
          actor,
          "exhausted",
          1
        );

      }

      // =========================
      // UNCONSCIOUS → PRONE
      // =========================

      if (
        key === "unconscious" &&
        checked
      ) {

        await actor.update({
          "system.conditions.prone": true
        });

      }

      // =========================
      // DYING → UNCONSCIOUS
      // =========================

      if (
        key === "dying" &&
        checked
      ) {

        await actor.update({
          "system.conditions.unconscious": true,
          "system.conditions.prone": true
        });

      }

    });

  });

}

export function registerItemListeners(sheet, root) {

  registerEditItem(sheet, root);

  registerDeleteItem(sheet, root);

  registerArmorToggle(sheet, root);

  registerClothingToggle(sheet, root);

  registerQuantityInputs(sheet, root);

  registerBooleanToggles(sheet, root);

  registerTraitActiveToggle(sheet, root);

}

function registerEditItem(sheet, root) {

  root.querySelectorAll('[data-action="editItem"]').forEach(el => {

    el.addEventListener("click", (event) => {

      const item =
        sheet.document.items.get(
          event.currentTarget.dataset.itemId
        );

      if (!item) return;

      item.sheet.render(true);

    });

  });

}

function registerDeleteItem(sheet, root) {

  root.querySelectorAll('[data-action="deleteItem"]').forEach(el => {

    el.addEventListener("click", async (event) => {

      const item =
        sheet.document.items.get(
          event.currentTarget.dataset.itemId
        );

      if (!item) return;

      new SimpleDialog({
        title:
  game.i18n.localize(
    "SDP.Dialog.DeleteItemTitle"
  ),

        content: `
  <div class="confirm-delete">
    <p>
      ${game.i18n.localize(
        "SDP.Dialog.DeleteItemConfirm"
      )}
    </p>

    <p><strong>${item.name}</strong> ?</p>
  </div>
`,

        buttons: {

          confirm: {
            label:
  game.i18n.localize(
    "SDP.Delete"
  ),

            callback: async () => {
              await item.delete();
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

}

function registerArmorToggle(sheet, root) {

  root.querySelectorAll('[data-action="toggleArmor"]').forEach(el => {

    el.addEventListener("click", async (event) => {

      const item =
        sheet.document.items.get(
          event.currentTarget.dataset.itemId
        );

      if (!item) {
        console.error("ARMOR TOGGLE ERROR: item not found");
        return;
      }

      const current =
        item.system?.worn?.value ?? false;

      await item.update({
        "system.worn.value": !current
      });

    });

  });

}

function registerClothingToggle(sheet, root) {

  root.querySelectorAll('[data-action="toggleClothing"]').forEach(el => {

    el.addEventListener("click", async (event) => {

      const item =
        sheet.document.items.get(
          event.currentTarget.dataset.itemId
        );

      if (!item) return;

      const current =
        item.system?.equipped ?? false;

      await item.update({
        "system.equipped": !current
      });

    });

  });

}

function registerQuantityInputs(sheet, root) {

  // =========================
  // AMMO
  // =========================

  root.querySelectorAll('[data-action="updateAmmoQty"]').forEach(el => {

    el.addEventListener("change", async (event) => {

      const input = event.currentTarget;

      const item =
        sheet.document.items.get(
          input.dataset.itemId
        );

      if (!item) return;

      const value =
        Math.max(0, Number(input.value) || 0);

      console.log("SDP | Ammo qty update", {
        item: item.name,
        value
      });

      await item.update({
        "system.quantity.value": value
      });

    });

  });

  // =========================
  // ITEMS
  // =========================

  root.querySelectorAll('[data-action="updateItemQty"]').forEach(el => {

    el.addEventListener("change", async (event) => {

      const input = event.currentTarget;

      const item =
        sheet.document.items.get(
          input.dataset.itemId
        );

      if (!item) return;

      const value =
        Math.max(0, Number(input.value) || 0);

      console.log("SDP | Item qty update", {
        item: item.name,
        value
      });

      await item.update({
        "system.quantity.value": value
      });

    });

  });

}

function registerQuantityControls(sheet, root) {

  root.querySelectorAll(".qty-clickable").forEach(el => {

    // =========================
    // RIGHT CLICK = -1
    // =========================

    el.addEventListener("contextmenu", async (event) => {

      event.preventDefault();
      event.stopPropagation();

      const item =
        sheet.document.items.get(
          el.dataset.itemId
        );

      if (!item) return;

      const current =
        item.system.quantity?.value ?? 0;

      if (current <= 0) return;

      await item.update({
        "system.quantity.value":
          current - 1
      });

    });

    // =========================
    // LEFT CLICK = +1
    // =========================

    el.addEventListener("click", async (event) => {

      if (
        event.target.closest(
          "input, select, button"
        )
      ) return;

      event.preventDefault();
      event.stopPropagation();

      const item =
        sheet.document.items.get(
          el.dataset.itemId
        );

      if (!item) return;

      const current =
        Number(
          item.system.quantity?.value ?? 0
        );

      await item.update({
        "system.quantity.value":
          current + 1
      });

    });

  });

}

function registerBooleanToggles(sheet, root) {

  root.querySelectorAll('[data-action="toggleBoolean"]').forEach(el => {

    el.addEventListener("change", async (event) => {

      const checkbox = event.currentTarget;

      const item =
        sheet.document.items.get(
          checkbox.dataset.itemId
        );

      if (!item) return;

      const path = checkbox.dataset.path;

      const checked = checkbox.checked;

      await item.update({
        [path]: checked
      });

      console.log("SDP | TOGGLE BOOLEAN", {
        item: item.name,
        path,
        value: checked
      });

    });

  });

}

function registerTraitActiveToggle(sheet, root) {

  root.querySelectorAll('[data-action="toggleTraitActive"]').forEach(el => {

    el.addEventListener("click", async (event) => {

      event.preventDefault();
      event.stopPropagation();

      const item = sheet.document.items.get(
        event.currentTarget.dataset.itemId
      );

      if (!item || !isToggleableTrait(item)) return;

      const wasActive = Boolean(item.system?.active);
      const nextActive = !wasActive;

      await item.update({
        "system.active": nextActive
      });

      // Instinct primal : à la désactivation → 1 Exténué
      if (
        wasActive
        && !nextActive
        && traitExhaustsOnDeactivate(item)
      ) {
        await SdpConditionEngine.add(
          sheet.document,
          "exhausted",
          1
        );
      }

    });

  });

}

export function registerEditorToggles(root) {

  root.querySelectorAll(
    '[data-action="toggleEditor"]'
  ).forEach(el => {

    el.addEventListener("click", (event) => {

      const target =
        event.currentTarget.dataset.target;

      const display = root.querySelector(
        `[data-display="${target}"]`
      );

      const editor = root.querySelector(
        `[data-editor="${target}"]`
      );

      if (!display || !editor) return;

      const isEditing =
        editor.style.display !== "none";

      if (isEditing) {

        editor.style.display = "none";
        display.style.display = "block";

        event.currentTarget.textContent =
          `✏️ ${
  game.i18n.localize(
    "SDP.Edit"
  )
}`;

      } else {

        editor.style.display = "block";
        display.style.display = "none";

        event.currentTarget.textContent =
          `✔ ${
  game.i18n.localize(
    "SDP.Close"
  )
}`;

      }

    });

  });

}

export function setupRichTextEditors(root) {

  requestAnimationFrame(() => {

    const editors =
      root.querySelectorAll('[contenteditable="true"]');

    editors.forEach(editor => {

      editor.addEventListener("keydown", (event) => {

        if (event.key === "Enter") {

          event.preventDefault();

          const selection = window.getSelection();

          if (!selection.rangeCount) return;

          const range = selection.getRangeAt(0);

          range.deleteContents();

          const br = document.createElement("br");
          const space =
            document.createTextNode("\u200B");

          range.insertNode(br);
          range.insertNode(space);

          range.setStartAfter(space);
          range.setEndAfter(space);

          selection.removeAllRanges();
          selection.addRange(range);

        }

        if (event.key === "Tab") {

          event.preventDefault();

          document.execCommand(
            "insertHTML",
            false,
            "&nbsp;&nbsp;&nbsp;&nbsp;"
          );

        }

        if (event.key === " ") {

          event.preventDefault();

          const selection = window.getSelection();

          if (!selection.rangeCount) return;

          const range = selection.getRangeAt(0);

          const node =
            document.createTextNode("\u00A0");

          range.insertNode(node);

          range.setStartAfter(node);
          range.setEndAfter(node);

          selection.removeAllRanges();
          selection.addRange(range);

        }

      });

    });

  });

}

export function setupTextareaResize(root) {

  root.querySelectorAll("textarea").forEach(el => {

    const resize = () => {

      el.style.height = "18px";

      el.style.height =
        el.scrollHeight + "px";

    };

    resize();

    el.addEventListener("input", resize);

  });

}

export function restoreItemScroll(sheet) {

  const root =
    sheet.getRoot?.() || sheet.element;

  if (!root) return;

  const el =
    root.querySelector(".sdp-item-sheet");

  if (!el) return;

  el.scrollTop =
    sheet._scrollPositions.main || 0;

}