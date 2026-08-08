import { resolveSdpFormula } from "../system/formula-utils.js";
import { rollHitLocation, getHitLocationProfile } from "./hit-location.js";
import { getTokenIdForActor } from "../system/actor-utils.js";

export class SdpAbility {

  static resolveFormula(value, actor) {
    return resolveSdpFormula(value, actor);
  }

  /**
   * Utilise une capacité innée : succès automatique, sans dialog ni surincantation.
   */
  static async use(actor, ability) {

    if (!actor || !ability) return;

    if (ability.system?.passive) {
      ui.notifications.warn(
        game.i18n.localize("SDP.Notifications.PassiveAbilityCannotUse")
      );
      return;
    }

    const system = ability.system ?? {};

    const power = Number(system.power?.value ?? 0) || 0;
    const manaCost = power;
    const currentMana =
      Number(actor.system.resources?.mana?.value ?? 0) || 0;

    if (manaCost > 0 && currentMana < manaCost) {
      ui.notifications.warn(
        game.i18n.localize("SDP.Notifications.NotEnoughMana")
          || game.i18n.localize("SDP.NotEnoughMana")
      );
      return;
    }

    if (manaCost > 0) {
      await actor.update({
        "system.resources.mana.value": currentMana - manaCost
      });
    }

    const hitProfileKey =
      actor.system.hitLocationProfile || "humanoid";

    const hitProfile =
      getHitLocationProfile(hitProfileKey);

    const hitLocation =
      await rollHitLocation(hitProfileKey);

    const baseDamage =
      system.damage?.base?.value ?? 0;
    const diceDamage =
      system.damage?.dice?.value ?? "";

    const hasDamage =
      (String(baseDamage ?? "").trim() !== "" && String(baseDamage).trim() !== "0") ||
      (typeof diceDamage === "string" && diceDamage.trim() !== "");

    const concentration =
      system.concentration?.value === true;

    const durationRaw = system.duration?.value ?? 0;
    const duration =
      SdpAbility.resolveFormula(durationRaw, actor);
    const durationType =
      system.duration?.type ?? "";

    const targets = system.target?.value ?? 0;
    const range =
      SdpAbility.resolveFormula(
        system.range?.value ?? 0,
        actor
      );
    const radius =
      SdpAbility.resolveFormula(
        system.radius?.value ?? 0,
        actor
      );
    const isAoE = system.aoe?.value === true;

    const tokenId = getTokenIdForActor(actor);

    let damageButton = "";

    if (hasDamage) {
      damageButton = `
    <button class="roll-damage"
      data-actor="${actor.id}"
      data-token="${tokenId}"
      data-weapon="${ability.id}"
      data-target="${Array.from(game.user.targets)[0]?.id || ""}">
      ${game.i18n.localize("SDP.RollDamage")}
    </button>
    `;
    }

    const description =
      typeof system.description === "string"
        ? system.description.trim()
        : "";

    const html = `
<div class="sdp-ability" data-sdp-safe="true"
     data-type="ability"
     data-actor="${actor.id}"
     data-token="${tokenId}"
     data-weapon="${ability.id}"
     data-location="${hitLocation.location}"
     data-location-profile="${hitProfileKey}"
     data-critical="false">

  <h3>
  ${actor.name}
  ${game.i18n.localize("SDP.UseAbility")}
  ${ability.name}
</h3>

  <p class="ability-result"><strong>${game.i18n.localize("SDP.Success")}</strong></p>

  ${manaCost > 0 ? `
  <p><strong>${game.i18n.localize("SDP.ManaCost")}:</strong> ${manaCost}</p>
  ` : ""}

  <p>
    <strong>${game.i18n.localize("SDP.HitLocation")}:</strong>
    ${game.i18n.localize(
      hitProfile.locations?.[hitLocation.location]?.label
    ) || hitLocation.location}
    (${hitLocation.roll.total})
  </p>

  ${concentration ? `<p><strong>${game.i18n.localize("SDP.Concentration")}</strong></p>` : ""}

  <hr>

  ${range > 0 || (typeof system.range?.value === "string" && String(system.range.value).trim()) ? `
  <p class="ability-range">
   <strong>${game.i18n.localize("SDP.Range")}:</strong>
   <span class="value">${range || system.range.value}</span>${Number(range) > 0 ? " m" : ""}
</p>` : ""}

${!concentration && (duration > 0 || String(durationRaw).trim()) ? `
<p class="ability-duration">
   <strong>${game.i18n.localize("SDP.Duration")}:</strong>
<span class="value">${duration || durationRaw}</span> ${durationType}
</p>
` : ""}

  ${isAoE
  ? (radius > 0 || String(system.radius?.value ?? "").trim() ? `
    <p class="ability-radius spell-radius"
   data-type="aoe"
   data-base="${radius}"
   data-value="${radius || system.radius.value}">
   <strong>${game.i18n.localize("SDP.Radius")}:</strong>
<span class="value">${radius || system.radius.value}</span>
<button class="place-aoe">📍</button>
</p>` : "")
  : (targets > 0 ? `
    <p class="ability-target-count">
       <strong>${game.i18n.localize("SDP.Targets")}:</strong>
<span class="value">${targets}</span>
    </p>` : "")
}

  ${description ? `
  <hr>
  <p class="ability-description">${description}</p>
  ` : ""}

  <hr>

  ${damageButton}

</div>
`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: html
    });

  }

}
