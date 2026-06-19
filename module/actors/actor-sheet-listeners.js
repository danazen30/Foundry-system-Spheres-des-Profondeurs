import { SdpRoll } from "../rolls/roll.js";
import { getActorItemDisplayName } from "../system/item-localization.js";

export function registerAttributeListeners(sheet) {

  const root = sheet.element;

  root.querySelectorAll('[data-action="rollAttribute"]').forEach(el => {

    el.addEventListener("click", (event) => {

      const attr = event.currentTarget.dataset.attr;
      const attrData = sheet.document.system.attributes[attr];

      SdpRoll.openDialog({
        actor: sheet.document,
        type: "attribute",
        label: attrData.name || attrData.label,
        target: attrData.value
      });

    });

  });

}

export function registerSkillListeners(sheet) {

  const root = sheet.element;

  root.querySelectorAll('[data-action="rollSkill"]').forEach(el => {

    el.addEventListener("click", (event) => {

      const skill = sheet.document.items.get(
        event.currentTarget.dataset.itemId
      );

      SdpRoll.openDialog({
        actor: sheet.document,
        type: "skill",
        label: getActorItemDisplayName(skill) || skill.name,
        item: skill,
        target: skill.system.value
      });

    });

  });

}