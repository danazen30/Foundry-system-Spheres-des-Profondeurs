import { SDP } from "../system/config.js";

export function getCost(type, value) {

  const table = {
    attribute: [
      [5, 25],[10,30],[15,40],[20,50],[25,100],[30,150],
      [35,200],[40,250],[45,300],[50,350],[55,400],
      [60,450],[65,550],[70,600],[999,650]
    ],

    skill: [
      [5,10],[10,15],[15,20],[20,30],[25,60],[30,90],
      [35,120],[40,150],[45,180],[50,210],[55,240],
      [60,270],[65,300],[70,330],[999,360]
    ]
  };

  const ranges = table[type];

  for (let [max, cost] of ranges) {
    if ((value + 1) <= max) return cost;
  }

  return 0;
}

export function getTalentCost(current) {
  return (current + 1) * 100;
}

export function getTalentMax(actor, item) {

  const max = item.system.max;

  // attribut
  if (actor.system.attributes[max]) {
    return actor.system.attributes[max].bonus;
  }

  // nombre
  return Number(max) || 0;
}

export function getItemLayer(item) {

  if (item.system.layer !== undefined) {
    return item.system.layer;
  }

  switch (item.type) {

    case "clothing":
      return 0;

    case "armor":
      return 1;

    default:
      return 0;
  }
}

export function applyFinalWeight(items, field = "encumbrance") {

  for (let i of items) {

    const qty = i.system.quantity?.value ?? 1;
    const base = i.system[field]?.value ?? 0;

    i.system.totalWeight =
  Math.round((base * qty) * 100) / 100;
  }
}

// =========================
// PREPARE CONTEXT HELPERS
// =========================

export function getAttributes(actor) {

  return SDP.ATTRIBUTE_ORDER.map(key => {
    return {
      key,
      ...actor.system.attributes[key]
    };
  });

}

export function getXPData(actor) {

  const xp = actor.system.details?.experience ?? {};

  return {
    total: xp.total ?? 0,
    spent: xp.spent ?? 0,
    available: (xp.total ?? 0) - (xp.spent ?? 0),
    log: Array.isArray(xp.log) ? xp.log : []
  };

}

export function getSkillMap(actor) {

  return Object.fromEntries(
    actor.items
      .filter(i => i.type === "skill")
      .map(i => [i.name, i.system])
  );

}

export function getCurrentCareer(actor) {

  return actor.items.find(
    i => i.type === "career" && i.system.current
  );

}

export function getXPBar(actor, xpData) {

  const xpTotal = xpData.total;
  const currentLevel = actor.system.details?.level ?? 0;

  const nextXP = game.sdp.level.getNextLevelXP(currentLevel);

  const currentLevelXP =
    game.sdp.level.LEVELS.find(
      l => l.level === currentLevel
    )?.xp ?? 0;

  let xpProgress = 0;

  if (nextXP !== null) {

    xpProgress = Math.min(
      100,
      Math.floor(
        ((xpTotal - currentLevelXP) /
        (nextXP - currentLevelXP)) * 100
      )
    );

  }

  return {
    value: xpTotal,
    currentLevel,
    nextXP,
    percent: xpProgress
  };

}

export function getSpellsByType(actor) {

  const spells = actor.items.filter(
    i => i.type === "spell"
  );

  return {
    spellsMinor: spells.filter(
      s => (s.system.magicType?.value || "minor") === "minor"
    ),

    spellsAdvanced: spells.filter(
      s => (s.system.magicType?.value || "minor") === "advanced"
    ),

    spellsSuperior: spells.filter(
      s => (s.system.magicType?.value || "minor") === "superior"
    )
  };

}

export function getWeapons(actor) {

  const weapons = actor.items.filter(i =>
    i.type === "weapon" &&
    !i.system.containerId
  );

  return {
    weapons,

    meleeWeapons: weapons.filter(
      w => w.system.category === "melee"
    ),

    rangedWeapons: weapons.filter(
      w => w.system.category === "ranged"
    )
  };

}

function registerTalentRows(sheet, root) {

  root.querySelectorAll(".talent-row").forEach(row => {

    row.addEventListener("click", (event) => {

      if (event.target.closest("button, input")) return;

      const itemId = row.dataset.itemId;

      const details = root.querySelector(
        `.talent-description[data-details="${itemId}"]`
      );

      if (!details) return;

      const isHidden = details.style.display === "none";

      details.style.display = isHidden
        ? "table-row"
        : "none";

    });

    row.addEventListener("contextmenu", (event) => {

      event.preventDefault();

      const item = sheet.document.items.get(row.dataset.itemId);

      if (!item) return;

      item.sheet.render(true);

    });

  });

}

function registerSpellRows(sheet, root) {

  root.querySelectorAll('[data-action="rollSpell"]').forEach(el => {

    el.addEventListener("click", (event) => {

      const spell = sheet.document.items.get(
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

    el.addEventListener("contextmenu", (event) => {

      event.preventDefault();

      const itemId = event.currentTarget.dataset.itemId;

      const details = root.querySelector(
        `.spell-details[data-details="${itemId}"]`
      );

      if (!details) return;

      const isHidden =
        details.style.display === "none";

      details.style.display =
        isHidden ? "table-row" : "none";

    });

  });

}

export function registerArmorRows(root) {

  root.querySelectorAll(".armor-toggle").forEach(el => {

    el.addEventListener("contextmenu", (event) => {

      event.preventDefault();

      const itemId =
        event.currentTarget.dataset.itemId;

      const details = root.querySelector(
        `.armor-details[data-details="${itemId}"]`
      );

      if (!details) return;

      const isHidden =
        details.style.display === "none";

      details.style.display =
        isHidden ? "table-row" : "none";

    });

  });

}

function registerQuantityControls(sheet, root) {

  root.querySelectorAll(".qty-clickable").forEach(el => {

    el.addEventListener("contextmenu", async (event) => {

      event.preventDefault();

      const item = sheet.document.items.get(
        el.dataset.itemId
      );

      if (!item) return;

      const current =
        item.system.quantity?.value ?? 0;

      if (current <= 0) return;

      await item.update({
        "system.quantity.value": current - 1
      });

    });

    el.addEventListener("click", async (event) => {

      if (
        event.target.closest(
          "input, select, button"
        )
      ) return;

      const item = sheet.document.items.get(
        el.dataset.itemId
      );

      if (!item) return;

      const current = Number(
        item.system.quantity?.value ?? 0
      );

      await item.update({
        "system.quantity.value": current + 1
      });

    });

  });

}

function restoreContainerState(sheet, root) {

  sheet.openContainers.forEach(containerId => {

    const contentRow = root.querySelector(
      `.container-content-row[data-container="${containerId}"]`
    );

    const headerRow = root.querySelector(
      `.container-header-row[data-container-id="${containerId}"]`
    );

    if (contentRow) {
      contentRow.style.display = "table-row";
    }

    if (headerRow) {

      const btn =
        headerRow.querySelector(".container-toggle");

      if (btn) btn.textContent = "▼";

    }

  });

}

function registerTraitDialogs(root) {

  root.addEventListener("click", (event) => {

    const el = event.target.closest(".trait-clickable");

    if (!el) return;

    const label = el.dataset.trait;
    const desc = el.dataset.description;

    new SimpleDialog({
      title: label,
      content: `
        <div class="trait-dialog">
          <p>${desc}</p>
        </div>
      `,
      buttons: {
        ok: {
          label: "OK"
        }
      }
    }).render(true);

  });

}

function registerCurrencyControls(sheet, root) {

  root.querySelectorAll(".currency-click").forEach(el => {

    el.addEventListener("click", async () => {

      const type = el.dataset.type;

      const current =
        sheet.document.system.currency?.[type] ?? 0;

      await sheet.document.update({
        [`system.currency.value.${type}`]:
          current + 1
      });

    });

    el.addEventListener("contextmenu", async (event) => {

      event.preventDefault();

      const type = el.dataset.type;

      const current =
        sheet.document.system.currency?.[type] ?? 0;

      if (current <= 0) return;

      await sheet.document.update({
        [`system.currency.value.${type}`]:
          current - 1
      });

    });

  });

}

function registerConditionDetails(root) {

  root.querySelectorAll(".condition-header").forEach(el => {

    el.addEventListener("contextmenu", (event) => {

      event.preventDefault();

      const key = el.dataset.key;
      const description = el.dataset.description;

      const table = el.closest("table");

      const detailsRow =
        table.querySelector(".condition-details-row");

      const content =
        table.querySelector(".condition-details-content");

      if (!detailsRow || !content) return;

      const isOpen =
        detailsRow.style.display === "table-row";

      if (isOpen && content.dataset.key === key) {

        detailsRow.style.display = "none";

        return;
      }

      content.innerHTML =
        `<strong>${key}</strong><br>${description}`;

      content.dataset.key = key;

      detailsRow.style.display = "table-row";

    });

  });

}

