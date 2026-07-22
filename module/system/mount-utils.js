/**
 * Mount foundation: rider ↔ scene mount token link.
 *
 * Rider flags.sdp.mount = { active, tokenUuid, actorUuid }
 * Mount flags.sdp.riddenBy = { tokenUuid, actorUuid }
 */

import { SdpConditionEngine } from "./condition-engine.js";

const MOUNT_STATUS_ID = "sdpMounted";

export class SdpMount {

  static get STATUS_ID() {
    return MOUNT_STATUS_ID;
  }

  static register() {
    this._registerStatusEffect();
    this._registerHooks();
    game.sdp = game.sdp || {};
    game.sdp.mount = this;
  }

  static _registerStatusEffect() {
    const exists = CONFIG.statusEffects.some(
      (effect) => effect.id === MOUNT_STATUS_ID
    );
    if (exists) return;

    CONFIG.statusEffects.push({
      id: MOUNT_STATUS_ID,
      name: "SDP.MountMounted",
      img: "icons/svg/upgrade.svg",
      statuses: [MOUNT_STATUS_ID]
    });
  }

  static _registerHooks() {
    Hooks.on("renderTokenHUD", (hud, html) => {
      this._onRenderTokenHUD(hud, html);
    });

    Hooks.on("deleteToken", async (tokenDoc) => {
      await this._onDeleteToken(tokenDoc);
    });
  }

  static _root(html) {
    if (!html) return null;
    if (html instanceof HTMLElement) return html;
    if (html?.[0] instanceof HTMLElement) return html[0];
    return null;
  }

  static canParticipate(actor) {
    if (!actor) return false;
    return actor.type !== "vehicle";
  }

  static getMountData(actor) {
    return actor?.flags?.sdp?.mount ?? null;
  }

  static getRiddenByData(actor) {
    return actor?.flags?.sdp?.riddenBy ?? null;
  }

  static isMounted(actor) {
    return Boolean(this.getMountData(actor)?.active);
  }

  static getItemKey(item) {
    if (!item) return "";
    const systemKey =
      typeof item.system?.key === "string"
        ? item.system.key.trim()
        : "";
    const flagKey =
      typeof item.flags?.sdp?.key === "string"
        ? item.flags.sdp.key.trim()
        : "";
    return (systemKey || flagKey).toLowerCase();
  }

  /**
   * Base mounted evasion penalty: -2 derived steps.
   * Reduced by system.custom.mountedEvasionPenaltyReduction (talent AE × advances).
   */
  static getMountedEvasionPenalty(actor) {
    if (!this.isMounted(actor)) return 0;

    const reduction = Number(
      actor?.system?.custom?.mountedEvasionPenaltyReduction || 0
    );

    return Math.min(0, -2 + reduction);
  }

  static getWeaponGroup(weapon) {
    return String(weapon?.system?.weaponGroup || "")
      .trim()
      .toLowerCase();
  }

  static normalizeTraitKey(trait) {
    if (!trait) return "";
    const raw = typeof trait === "string" ? trait : (trait.key || "");
    return String(raw)
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .toLowerCase()
      .replace(/[\s_]/g, "-");
  }

  static hasAntiLargeTrait(weapon) {
    const traits = weapon?.system?.traits || [];
    return traits.some((t) => {
      const key = this.normalizeTraitKey(t);
      return key === "anti-large" || key === "antilarge";
    });
  }

  static isCavalryWeapon(weapon) {
    return this.getWeaponGroup(weapon) === "cavalry";
  }

  /** Foot charge +1, mounted charge -1. Talent bonuses stay on their own AE keys. */
  static getChargeHitBonus(actor, isCharge) {
    if (!isCharge) return 0;
    return this.isMounted(actor) ? -1 : 1;
  }

  static async getMountToken(actor) {
    const data = this.getMountData(actor);
    if (!data?.active || !data.tokenUuid) return null;

    try {
      return await fromUuid(data.tokenUuid);
    } catch (error) {
      console.warn("SDP | Mount token UUID unresolved", data.tokenUuid, error);
      return null;
    }
  }

  static async getMountActor(actor) {
    const data = this.getMountData(actor);
    if (!data?.active || !data.actorUuid) return null;

    try {
      return await fromUuid(data.actorUuid);
    } catch (error) {
      console.warn("SDP | Mount actor UUID unresolved", data.actorUuid, error);
      return null;
    }
  }

  static _pickRiderAndMount(hudToken, controlled) {
    const tokens = controlled.filter((token) =>
      this.canParticipate(token.actor)
    );

    if (tokens.length !== 2) return null;

    const other = tokens.find((token) => token.id !== hudToken.id);
    if (!other) return null;

    const hudActor = hudToken.actor;
    const otherActor = other.actor;
    if (!hudActor || !otherActor) return null;

    const hudIsCreature = hudActor.type === "creature";
    const otherIsCreature = otherActor.type === "creature";

    if (otherIsCreature && !hudIsCreature) {
      return { riderToken: hudToken, mountToken: other };
    }
    if (hudIsCreature && !otherIsCreature) {
      return { riderToken: other, mountToken: hudToken };
    }

    return { riderToken: hudToken, mountToken: other };
  }

  static async mount(riderToken, mountToken) {
    const riderActor = riderToken?.actor;
    const mountActor = mountToken?.actor;

    if (!riderActor || !mountActor) {
      ui.notifications.warn(game.i18n.localize("SDP.Mount.NeedActors"));
      return false;
    }

    if (riderToken.id === mountToken.id) {
      ui.notifications.warn(game.i18n.localize("SDP.Mount.SameToken"));
      return false;
    }

    if (!this.canParticipate(riderActor) || !this.canParticipate(mountActor)) {
      ui.notifications.warn(game.i18n.localize("SDP.Mount.InvalidType"));
      return false;
    }

    if (this.isMounted(riderActor)) {
      ui.notifications.warn(game.i18n.localize("SDP.Mount.AlreadyMounted"));
      return false;
    }

    if (this.isMounted(mountActor)) {
      ui.notifications.warn(game.i18n.localize("SDP.Mount.MountIsRiding"));
      return false;
    }

    if (this.getRiddenByData(mountActor)?.tokenUuid) {
      ui.notifications.warn(game.i18n.localize("SDP.Mount.AlreadyRidden"));
      return false;
    }

    if (this.getRiddenByData(riderActor)?.tokenUuid) {
      ui.notifications.warn(game.i18n.localize("SDP.Mount.RiderIsMount"));
      return false;
    }

    await riderActor.update({
      "flags.sdp.mount": {
        active: true,
        tokenUuid: mountToken.document.uuid,
        actorUuid: mountActor.uuid
      }
    });

    await mountActor.update({
      "flags.sdp.riddenBy": {
        tokenUuid: riderToken.document.uuid,
        actorUuid: riderActor.uuid
      }
    });

    await this._setMountedStatus(riderActor, true);

    ui.notifications.info(
      game.i18n.format("SDP.Mount.Mounted", {
        rider: riderActor.name,
        mount: mountActor.name
      })
    );

    return true;
  }

  static async dismount(riderActor) {
    if (!riderActor || !this.isMounted(riderActor)) {
      ui.notifications.warn(game.i18n.localize("SDP.Mount.NotMounted"));
      return false;
    }

    const mountData = this.getMountData(riderActor);
    let mountActor = null;

    if (mountData?.actorUuid) {
      try {
        mountActor = await fromUuid(mountData.actorUuid);
      } catch (error) {
        console.warn("SDP | Dismount mount actor missing", error);
      }
    }

    await riderActor.update({
      "flags.sdp.mount": {
        active: false,
        tokenUuid: null,
        actorUuid: null
      }
    });

    if (mountActor) {
      await mountActor.update({
        "flags.sdp.riddenBy": {
          tokenUuid: null,
          actorUuid: null
        }
      });
    }

    await this._setMountedStatus(riderActor, false);

    ui.notifications.info(
      game.i18n.format("SDP.Mount.Dismounted", {
        rider: riderActor.name,
        mount: mountActor?.name || game.i18n.localize("SDP.Mount.UnknownMount")
      })
    );

    return true;
  }

  /**
   * Counter-charge vs a mounted rider: dismount + prone on rider and mount.
   */
  static async knockDownMounted(riderActor) {
    if (!riderActor || !this.isMounted(riderActor)) return false;

    const mountActor = await this.getMountActor(riderActor);
    await this.dismount(riderActor);

    await SdpConditionEngine.add(riderActor, "prone");
    if (mountActor) {
      await SdpConditionEngine.add(mountActor, "prone");
    }

    ChatMessage.create({
      content: `<p><strong>${game.i18n.format("SDP.Mount.KnockedDown", {
        rider: riderActor.name,
        mount: mountActor?.name || game.i18n.localize("SDP.Mount.UnknownMount")
      })}</strong></p>`
    });

    return true;
  }

  static async _setMountedStatus(actor, active) {
    if (!actor?.toggleStatusEffect) return;

    try {
      await actor.toggleStatusEffect(MOUNT_STATUS_ID, { active });
    } catch (error) {
      console.warn("SDP | Mount status effect failed", error);
    }
  }

  static _onRenderTokenHUD(hud, html) {
    const root = this._root(html);
    if (!root) return;

    const token = hud.object;
    const actor = token?.actor;
    if (!actor || !this.canParticipate(actor)) return;

    const column =
      root.querySelector(".col.right")
      || root.querySelector(".right")
      || root;

    const controlled = canvas.tokens.controlled;
    const pair = this._pickRiderAndMount(token, controlled);
    const mounted = this.isMounted(actor);

    if (mounted) {
      const button = this._createHudButton({
        action: "sdp-dismount",
        title: game.i18n.localize("SDP.Mount.Dismount"),
        icon: "fas fa-person-walking",
        active: true
      });
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await this.dismount(actor);
        hud.render();
      });
      column.appendChild(button);
      return;
    }

    if (!pair) return;

    const button = this._createHudButton({
      action: "sdp-mount",
      title: game.i18n.localize("SDP.Mount.Mount"),
      icon: "fas fa-horse"
    });
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await this.mount(pair.riderToken, pair.mountToken);
      hud.render();
    });
    column.appendChild(button);
  }

  static _createHudButton({ action, title, icon, active = false }) {
    const button = document.createElement("div");
    button.classList.add("control-icon");
    if (active) button.classList.add("active");
    button.dataset.action = action;
    button.title = title;
    button.innerHTML = `<i class="${icon}"></i>`;
    return button;
  }

  static async _onDeleteToken(tokenDoc) {
    const actor = tokenDoc.actor;
    if (!actor) return;

    const riddenBy = this.getRiddenByData(actor);
    if (riddenBy?.actorUuid) {
      try {
        const rider = await fromUuid(riddenBy.actorUuid);
        if (rider && this.isMounted(rider)) {
          await this.dismount(rider);
        }
      } catch (error) {
        console.warn("SDP | Cleanup rider on mount delete failed", error);
      }
    }

    const mountData = this.getMountData(actor);
    if (mountData?.active && mountData.actorUuid) {
      try {
        const mount = await fromUuid(mountData.actorUuid);
        if (mount) {
          await mount.update({
            "flags.sdp.riddenBy": {
              tokenUuid: null,
              actorUuid: null
            }
          });
        }
      } catch (error) {
        console.warn("SDP | Cleanup mount on rider delete failed", error);
      }
    }
  }

}
